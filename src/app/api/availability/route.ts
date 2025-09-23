import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// GET - Buscar horários disponíveis
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const barberId = searchParams.get('barberId')
    const date = searchParams.get('date')
    const duration = parseInt(searchParams.get('duration') || '30')

    if (!barberId || !date) {
      return NextResponse.json(
        { error: 'barberId e date são obrigatórios' },
        { status: 400 }
      )
    }

    // Converter data string para Date
    const selectedDate = new Date(date)
    const startOfDay = new Date(selectedDate)
    startOfDay.setHours(0, 0, 0, 0)
    
    const endOfDay = new Date(selectedDate)
    endOfDay.setHours(23, 59, 59, 999)

    // Buscar agendamentos existentes do barbeiro na data
    const existingAppointments = await prisma.appointment.findMany({
      where: {
        barberId,
        date: {
          gte: startOfDay,
          lte: endOfDay
        },
        status: {
          not: 'CANCELLED'
        }
      },
      include: {
        service: {
          select: {
            duration: true
          }
        }
      }
    })

    // Gerar horários disponíveis (9h às 18h)
    const availableSlots = []
    const workStart = 9 // 9:00
    const workEnd = 18 // 18:00
    const slotDuration = 30 // 30 minutos

    for (let hour = workStart; hour < workEnd; hour++) {
      for (let minute = 0; minute < 60; minute += slotDuration) {
        const slotTime = new Date(selectedDate)
        slotTime.setHours(hour, minute, 0, 0)

        // Verificar se é no futuro (pelo menos 30 minutos à frente para desenvolvimento)
        const now = new Date()
        const thirtyMinutesFromNow = new Date(now.getTime() + 30 * 60 * 1000) // Reduzido para 30 min para teste
        
        if (slotTime <= thirtyMinutesFromNow) {
          continue
        }

        // Verificar se não conflita com agendamentos existentes
  const hasConflict = existingAppointments.some((appointment: {
            date: Date | string;
            service?: { duration?: number | null };
          }) => {
          const appointmentStart = new Date(appointment.date)
          const appointmentEnd = new Date(appointmentStart.getTime() + (appointment.service?.duration || 30) * 60 * 1000)
          const slotEnd = new Date(slotTime.getTime() + duration * 60 * 1000)

          return (
            (slotTime >= appointmentStart && slotTime < appointmentEnd) ||
            (slotEnd > appointmentStart && slotEnd <= appointmentEnd) ||
            (slotTime <= appointmentStart && slotEnd >= appointmentEnd)
          )
        })

        if (!hasConflict) {
          const timeSlot = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`
          availableSlots.push(timeSlot)
        }
      }
    }

    return NextResponse.json({ success: true, availableTimes: availableSlots })
  } catch (error) {
    console.error('Erro ao buscar horários disponíveis:', error)
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 })
  }
}
