import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { resolveSiteUrl } from '@/lib/business'
import { sendAppointmentConfirmationEmail } from '@/lib/appointment-email'

// Webhook do Asaas para cobranças.
// Configuração: ASAAS_WEBHOOK_TOKEN (o mesmo token cadastrado no painel do Asaas).
//
// O Asaas entrega "at least once": o mesmo evento pode chegar mais de uma vez.
// A idempotência aqui vem do campo paidAt — só o primeiro evento de pagamento
// confirma o agendamento e dispara o e-mail.
//
// Regra de resposta: devolver 2xx sempre que a mensagem foi entendida (mesmo
// que ignorada). 15 respostas seguidas fora da faixa 2xx fazem o Asaas
// interromper a fila de entrega, então só devolvemos 500 em falha transitória
// de verdade, onde a reentrega é desejada.

const PAID_EVENTS = new Set(['PAYMENT_CONFIRMED', 'PAYMENT_RECEIVED'])

const CANCEL_EVENTS = new Set([
  'PAYMENT_OVERDUE',
  'PAYMENT_DELETED',
  'PAYMENT_REFUNDED',
  'PAYMENT_CHARGEBACK_REQUESTED',
  'PAYMENT_REVERSED',
])

type AsaasWebhookBody = {
  id?: string
  event?: string
  payment?: {
    id?: string
    externalReference?: string | null
    paymentLink?: string | null
    value?: number
    status?: string
    billingType?: string
  }
}

export async function POST(request: NextRequest) {
  const expectedToken = process.env.ASAAS_WEBHOOK_TOKEN

  if (!expectedToken) {
    // Sem token configurado não há como provar que a chamada veio do Asaas.
    console.error('[asaas-webhook] ASAAS_WEBHOOK_TOKEN não configurada — requisição recusada.')
    return NextResponse.json({ error: 'Webhook não configurado' }, { status: 503 })
  }

  const receivedToken = request.headers.get('asaas-access-token')
  if (receivedToken !== expectedToken) {
    console.warn('[asaas-webhook] Token inválido — requisição recusada.')
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
  }

  let body: AsaasWebhookBody
  try {
    body = (await request.json()) as AsaasWebhookBody
  } catch {
    // Corpo ilegível: reenviar não resolve.
    return NextResponse.json({ received: true, ignored: 'corpo inválido' }, { status: 200 })
  }

  const event = body.event || ''
  const payment = body.payment

  if (!payment) {
    return NextResponse.json({ received: true, ignored: 'sem objeto payment' }, { status: 200 })
  }

  const isPaid = PAID_EVENTS.has(event)
  const isCancelled = CANCEL_EVENTS.has(event)

  if (!isPaid && !isCancelled) {
    // PAYMENT_CREATED, análises de risco, splits etc. não mudam o agendamento.
    return NextResponse.json({ received: true, ignored: event }, { status: 200 })
  }

  try {
    // O link de pagamento é criado com externalReference = id do agendamento,
    // mas nem toda cobrança propaga esse campo. Por isso casamos também pelo
    // id do link, guardado no agendamento quando o checkout foi gerado.
    const externalReference = payment.externalReference?.trim() || ''
    const paymentLinkId = payment.paymentLink?.trim() || ''

    const appointment = await prisma.appointment.findFirst({
      where: {
        OR: [
          externalReference ? { id: externalReference } : undefined,
          paymentLinkId ? { asaasPaymentLinkId: paymentLinkId } : undefined,
        ].filter(Boolean) as { id: string }[] | { asaasPaymentLinkId: string }[],
      },
      include: {
        barber: { select: { name: true } },
        service: { select: { name: true, price: true, duration: true } },
      },
    })

    if (!appointment) {
      // Cobrança que não é de agendamento (assinatura, cobrança avulsa) ou id
      // desconhecido. Reenviar não resolve — encerramos com 200.
      console.warn(
        `[asaas-webhook] ${event}: nenhum agendamento para externalReference="${externalReference}" paymentLink="${paymentLinkId}"`,
      )
      return NextResponse.json({ received: true, ignored: 'agendamento não encontrado' }, { status: 200 })
    }

    if (isCancelled) {
      if (appointment.status === 'cancelled') {
        return NextResponse.json({ received: true, alreadyCancelled: true }, { status: 200 })
      }

      await prisma.appointment.update({
        where: { id: appointment.id },
        data: {
          status: 'cancelled',
          asaasPaymentId: payment.id || appointment.asaasPaymentId,
        },
      })

      console.log(`[asaas-webhook] ${event}: agendamento ${appointment.id} cancelado.`)
      return NextResponse.json({ received: true, appointmentId: appointment.id, status: 'cancelled' }, { status: 200 })
    }

    // Pagamento confirmado — idempotente: se já tem paidAt, nada a fazer.
    if (appointment.paidAt) {
      return NextResponse.json(
        { received: true, appointmentId: appointment.id, alreadyPaid: true },
        { status: 200 },
      )
    }

    const updated = await prisma.appointment.update({
      where: { id: appointment.id },
      data: {
        status: 'confirmed',
        paidAt: new Date(),
        asaasPaymentId: payment.id || null,
      },
    })

    console.log(`[asaas-webhook] ${event}: agendamento ${appointment.id} confirmado.`)

    // Agora sim o cliente recebe a confirmação com o arquivo de agenda.
    // Uma falha de e-mail não pode fazer o Asaas reenviar o evento.
    try {
      const result = await sendAppointmentConfirmationEmail({
        id: updated.id,
        clientName: updated.clientName,
        clientEmail: updated.clientEmail,
        date: updated.date,
        startTime: updated.startTime,
        endTime: updated.endTime,
        status: updated.status,
        payOnline: updated.payOnline,
        paymentMethod: updated.paymentMethod,
        serviceName: appointment.service?.name,
        servicePrice: appointment.service?.price,
        serviceDuration: appointment.service?.duration,
        barberName: appointment.barber?.name,
        siteUrl: resolveSiteUrl(request),
      })

      if (!result.sent) {
        console.warn(
          `[asaas-webhook] Confirmação não enviada para ${updated.id}:`,
          result.skipped || result.error,
        )
      }
    } catch (emailError) {
      console.error('[asaas-webhook] Erro ao enviar e-mail de confirmação:', emailError)
    }

    return NextResponse.json(
      { received: true, appointmentId: updated.id, status: 'confirmed' },
      { status: 200 },
    )
  } catch (error) {
    // Falha nossa (banco fora, por exemplo): 500 para o Asaas reenviar.
    console.error('[asaas-webhook] Erro ao processar evento:', error)
    return NextResponse.json({ error: 'Erro ao processar evento' }, { status: 500 })
  }
}

// O painel do Asaas faz uma checagem de alcance da URL antes de salvar.
export async function GET() {
  return NextResponse.json({ status: 'ok', endpoint: 'asaas-webhook' }, { status: 200 })
}
