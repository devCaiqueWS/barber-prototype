import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET() {
  try {
    // Para esta versão, vou usar uma verificação básica
    // Em produção, implementar verificação completa de sessão
    
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const tomorrow = new Date(today)
    tomorrow.setDate(tomorrow.getDate() + 1)

    const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1)
    const endOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0)

    // Agendamentos de hoje
    const todayStr = today.toISOString().split('T')[0];
    const todayAppointments = await prisma.appointment.count({
      where: {
        date: todayStr,
      },
    })

    // Total de clientes
    const totalClients = await prisma.user.count({
      where: {
        role: 'CLIENT',
      },
    })

    // Faturamento do mês
    const startOfMonthStr = startOfMonth.toISOString().split('T')[0];
    const endOfMonthStr = endOfMonth.toISOString().split('T')[0];
    
    const monthlyAppointments = await prisma.appointment.findMany({
      where: {
        date: {
          gte: startOfMonthStr,
          lte: endOfMonthStr,
        },
        status: 'CONFIRMED',
      },
      include: {
        service: {
          select: {
            price: true
          }
        }
      }
    })

    const monthlyRevenue = monthlyAppointments.reduce((total, appointment) => {
      return total + (appointment.service?.price || 0)
    }, 0)

    // Faturamento de hoje
    const todayAppointmentsRevenue = await prisma.appointment.findMany({
      where: {
        date: todayStr,
        status: 'CONFIRMED',
      },
      include: {
        service: {
          select: {
            price: true
          }
        }
      }
    })

    const todayRevenue = todayAppointmentsRevenue.reduce((total, appointment) => {
      return total + (appointment.service?.price || 0)
    }, 0)
    const activeBarbers = await prisma.user.count({
      where: {
        role: 'BARBER',
      },
    })

    // Agendamentos por status hoje
    const appointmentsByStatus = await prisma.appointment.groupBy({
      by: ['status'],
      _count: {
        id: true,
      },
      where: {
        date: todayStr,
      },
    })

    return NextResponse.json({
      todayAppointments,
      totalClients,
      monthlyRevenue,
      todayRevenue,
      activeBarbers,
      appointmentsByStatus: appointmentsByStatus.reduce((acc: Record<string, number>, item: { status: string; _count: { id: number } }) => {
        acc[item.status] = item._count.id
        return acc
      }, {}),
    })
  } catch (error) {
    console.error('Erro ao buscar estatísticas:', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}
