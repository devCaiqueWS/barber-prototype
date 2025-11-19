import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET() {
  try {
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1)
    const endOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0)

    const todayStr = today.toISOString().split('T')[0]
    const startOfMonthStr = startOfMonth.toISOString().split('T')[0]
    const endOfMonthStr = endOfMonth.toISOString().split('T')[0]

    // Agendamentos de hoje (independente de status)
    const todayAppointments = await prisma.appointment.count({
      where: { date: todayStr },
    })

    // Total de clientes
    const totalClients = await prisma.user.count({
      where: { role: 'CLIENT' },
    })

    // Status considerados para faturamento
    // - mensal: apenas concluídos
    // - diário: confirmados ou concluídos
    const monthlyRevenueStatuses = ['completed', 'COMPLETED'] as const
    const dailyRevenueStatuses = ['confirmed', 'completed', 'CONFIRMED', 'COMPLETED'] as const

    // Faturamento do mês (somente agendamentos concluídos)
    const monthlyAppointments = await prisma.appointment.findMany({
      where: {
        date: {
          gte: startOfMonthStr,
          lte: endOfMonthStr,
        },
        status: {
          in: monthlyRevenueStatuses as unknown as string[],
        },
      },
      include: {
        service: {
          select: { price: true },
        },
      },
    })

    const monthlyRevenue = monthlyAppointments.reduce(
      (total, appointment) => total + (appointment.service?.price || 0),
      0,
    )

    // Faturamento de hoje (confirmados ou concluídos)
    const todayAppointmentsRevenue = await prisma.appointment.findMany({
      where: {
        date: todayStr,
        status: {
          in: dailyRevenueStatuses as unknown as string[],
        },
      },
      include: {
        service: {
          select: { price: true },
        },
      },
    })

    const todayRevenue = todayAppointmentsRevenue.reduce(
      (total, appointment) => total + (appointment.service?.price || 0),
      0,
    )

    // Barbeiros ativos
    const activeBarbers = await prisma.user.count({
      where: { role: 'BARBER' },
    })

    // Agendamentos por status hoje
    const appointmentsByStatusRaw = await prisma.appointment.groupBy({
      by: ['status'],
      _count: { id: true },
      where: { date: todayStr },
    })

    const appointmentsByStatus = appointmentsByStatusRaw.reduce(
      (acc: Record<string, number>, item: { status: string; _count: { id: number } }) => {
        acc[item.status] = item._count.id
        return acc
      },
      {},
    )

    return NextResponse.json({
      todayAppointments,
      totalClients,
      monthlyRevenue,
      todayRevenue,
      activeBarbers,
      appointmentsByStatus,
    })
  } catch (error) {
    console.error('Erro ao buscar estatísticas:', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 },
    )
  }
}

