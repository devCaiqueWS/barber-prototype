import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// GET - Buscar estatísticas do barbeiro
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session || (session.user as any)?.role !== 'barber') {
      return NextResponse.json(
        { error: 'Acesso negado' },
        { status: 403 }
      )
    }

    const barberId = (session.user as any)?.id
    const now = new Date()
    
    // Hoje
    const startOfDay = new Date(now)
    startOfDay.setHours(0, 0, 0, 0)
    const endOfDay = new Date(now)
    endOfDay.setHours(23, 59, 59, 999)
    
    const today = await prisma.appointment.count({
      where: {
        barberId,
        date: {
          gte: startOfDay,
          lte: endOfDay
        },
        status: 'CONFIRMED'
      }
    })

    // Esta semana
    const startOfWeek = new Date(now)
    const day = startOfWeek.getDay()
    const diff = startOfWeek.getDate() - day + (day === 0 ? -6 : 1) // Ajustar para segunda-feira
    startOfWeek.setDate(diff)
    startOfWeek.setHours(0, 0, 0, 0)
    
    const endOfWeek = new Date(startOfWeek)
    endOfWeek.setDate(startOfWeek.getDate() + 6)
    endOfWeek.setHours(23, 59, 59, 999)
    
    const thisWeek = await prisma.appointment.count({
      where: {
        barberId,
        date: {
          gte: startOfWeek,
          lte: endOfWeek
        },
        status: 'CONFIRMED'
      }
    })

    // Este mês
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999)
    
    const thisMonth = await prisma.appointment.count({
      where: {
        barberId,
        date: {
          gte: startOfMonth,
          lte: endOfMonth
        },
        status: 'CONFIRMED'
      }
    })

    // Total
    const total = await prisma.appointment.count({
      where: {
        barberId,
        status: 'CONFIRMED'
      }
    })

    // Calcular faturamento mensal - buscar agendamentos com preços dos serviços
    const monthlyAppointments = await prisma.appointment.findMany({
      where: {
        barberId,
        date: {
          gte: startOfMonth,
          lte: endOfMonth
        },
        status: 'CONFIRMED'
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
      return total + (appointment.service.price || 0)
    }, 0)

    // Contar clientes únicos do barbeiro
    const uniqueClients = await prisma.appointment.findMany({
      where: {
        barberId,
        status: 'CONFIRMED'
      },
      select: {
        clientId: true
      },
      distinct: ['clientId']
    })

    return NextResponse.json({
      success: true,
      stats: {
        today,
        thisWeek,
        thisMonth,
        total,
        monthlyRevenue,
        totalClients: uniqueClients.length
      }
    })

  } catch (error) {
    console.error('Erro ao buscar estatísticas do barbeiro:', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}