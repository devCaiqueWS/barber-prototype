import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getAuthUser } from '@/lib/client-auth'
import { formatDateKey } from '@/lib/date'

// GET - Visão geral da conta do cliente (somente visualização)
export async function GET(request: NextRequest) {
  try {
    const authUser = await getAuthUser(request)

    if (!authUser) {
      return NextResponse.json(
        { error: 'É necessário estar logado.', needsAuth: true },
        { status: 401 },
      )
    }

    const todayStr = formatDateKey(new Date())

    const appointments = await prisma.appointment.findMany({
      where: { clientId: authUser.id },
      orderBy: [{ date: 'desc' }, { startTime: 'desc' }],
      include: {
        service: { select: { name: true, price: true, duration: true } },
        barber: { select: { name: true } },
      },
    })

    const upcoming = appointments
      .filter(
        (a) => a.date >= todayStr && !['cancelled', 'no_show', 'completed'].includes(a.status),
      )
      .sort((a, b) => `${a.date} ${a.startTime}`.localeCompare(`${b.date} ${b.startTime}`))

    const past = appointments.filter(
      (a) => a.date < todayStr || ['cancelled', 'no_show', 'completed'].includes(a.status),
    )

    const subscription = await prisma.subscription.findFirst({
      where: { clientId: authUser.id, status: 'active' },
      orderBy: { createdAt: 'desc' },
      select: { id: true, amount: true, cycle: true, status: true, createdAt: true },
    })

    const serialize = (a: (typeof appointments)[number]) => ({
      id: a.id,
      date: a.date,
      startTime: a.startTime,
      endTime: a.endTime,
      status: a.status,
      paymentMethod: a.paymentMethod,
      payOnline: a.payOnline,
      service: a.service,
      barber: a.barber,
    })

    return NextResponse.json({
      success: true,
      user: {
        id: authUser.id,
        name: authUser.name,
        email: authUser.email,
        whatsapp: authUser.whatsapp || authUser.phone || '',
      },
      subscription,
      upcoming: upcoming.map(serialize),
      past: past.map(serialize),
    })
  } catch (error) {
    console.error('Erro ao carregar visão geral do cliente:', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 },
    )
  }
}
