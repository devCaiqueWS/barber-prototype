import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import bcrypt from 'bcryptjs'

// Normaliza objeto Date para string HH:mm
const toHHMM = (date: Date) => {
  const h = date.getHours().toString().padStart(2, '0')
  const m = date.getMinutes().toString().padStart(2, '0')
  return `${h}:${m}`
}

// POST - Criar novo agendamento (público)
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const {
      clientName,
      clientEmail,
      clientPhone,
      clientWhatsapp,
      serviceId,
      barberId,
      date,
      time,
      dateTime,
      notes,
      paymentMethod,
      payOnline,
    } = body as {
      clientName?: string
      clientEmail?: string
      clientPhone?: string
      clientWhatsapp?: string
      serviceId?: string
      barberId?: string
      date?: string
      time?: string
      dateTime?: string
      notes?: string
      paymentMethod?: string
      payOnline?: boolean
    }

    if (!clientName || !clientEmail || !clientPhone || !serviceId || !barberId) {
      return NextResponse.json(
        { error: 'Nome, e-mail, telefone, serviço e barbeiro são obrigatórios.' },
        { status: 400 },
      )
    }

    // Construir Date a partir de date+time ou dateTime
    let appointmentDateTime: Date | null = null
    if (dateTime) {
      const parsed = new Date(dateTime)
      if (!Number.isFinite(parsed.getTime())) {
        return NextResponse.json(
          { error: 'Data/hora inválida.' },
          { status: 400 },
        )
      }
      appointmentDateTime = parsed
    } else if (date && time) {
      const [hours, minutes] = time.split(':')
      const d = new Date(date)
      if (!Number.isFinite(d.getTime())) {
        return NextResponse.json(
          { error: 'Data inválida.' },
          { status: 400 },
        )
      }
      d.setHours(Number.parseInt(hours, 10), Number.parseInt(minutes, 10), 0, 0)
      appointmentDateTime = d
    } else {
      return NextResponse.json(
        { error: 'Data e horário são obrigatórios.' },
        { status: 400 },
      )
    }

    const appointmentDateStr = appointmentDateTime.toISOString().split('T')[0]
    const startTime = toHHMM(appointmentDateTime)

    // Carregar serviço para obter duração
    const service = await prisma.service.findUnique({
      where: { id: serviceId },
      select: { duration: true, name: true, price: true },
    })

    if (!service) {
      return NextResponse.json(
        { error: 'Serviço não encontrado.' },
        { status: 404 },
      )
    }

    const durationMinutes = service.duration || 30
    const startDT = new Date(appointmentDateTime)
    const endDT = new Date(startDT.getTime() + durationMinutes * 60 * 1000)
    const endTime = toHHMM(endDT)

    // Verificar conflitos de horário com base na duração real dos serviços
    const existingAppointments = await prisma.appointment.findMany({
      where: {
        barberId,
        date: appointmentDateStr,
        NOT: { status: 'cancelled' },
      },
      include: {
        service: { select: { duration: true } },
      },
    })

    const hasConflict = existingAppointments.some((appt) => {
      const [ah, am] = (appt.startTime || '00:00')
        .split(':')
        .map((n) => Number.parseInt(n, 10))
      const apptStart = new Date(appointmentDateStr)
      apptStart.setHours(ah, am, 0, 0)
      const apptDur = appt.service?.duration ?? 30
      const apptEnd = new Date(apptStart.getTime() + apptDur * 60 * 1000)
      return startDT < apptEnd && endDT > apptStart
    })

    if (hasConflict) {
      return NextResponse.json(
        { error: 'Horário não está mais disponível.' },
        { status: 409 },
      )
    }

    // Respeitar bloqueios da agenda do barbeiro
    const override = await prisma.barberAvailability.findUnique({
      where: { barberId_date: { barberId, date: appointmentDateStr } },
    })

    if (override?.isDayBlocked) {
      return NextResponse.json(
        { error: 'Dia bloqueado para atendimento.' },
        { status: 409 },
      )
    }

    if (override && override.availableSlots.length > 0) {
      const allowedSet = new Set(override.availableSlots.map((s) => s.trim()))
      if (!allowedSet.has(startTime)) {
        return NextResponse.json(
          { error: 'Horário não permitido para este dia.' },
          { status: 409 },
        )
      }
    }

    if (override && override.blockedSlots.length > 0) {
      const blockedSet = new Set(override.blockedSlots.map((s) => s.trim()))
      if (blockedSet.has(startTime)) {
        return NextResponse.json(
          { error: 'Horário bloqueado na agenda do barbeiro.' },
          { status: 409 },
        )
      }
    }

    // Verificar se o cliente já existe ou criar
    let client = await prisma.user.findUnique({
      where: { email: clientEmail },
    })

    if (!client) {
      const defaultPassword = await bcrypt.hash('123456', 10)

      client = await prisma.user.create({
        data: {
          name: clientName,
          email: clientEmail,
          password: defaultPassword,
          role: 'CLIENT',
          phone: clientPhone,
        },
      })
    } else if (client.name !== clientName) {
      await prisma.user.update({
        where: { id: client.id },
        data: { name: clientName },
      })
    }

    const normalizedPaymentMethod =
      paymentMethod && paymentMethod.length > 0 ? paymentMethod : 'Dinheiro'
    const isPayOnline = Boolean(payOnline)

    const appointment = await prisma.appointment.create({
      data: {
        clientId: client.id,
        barberId,
        serviceId,
        date: appointmentDateStr,
        startTime,
        endTime,
        clientName,
        clientEmail,
        clientPhone: clientPhone || '',
        clientWhatsapp: clientWhatsapp || '',
        paymentMethod: normalizedPaymentMethod,
        payOnline: isPayOnline,
        status: isPayOnline ? 'pending' : 'confirmed',
        notes,
        source: 'online',
      },
      include: {
        client: {
          select: {
            name: true,
            email: true,
          },
        },
        barber: {
          select: {
            name: true,
          },
        },
        service: {
          select: {
            name: true,
            price: true,
            duration: true,
          },
        },
      },
    })

    return NextResponse.json(
      {
        success: true,
        appointment: {
          id: appointment.id,
          date: appointment.date,
          status: appointment.status,
          payOnline: appointment.payOnline,
          paymentMethod: appointment.paymentMethod,
          client: appointment.client,
          barber: appointment.barber,
          service: appointment.service,
        },
        message: 'Agendamento criado com sucesso!',
      },
      { status: 201 },
    )
  } catch (error) {
    console.error('Erro ao criar agendamento:', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 },
    )
  }
}

