import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { formatDateKey } from '@/lib/date'

const NEW_CLIENT_DAYS = 30

// GET - Lista de clientes com indicadores para o painel admin
// (assinatura, faltas, novos clientes, frequência)
export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    const role = ((session?.user as { role?: string })?.role || '').toString().toUpperCase()

    if (!session || role !== 'ADMIN') {
      return NextResponse.json({ error: 'Acesso negado' }, { status: 403 })
    }

    const now = new Date()
    const todayStr = formatDateKey(now)
    const monthPrefix = todayStr.slice(0, 7) // YYYY-MM
    const newClientCutoff = new Date(now.getTime() - NEW_CLIENT_DAYS * 24 * 60 * 60 * 1000)

    const clients = await prisma.user.findMany({
      where: {
        role: 'CLIENT',
        OR: [{ isRegistered: true }, { clientAppointments: { some: {} } }],
      },
      select: {
        id: true,
        clientCode: true,
        name: true,
        email: true,
        whatsapp: true,
        phone: true,
        isRegistered: true,
        registeredAt: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
    })

    const appointments = await prisma.appointment.findMany({
      where: { clientId: { not: null } },
      select: { clientId: true, status: true, date: true },
    })

    const activeSubscriptions = await prisma.subscription.findMany({
      where: { status: 'active', clientId: { not: null } },
      select: { clientId: true },
    })
    const subscriberIds = new Set(activeSubscriptions.map((s) => s.clientId))

    interface ClientAgg {
      total: number
      completed: number
      cancelled: number
      noShows: number
      lastVisit: string | null
      nextAppointment: string | null
      firstDate: string | null
    }

    const aggByClient = new Map<string, ClientAgg>()
    for (const appt of appointments) {
      if (!appt.clientId) continue
      let agg = aggByClient.get(appt.clientId)
      if (!agg) {
        agg = {
          total: 0,
          completed: 0,
          cancelled: 0,
          noShows: 0,
          lastVisit: null,
          nextAppointment: null,
          firstDate: null,
        }
        aggByClient.set(appt.clientId, agg)
      }

      agg.total += 1
      if (appt.status === 'completed') {
        agg.completed += 1
        if (!agg.lastVisit || appt.date > agg.lastVisit) agg.lastVisit = appt.date
      } else if (appt.status === 'cancelled') {
        agg.cancelled += 1
      } else if (appt.status === 'no_show') {
        agg.noShows += 1
      } else if (appt.date >= todayStr) {
        // pending/confirmed no futuro
        if (!agg.nextAppointment || appt.date < agg.nextAppointment) {
          agg.nextAppointment = appt.date
        }
      }

      if (!agg.firstDate || appt.date < agg.firstDate) agg.firstDate = appt.date
    }

    const result = clients.map((client) => {
      const agg = aggByClient.get(client.id)
      const accountDate = client.registeredAt || client.createdAt
      const isNew =
        accountDate >= newClientCutoff ||
        ((agg?.total ?? 0) <= 1 && (agg?.firstDate ? agg.firstDate >= formatDateKey(newClientCutoff) : false))

      return {
        id: client.id,
        clientCode: client.clientCode,
        name: client.name,
        email: client.email,
        whatsapp: client.whatsapp || client.phone || '',
        isRegistered: client.isRegistered,
        registeredAt: client.registeredAt,
        createdAt: client.createdAt,
        hasActiveSubscription: subscriberIds.has(client.id),
        isNew,
        totalAppointments: agg?.total ?? 0,
        completedAppointments: agg?.completed ?? 0,
        cancelledAppointments: agg?.cancelled ?? 0,
        noShows: agg?.noShows ?? 0,
        lastVisit: agg?.lastVisit ?? null,
        nextAppointment: agg?.nextAppointment ?? null,
      }
    })

    const noShowsThisMonth = appointments.filter(
      (a) => a.status === 'no_show' && a.date.startsWith(monthPrefix),
    ).length

    const summary = {
      totalClients: result.length,
      registeredClients: result.filter((c) => c.isRegistered).length,
      newClients: result.filter((c) => c.isNew).length,
      activeSubscribers: result.filter((c) => c.hasActiveSubscription).length,
      noShowsThisMonth,
      clientsWithNoShows: result.filter((c) => c.noShows > 0).length,
    }

    return NextResponse.json({ success: true, summary, clients: result })
  } catch (error) {
    console.error('Erro ao buscar clientes (admin):', error)
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 })
  }
}
