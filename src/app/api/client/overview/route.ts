import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getAuthUser } from '@/lib/client-auth'
import { expireStaleHolds, FINISHED_STATUSES } from '@/lib/appointment-status'
import { getDisplaySubscription } from '@/lib/subscription'
import { clientCanCancel, todayKeySaoPaulo } from '@/lib/client-hub'

// GET - Visão geral da conta do cliente (Hub)
export async function GET(request: NextRequest) {
  try {
    const authUser = await getAuthUser(request)

    if (!authUser) {
      return NextResponse.json(
        { error: 'É necessário estar logado.', needsAuth: true },
        { status: 401 },
      )
    }

    await expireStaleHolds({ clientId: authUser.id })

    const now = new Date()
    const todayStr = todayKeySaoPaulo(now)

    const appointments = await prisma.appointment.findMany({
      where: { clientId: authUser.id },
      orderBy: [{ date: 'desc' }, { startTime: 'desc' }],
      include: {
        service: { select: { name: true, price: true, duration: true } },
        barber: { select: { name: true } },
      },
    })

    const isUpcoming = (a: (typeof appointments)[number]) =>
      a.date >= todayStr && !FINISHED_STATUSES.includes(a.status)

    const upcoming = appointments
      .filter(isUpcoming)
      .sort((a, b) => `${a.date} ${a.startTime}`.localeCompare(`${b.date} ${b.startTime}`))

    const past = appointments.filter((a) => !isUpcoming(a))

    const subscription = await getDisplaySubscription(authUser.id)

    const completedCount = appointments.filter((a) => a.status === 'completed').length

    const serialize = (a: (typeof appointments)[number]) => ({
      id: a.id,
      date: a.date,
      startTime: a.startTime,
      endTime: a.endTime,
      status: a.status,
      paymentMethod: a.paymentMethod,
      payOnline: a.payOnline,
      paidAt: a.paidAt,
      paymentExpiresAt: a.status === 'awaiting_payment' ? a.paymentExpiresAt : null,
      canCancel: clientCanCancel(a, now),
      service: a.service,
      barber: a.barber,
    })

    return NextResponse.json({
      success: true,
      user: {
        id: authUser.id,
        clientCode: authUser.clientCode,
        name: authUser.name,
        email: authUser.email,
        whatsapp: authUser.whatsapp || authUser.phone || '',
        hasCpf: Boolean(authUser.cpf),
        cpfMasked: authUser.cpf ? `***.***.${authUser.cpf.slice(-5, -2)}-${authUser.cpf.slice(-2)}` : '',
      },
      stats: { completed: completedCount },
      subscription,
      upcoming: upcoming.map(serialize),
      past: past.slice(0, 20).map(serialize),
    })
  } catch (error) {
    console.error('Erro ao carregar visão geral do cliente:', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 },
    )
  }
}
