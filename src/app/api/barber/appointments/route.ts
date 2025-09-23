import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// GET - Buscar agendamentos do barbeiro
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session || (session.user as any)?.role !== 'barber') {
      return NextResponse.json(
        { error: 'Acesso negado' },
        { status: 403 }
      )
    }

    const { searchParams } = new URL(request.url)
    const date = searchParams.get('date')
    
    let whereClause: any = {
      barberId: (session.user as any)?.id,
      status: {
        not: 'CANCELLED'
      }
    }

    // Filtro por data se fornecido
    if (date) {
      const selectedDate = new Date(date)
      const startOfDay = new Date(selectedDate)
      startOfDay.setHours(0, 0, 0, 0)
      
      const endOfDay = new Date(selectedDate)
      endOfDay.setHours(23, 59, 59, 999)

      whereClause.date = {
        gte: startOfDay,
        lte: endOfDay
      }
    }

    const appointments = await prisma.appointment.findMany({
      where: whereClause,
      include: {
        client: {
          select: {
            name: true,
            email: true
          }
        },
        service: {
          select: {
            name: true,
            price: true,
            duration: true
          }
        }
      },
      orderBy: {
        date: 'asc'
      }
    })

    return NextResponse.json({ 
      success: true, 
      appointments 
    })

  } catch (error) {
    console.error('Erro ao buscar agendamentos do barbeiro:', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}