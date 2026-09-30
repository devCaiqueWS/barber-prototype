import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getAuthUser } from '@/lib/client-auth'
import { resolveSiteUrl } from '@/lib/business'
import { hasSlotConflict, paymentHoldDeadline, PAYMENT_HOLD_MINUTES, withSlotLock } from '@/lib/appointment-status'
import { appointmentStartsAt } from '@/lib/client-hub'
import {
  AsaasError,
  ASAAS_CHECKOUT_MINUTES,
  cancelCheckout,
  checkoutUrlFromId,
  createAppointmentCheckout,
  isAsaasConfigured,
} from '@/lib/asaas'

// POST - "Pagar agora" de um agendamento do cliente logado.
// Reaproveita o checkout ativo ou cria outro; o valor é sempre o preço do serviço
// no banco. Uma reserva vencida é renovada se o horário ainda estiver livre.
export async function POST(request: NextRequest) {
  const authUser = await getAuthUser(request)
  if (!authUser) {
    return NextResponse.json({ error: 'É necessário estar logado.', needsAuth: true }, { status: 401 })
  }

  if (!isAsaasConfigured()) {
    return NextResponse.json({ error: 'Pagamento online indisponível no momento.' }, { status: 503 })
  }

  let appointmentId = ''
  try {
    const body = (await request.json()) as { appointmentId?: string }
    appointmentId = body.appointmentId?.trim() || ''
  } catch {
    // corpo inválido cai na validação abaixo
  }

  if (!appointmentId) {
    return NextResponse.json({ error: 'Agendamento não informado.' }, { status: 400 })
  }

  try {
    const appointment = await prisma.appointment.findFirst({
      where: { id: appointmentId, clientId: authUser.id },
      include: { service: { select: { name: true, price: true, duration: true } } },
    })

    if (!appointment) {
      return NextResponse.json({ error: 'Agendamento não encontrado.' }, { status: 404 })
    }

    if (appointment.paidAt) {
      return NextResponse.json({ error: 'Este agendamento já está pago.' }, { status: 409 })
    }

    if (!['awaiting_payment', 'expired'].includes(appointment.status)) {
      return NextResponse.json({ error: 'Este agendamento não aguarda pagamento.' }, { status: 409 })
    }

    const now = new Date()
    if (appointmentStartsAt(appointment.date, appointment.startTime) <= now) {
      return NextResponse.json({ error: 'O horário deste agendamento já passou.' }, { status: 409 })
    }

    const holdActive =
      appointment.status === 'awaiting_payment' &&
      appointment.paymentExpiresAt != null &&
      appointment.paymentExpiresAt > now

    // O checkout nasce junto com a reserva e expira ASAAS_CHECKOUT_MINUTES depois;
    // enquanto estiver nessa janela, o mesmo link continua valendo.
    if (holdActive && appointment.asaasCheckoutId && appointment.paymentExpiresAt) {
      const checkoutExpiresAt = new Date(
        appointment.paymentExpiresAt.getTime() - (PAYMENT_HOLD_MINUTES - ASAAS_CHECKOUT_MINUTES) * 60 * 1000,
      )
      if (checkoutExpiresAt.getTime() - now.getTime() > 60 * 1000) {
        return NextResponse.json({
          checkoutUrl: checkoutUrlFromId(appointment.asaasCheckoutId),
          paymentExpiresAt: appointment.paymentExpiresAt,
        })
      }
    }

    if (!appointment.barberId) {
      return NextResponse.json({ error: 'Agendamento sem barbeiro definido.' }, { status: 409 })
    }
    const barberId = appointment.barberId
    const previousCheckoutId = appointment.asaasCheckoutId
    const pendingStatuses = ['awaiting_payment', 'expired']

    // Renova a reserva sob a trava da agenda, e só se o agendamento não mudou desde
    // a leitura (o webhook pode ter confirmado um pagamento nesse meio-tempo).
    const claim = await withSlotLock(barberId, appointment.date, async (tx) => {
      const conflict = await hasSlotConflict(
        {
          barberId,
          date: appointment.date,
          startTime: appointment.startTime,
          durationMinutes: appointment.service?.duration ?? 30,
          excludeId: appointment.id,
        },
        tx,
      )
      if (conflict) {
        await tx.appointment.updateMany({
          where: { id: appointment.id, paidAt: null, status: { in: pendingStatuses } },
          data: { status: 'expired' },
        })
        return 'taken' as const
      }
      const renewed = await tx.appointment.updateMany({
        where: { id: appointment.id, paidAt: null, status: { in: pendingStatuses } },
        data: { status: 'awaiting_payment', paymentExpiresAt: paymentHoldDeadline(), payOnline: true },
      })
      return renewed.count === 1 ? ('ok' as const) : ('changed' as const)
    })

    if (claim === 'taken') {
      return NextResponse.json(
        { error: 'Esse horário foi ocupado por outra pessoa. Faça um novo agendamento.' },
        { status: 409 },
      )
    }
    if (claim === 'changed') {
      return NextResponse.json(
        { error: 'Este agendamento acabou de ser atualizado. Recarregue a página.' },
        { status: 409 },
      )
    }

    let checkout: { id: string; url: string }
    try {
      checkout = await createAppointmentCheckout({
        appointmentId: appointment.id,
        serviceName: appointment.service?.name || 'Agendamento',
        amount: appointment.service?.price ?? 0,
        siteUrl: resolveSiteUrl(request),
        customer: {
          name: authUser.name,
          email: authUser.email,
          phone: authUser.whatsapp || authUser.phone,
          cpf: authUser.cpf,
        },
      })
    } catch (checkoutError) {
      // Sem checkout não há como pagar: devolve o horário
      await prisma.appointment.updateMany({
        where: { id: appointment.id, paidAt: null, status: 'awaiting_payment' },
        data: { status: 'expired' },
      })
      throw checkoutError
    }

    const saved = await prisma.appointment.updateMany({
      where: { id: appointment.id, paidAt: null },
      data: { asaasCheckoutId: checkout.id },
    })
    if (saved.count === 0) {
      // O checkout anterior foi pago enquanto este era criado
      await cancelCheckout(checkout.id)
      return NextResponse.json({ error: 'Este agendamento já está pago.' }, { status: 409 })
    }

    // Fecha o link antigo depois de gravar o novo, para o cliente não pagar duas vezes
    if (previousCheckoutId && previousCheckoutId !== checkout.id) {
      await cancelCheckout(previousCheckoutId)
    }

    const current = await prisma.appointment.findUnique({
      where: { id: appointment.id },
      select: { paymentExpiresAt: true },
    })

    return NextResponse.json({ checkoutUrl: checkout.url, paymentExpiresAt: current?.paymentExpiresAt ?? null })
  } catch (error) {
    console.error('[payments] Erro ao gerar checkout:', error)
    const detail = error instanceof AsaasError ? ` (${error.message})` : ''
    return NextResponse.json({ error: `Não foi possível iniciar o pagamento${detail}.` }, { status: 502 })
  }
}
