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
    const todayAppointments = await prisma.appointment.count({
      where: {
        date: {
          gte: today,
          lt: tomorrow,
        },
      },
    })

    // Total de clientes
    const totalClients = await prisma.user.count({
      where: {
        role: 'client',
      },
    })

    // Faturamento do mês
    

    // Barbeiros ativos
    const activeBarbers = await prisma.user.count({
      where: {
        role: 'barber',
      },
    })

    // Agendamentos por status hoje
    const appointmentsByStatus = await prisma.appointment.groupBy({
      by: ['status'],
      _count: {
        id: true,
      },
      where: {
        date: {
          gte: today,
          lt: tomorrow,
        },
      },
    })

   

    return NextResponse.json({
      todayAppointments,
      totalClients,
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
