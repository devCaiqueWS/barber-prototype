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
    const dateStr = startOfDay.toISOString().split('T')[0];
    const existingAppointments = await prisma.appointment.findMany({
      where: {
        barberId,
        date: dateStr,
        NOT: { status: 'cancelled' }
      },
      include: {
        service: {
          select: {
            duration: true
          }
        }
      }
    })

    // Buscar configuracoes do barbeiro
    const barber = await prisma.user.findUnique({
      where: { id: barberId },
      select: { workStartTime: true, workEndTime: true, workDays: true }
    })

    const parseHHMM = (hhmm?: string | null) => {
      if (!hhmm) return null
      const [h, m] = hhmm.split(':').map(n => parseInt(n, 10))
      return { h, m }
    }

    const defaultStart = parseHHMM(barber?.workStartTime) ?? { h: 9, m: 0 }
    const defaultEnd = parseHHMM(barber?.workEndTime) ?? { h: 18, m: 0 }
    const slotDuration = 30 // 30 minutos

    const weekdayNames = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday']
    const weekday = weekdayNames[selectedDate.getDay()]

    // Overrides do dia
    const override = await prisma.barberAvailability.findUnique({
      where: { barberId_date: { barberId, date: dateStr } }
    })

    if (override?.isDayBlocked) {
      return NextResponse.json({ success: true, availableTimes: [] })
    }

    const baseSlots: string[] = []

    const generateSlots = (start: {h:number;m:number}, end: {h:number;m:number}) => {
      const slots: string[] = []
      const startMinutes = start.h * 60 + start.m
      const endMinutes = end.h * 60 + end.m
      for (let t = startMinutes; t < endMinutes; t += slotDuration) {
        const h = Math.floor(t / 60).toString().padStart(2, '0')
        const m = (t % 60).toString().padStart(2, '0')
        slots.push(`${h}:${m}`)
      }
      return slots
    }

    if (override && override.availableSlots.length > 0) {
      baseSlots.push(...override.availableSlots)
    } else {
      // Se dia não está na escala do barbeiro e sem override explícito, sem horários
      if (barber?.workDays && barber.workDays.length > 0 && !barber.workDays.includes(weekday)) {
        return NextResponse.json({ success: true, availableTimes: [] })
      }
      baseSlots.push(...generateSlots(defaultStart, defaultEnd))
    }

    // Aplicar bloqueios específicos
    const blocked = new Set((override?.blockedSlots ?? []).map(s => s.trim()))

    const now = new Date()
    const minStart = new Date(now.getTime() + 30 * 60 * 1000) // 30 min adiante

    const isSameDay = new Date().toISOString().split('T')[0] === dateStr

    const availableSlots: string[] = []
    for (const slot of baseSlots) {
      if (blocked.has(slot)) continue

      const [hours, minutes] = slot.split(':').map(n => parseInt(n, 10))
      const slotTime = new Date(selectedDate)
      slotTime.setHours(hours, minutes, 0, 0)

      if (isSameDay && slotTime <= minStart) continue

      const slotEnd = new Date(slotTime.getTime() + duration * 60 * 1000)

      // Conflito com agendamentos existentes
      const hasConflict = existingAppointments.some(appt => {
        const [ah, am] = (appt.startTime || '00:00').split(':').map(n => parseInt(n,10))
        const apptStart = new Date(selectedDate)
        apptStart.setHours(ah, am, 0, 0)
        const apptDuration = appt.service?.duration ?? 30
        const apptEnd = new Date(apptStart.getTime() + apptDuration * 60 * 1000)
        return (
          (slotTime >= apptStart && slotTime < apptEnd) ||
          (slotEnd > apptStart && slotEnd <= apptEnd) ||
          (slotTime <= apptStart && slotEnd >= apptEnd)
        )
      })

      if (!hasConflict) availableSlots.push(slot)
    }

    return NextResponse.json({ success: true, availableTimes: availableSlots })
  } catch (error) {
    console.error('Erro ao buscar horários disponíveis:', error)
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 })
  }
}
