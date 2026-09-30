import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getAuthUser } from '@/lib/client-auth'
import { resolveSiteUrl } from '@/lib/business'
import { hasSlotConflict, paymentHoldDeadline, PAYMENT_HOLD_MINUTES } from '@/lib/appointment-status'
import { appointmentStartsAt } from '@/lib/client-hub'
import {
  AsaasError,
  ASAAS_CHECKOUT_MINUTES,
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

    // Reserva vencida: só renova se ninguém pegou o horário nesse meio-tempo.
    if (!holdActive) {
      if (!appointment.barberId) {
        return NextResponse.json({ error: 'Agendamento sem barbeiro definido.' }, { status: 409 })
      }
      const conflict = await hasSlotConflict({
        barberId: appointment.barberId,
        date: appointment.date,
        startTime: appointment.startTime,
        durationMinutes: appointment.service?.duration ?? 30,
        excludeId: appointment.id,
      })
      if (conflict) {
        await prisma.appointment.update({ where: { id: appointment.id }, data: { status: 'expired' } })
        return NextResponse.json(
          { error: 'Esse horário foi ocupado por outra pessoa. Faça um novo agendamento.' },
          { status: 409 },
        )
      }
    }

    const checkout = await createAppointmentCheckout({
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

    const updated = await prisma.appointment.update({
      where: { id: appointment.id },
      data: {
        status: 'awaiting_payment',
        asaasCheckoutId: checkout.id,
        paymentExpiresAt: paymentHoldDeadline(now),
        payOnline: true,
      },
    })

    return NextResponse.json({ checkoutUrl: checkout.url, paymentExpiresAt: updated.paymentExpiresAt })
  } catch (error) {
    console.error('[payments] Erro ao gerar checkout:', error)
    const detail = error instanceof AsaasError ? ` (${error.message})` : ''
    return NextResponse.json({ error: `Não foi possível iniciar o pagamento${detail}.` }, { status: 502 })
  }
}
