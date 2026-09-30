import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { resolveSiteUrl } from '@/lib/business'
import { sendAppointmentConfirmationEmail } from '@/lib/appointment-email'
import { asaasRequest, isAsaasConfigured } from '@/lib/asaas'
import type { Prisma } from '@prisma/client'
import { hasSlotConflict, withSlotLock } from '@/lib/appointment-status'

// Webhook do Asaas (agendamentos e assinaturas).
// Configuração: ASAAS_WEBHOOK_TOKEN (o mesmo token cadastrado no painel do Asaas).
//
// O Asaas entrega "at least once": o mesmo evento pode chegar mais de uma vez.
// A idempotência vem do campo paidAt — só o primeiro evento de pagamento
// confirma o agendamento e dispara o e-mail.
//
// Regra de resposta: devolver 2xx sempre que a mensagem foi entendida (mesmo
// que ignorada). 15 respostas seguidas fora da faixa 2xx fazem o Asaas
// interromper a fila de entrega, então só devolvemos 500 em falha transitória
// de verdade, onde a reentrega é desejada.

const PAID_EVENTS = new Set(['PAYMENT_CONFIRMED', 'PAYMENT_RECEIVED'])

// Dinheiro devolvido: o agendamento deixa de valer.
const REVERSAL_EVENTS = new Set([
  'PAYMENT_REFUNDED',
  'PAYMENT_CHARGEBACK_REQUESTED',
  'PAYMENT_REVERSED',
])

// Cobrança que não vai mais ser paga.
const UNPAID_EVENTS = new Set(['PAYMENT_OVERDUE', 'PAYMENT_DELETED'])

const CHECKOUT_CLOSED_EVENTS = new Set(['CHECKOUT_EXPIRED', 'CHECKOUT_CANCELED'])

const SUBSCRIPTION_ENDED_EVENTS = new Set(['SUBSCRIPTION_DELETED', 'SUBSCRIPTION_INACTIVATED'])

type AsaasWebhookBody = {
  id?: string
  event?: string
  payment?: {
    id?: string
    externalReference?: string | null
    paymentLink?: string | null
    checkoutSession?: string | null
    subscription?: string | null
    value?: number
    status?: string
    billingType?: string
  }
  checkout?: { id?: string; status?: string }
  subscription?: { id?: string; status?: string }
}

const ok = (payload: Record<string, unknown>) => NextResponse.json({ received: true, ...payload }, { status: 200 })

const appointmentInclude = {
  barber: { select: { name: true } },
  service: { select: { name: true, price: true, duration: true } },
} as const

type AppointmentWithRelations = NonNullable<
  Awaited<ReturnType<typeof prisma.appointment.findFirst<{ include: typeof appointmentInclude }>>>
>

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
    return ok({ ignored: 'corpo inválido' })
  }

  const event = body.event || ''

  try {
    if (SUBSCRIPTION_ENDED_EVENTS.has(event)) {
      return await handleSubscriptionEnded(event, body.subscription?.id)
    }

    if (event === 'CHECKOUT_PAID' || CHECKOUT_CLOSED_EVENTS.has(event)) {
      return await handleCheckoutEvent(request, event, body.checkout?.id)
    }

    const payment = body.payment
    if (!payment) return ok({ ignored: event || 'sem objeto payment' })

    const isPaid = PAID_EVENTS.has(event)
    const isReversal = REVERSAL_EVENTS.has(event)
    const isUnpaid = UNPAID_EVENTS.has(event)

    if (!isPaid && !isReversal && !isUnpaid) {
      // PAYMENT_CREATED, análises de risco, splits etc. não mudam nada aqui.
      return ok({ ignored: event })
    }

    // Mensalidade de assinatura
    if (payment.subscription) {
      return await handleSubscriptionPayment(event, payment.subscription, { isPaid, isUnpaid })
    }

    const appointment = await findAppointmentForPayment(payment)
    if (!appointment) {
      // Cobrança avulsa ou id desconhecido. Reenviar não resolve — encerramos com 200.
      console.warn(
        `[asaas-webhook] ${event}: nenhum agendamento para externalReference="${payment.externalReference || ''}" ` +
          `checkout="${payment.checkoutSession || ''}" paymentLink="${payment.paymentLink || ''}"`,
      )
      return ok({ ignored: 'agendamento não encontrado' })
    }

    if (isReversal) {
      if (appointment.status === 'cancelled') return ok({ appointmentId: appointment.id, alreadyCancelled: true })
      await prisma.appointment.update({
        where: { id: appointment.id },
        data: { status: 'cancelled', asaasPaymentId: payment.id || appointment.asaasPaymentId },
      })
      console.log(`[asaas-webhook] ${event}: agendamento ${appointment.id} cancelado (estorno).`)
      return ok({ appointmentId: appointment.id, status: 'cancelled' })
    }

    if (isUnpaid) {
      // Cobrança vencida/removida sem pagamento: a reserva deixa de valer — mas só
      // depois do prazo, porque um "pagar agora" pode ter renovado a reserva com
      // outro checkout enquanto esta cobrança antiga vencia.
      const holdStillValid = appointment.paymentExpiresAt != null && appointment.paymentExpiresAt > new Date()
      if (appointment.paidAt || appointment.status !== 'awaiting_payment' || holdStillValid) {
        return ok({ appointmentId: appointment.id, ignored: 'agendamento não aguardava pagamento' })
      }
      await prisma.appointment.update({ where: { id: appointment.id }, data: { status: 'expired' } })
      return ok({ appointmentId: appointment.id, status: 'expired' })
    }

    // Pagamento confirmado: confere se o valor cobre o serviço.
    const price = appointment.service?.price ?? 0
    const paidValue = typeof payment.value === 'number' ? payment.value : null
    if (paidValue != null && paidValue + 0.009 < price) {
      console.error(
        `[asaas-webhook] ${event}: valor pago R$ ${paidValue} menor que o serviço R$ ${price} ` +
          `(agendamento ${appointment.id}, cobrança ${payment.id}). Não confirmado.`,
      )
      return ok({ appointmentId: appointment.id, ignored: 'valor insuficiente' })
    }

    return await confirmAppointmentPayment(request, event, appointment, {
      paymentId: payment.id || null,
      amount: paidValue,
    })
  } catch (error) {
    // Falha nossa (banco fora, por exemplo): 500 para o Asaas reenviar.
    console.error('[asaas-webhook] Erro ao processar evento:', error)
    return NextResponse.json({ error: 'Erro ao processar evento' }, { status: 500 })
  }
}

// O Checkout é criado com externalReference = id do agendamento, e o id do
// checkout (ou do link de pagamento legado) fica salvo no agendamento.
async function findAppointmentForPayment(payment: NonNullable<AsaasWebhookBody['payment']>) {
  const externalReference = payment.externalReference?.trim() || ''
  const checkoutId = payment.checkoutSession?.trim() || ''
  const paymentLinkId = payment.paymentLink?.trim() || ''

  const or = [
    externalReference ? { id: externalReference } : null,
    checkoutId ? { asaasCheckoutId: checkoutId } : null,
    paymentLinkId ? { asaasPaymentLinkId: paymentLinkId } : null,
  ].filter((clause): clause is NonNullable<typeof clause> => clause !== null)

  if (or.length === 0) return null
  return prisma.appointment.findFirst({ where: { OR: or }, include: appointmentInclude })
}

async function handleCheckoutEvent(request: NextRequest, event: string, checkoutId?: string) {
  if (!checkoutId) return ok({ ignored: `${event} sem checkout.id` })

  const appointment = await prisma.appointment.findFirst({
    where: { asaasCheckoutId: checkoutId },
    include: appointmentInclude,
  })

  if (!appointment) {
    // Checkout antigo (substituído por um novo "pagar agora") ou de outra origem.
    return ok({ ignored: 'checkout sem agendamento atual' })
  }

  if (event === 'CHECKOUT_PAID') {
    return confirmAppointmentPayment(request, event, appointment, { paymentId: null, amount: null })
  }

  // Expirado/cancelado sem pagamento: libera a reserva.
  if (appointment.status === 'awaiting_payment' && !appointment.paidAt) {
    await prisma.appointment.update({ where: { id: appointment.id }, data: { status: 'expired' } })
    return ok({ appointmentId: appointment.id, status: 'expired' })
  }
  return ok({ appointmentId: appointment.id, ignored: 'agendamento não aguardava pagamento' })
}

async function confirmAppointmentPayment(
  request: NextRequest,
  event: string,
  appointment: AppointmentWithRelations,
  payment: { paymentId: string | null; amount: number | null },
) {
  // Idempotente: CHECKOUT_PAID e PAYMENT_RECEIVED chegam para o mesmo pagamento.
  if (appointment.paidAt) {
    return recordRepeatedPayment(event, appointment, payment)
  }

  // Pagou depois de a reserva vencer: confirma se o horário continua livre; senão
  // registra o conflito para o admin resolver (estorno manual) sem tomar o horário
  // de outra pessoa. Agendamento cancelado nunca volta a valer sozinho.
  const holdLost =
    appointment.status === 'expired' ||
    (appointment.status === 'awaiting_payment' &&
      appointment.paymentExpiresAt != null &&
      appointment.paymentExpiresAt <= new Date())

  const settle = async (tx: Prisma.TransactionClient) => {
    let status = 'confirmed'
    if (appointment.status === 'cancelled') {
      status = 'payment_conflict'
    } else if (holdLost && appointment.barberId) {
      const conflict = await hasSlotConflict(
        {
          barberId: appointment.barberId,
          date: appointment.date,
          startTime: appointment.startTime,
          durationMinutes: appointment.service?.duration ?? 30,
          excludeId: appointment.id,
        },
        tx,
      )
      if (conflict) status = 'payment_conflict'
    }

    // Só o primeiro evento grava o pagamento (paidAt ainda nulo); os repetidos,
    // mesmo simultâneos, não passam deste ponto nem reenviam o e-mail.
    const result = await tx.appointment.updateMany({
      where: { id: appointment.id, paidAt: null },
      data: {
        status,
        paidAt: new Date(),
        payOnline: true,
        asaasPaymentId: payment.paymentId || appointment.asaasPaymentId,
        amountPaid: payment.amount ?? appointment.service?.price ?? null,
      },
    })
    return result.count === 1 ? status : null
  }

  const nextStatus = appointment.barberId
    ? await withSlotLock(appointment.barberId, appointment.date, settle)
    : await prisma.$transaction(settle)

  if (!nextStatus) {
    return ok({ appointmentId: appointment.id, alreadyPaid: true })
  }

  if (nextStatus === 'payment_conflict') {
    console.error(
      `[asaas-webhook] ${event}: agendamento ${appointment.id} pago sem horário válido ` +
        `(${appointment.status}, ${appointment.date} ${appointment.startTime}). Precisa de estorno ou remarcação manual.`,
    )
    return ok({ appointmentId: appointment.id, status: nextStatus })
  }

  const updated = await prisma.appointment.findUniqueOrThrow({ where: { id: appointment.id } })

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
      console.warn(`[asaas-webhook] Confirmação não enviada para ${updated.id}:`, result.skipped || result.error)
    }
  } catch (emailError) {
    console.error('[asaas-webhook] Erro ao enviar e-mail de confirmação:', emailError)
  }

  return ok({ appointmentId: updated.id, status: 'confirmed' })
}

// Evento de um pagamento já registrado. Mesmo id de cobrança (ou CHECKOUT_PAID sem
// id) é repetição; um id diferente significa que o cliente pagou duas vezes.
async function recordRepeatedPayment(
  event: string,
  appointment: AppointmentWithRelations,
  payment: { paymentId: string | null; amount: number | null },
) {
  if (payment.paymentId && !appointment.asaasPaymentId) {
    // Completa os dados da cobrança se o primeiro evento (CHECKOUT_PAID) não os trazia.
    await prisma.appointment.updateMany({
      where: { id: appointment.id, asaasPaymentId: null },
      data: { asaasPaymentId: payment.paymentId, amountPaid: payment.amount ?? appointment.amountPaid },
    })
  } else if (payment.paymentId && appointment.asaasPaymentId && payment.paymentId !== appointment.asaasPaymentId) {
    console.error(
      `[asaas-webhook] ${event}: agendamento ${appointment.id} recebeu um segundo pagamento ` +
        `(${payment.paymentId}; o primeiro foi ${appointment.asaasPaymentId}). Estornar a cobrança duplicada no Asaas.`,
    )
  }
  return ok({ appointmentId: appointment.id, alreadyPaid: true })
}

// Mensalidades podem chegar fora de ordem (no cartão, PAYMENT_RECEIVED de um mês
// chega perto do PAYMENT_OVERDUE do mês seguinte). Em vez de confiar na ordem, o
// status é recalculado perguntando ao Asaas se há mensalidade vencida em aberto.
async function handleSubscriptionPayment(
  event: string,
  asaasSubscriptionId: string,
  flags: { isPaid: boolean; isUnpaid: boolean },
) {
  const subscription = await prisma.subscription.findFirst({ where: { asaasSubscriptionId } })
  if (!subscription) {
    console.warn(`[asaas-webhook] ${event}: assinatura ${asaasSubscriptionId} não encontrada.`)
    return ok({ ignored: 'assinatura não encontrada' })
  }

  if (subscription.status === 'cancelled') {
    return ok({ subscriptionId: subscription.id, ignored: 'assinatura cancelada' })
  }

  if (!flags.isPaid && event !== 'PAYMENT_OVERDUE') {
    // Estorno de mensalidade ou cobrança removida: não muda o status sozinho.
    return ok({ subscriptionId: subscription.id, ignored: event })
  }

  let hasOverdue: boolean
  if (isAsaasConfigured()) {
    // Falha aqui propaga (500) para o Asaas reenviar o evento mais tarde.
    const overdue = await asaasRequest<{ totalCount?: number; data?: unknown[] }>(
      `/payments?subscription=${encodeURIComponent(asaasSubscriptionId)}&status=OVERDUE&limit=1`,
    )
    hasOverdue = (overdue.totalCount ?? overdue.data?.length ?? 0) > 0
  } else {
    hasOverdue = event === 'PAYMENT_OVERDUE'
  }

  let status = subscription.status
  if (hasOverdue) status = 'overdue'
  else if (flags.isPaid || subscription.status === 'overdue') status = 'active'

  await prisma.subscription.update({
    where: { id: subscription.id },
    data: { status, ...(flags.isPaid ? { lastPaymentAt: new Date() } : {}) },
  })
  console.log(`[asaas-webhook] ${event}: assinatura ${subscription.id} → ${status}.`)
  return ok({ subscriptionId: subscription.id, status })
}

async function handleSubscriptionEnded(event: string, asaasSubscriptionId?: string) {
  if (!asaasSubscriptionId) return ok({ ignored: `${event} sem subscription.id` })

  const result = await prisma.subscription.updateMany({
    where: { asaasSubscriptionId, status: { not: 'cancelled' } },
    data: { status: 'cancelled' },
  })
  console.log(`[asaas-webhook] ${event}: ${result.count} assinatura(s) cancelada(s).`)
  return ok({ cancelled: result.count })
}

// O painel do Asaas faz uma checagem de alcance da URL antes de salvar.
export async function GET() {
  return NextResponse.json({ status: 'ok', endpoint: 'asaas-webhook' }, { status: 200 })
}
