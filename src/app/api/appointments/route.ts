import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { formatDateKey, parseDateOnly } from '@/lib/date'
import { resolveSiteUrl } from '@/lib/business'
import { sendAppointmentConfirmationEmail } from '@/lib/appointment-email'
import { getAuthUser } from '@/lib/client-auth'

// Normaliza objeto Date para string HH:mm
const toHHMM = (date: Date) => {
  const h = date.getHours().toString().padStart(2, '0')
  const m = date.getMinutes().toString().padStart(2, '0')
  return `${h}:${m}`
}

// POST - Criar novo agendamento (requer conta de cliente logada)
export async function POST(request: NextRequest) {
  try {
    const authUser = await getAuthUser(request)

    if (!authUser) {
      return NextResponse.json(
        { error: 'É necessário estar logado para agendar. Crie sua conta ou faça login.', needsAuth: true },
        { status: 401 },
      )
    }

    const body = await request.json()
    const {
      clientInstagram,
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
      clientInstagram?: string
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

    // Identidade sempre vem da conta logada
    const clientName = authUser.name || ''
    const clientEmail = authUser.email
    const whatsapp = clientWhatsapp || authUser.whatsapp || authUser.phone || ''

    if (!clientName || !whatsapp || !serviceId || !barberId) {
      return NextResponse.json(
        { error: 'WhatsApp, serviço e barbeiro são obrigatórios.' },
        { status: 400 },
      )
    }

    const contactPhone = whatsapp
    const instagram = clientInstagram?.trim()
    const appointmentNotes = [instagram ? `Instagram: ${instagram}` : null, notes]
      .filter(Boolean)
      .join('\n')

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
      const d = parseDateOnly(date)
      if (!d || !Number.isFinite(d.getTime())) {
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

    const appointmentDateStr = formatDateKey(appointmentDateTime)
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
        status: { notIn: ['cancelled', 'no_show'] },
      },
      include: {
        service: { select: { duration: true } },
      },
    })

    const hasConflict = existingAppointments.some((appt) => {
      const [ah, am] = (appt.startTime || '00:00')
        .split(':')
        .map((n) => Number.parseInt(n, 10))
      const apptStart = parseDateOnly(appointmentDateStr) || new Date(appointmentDateStr)
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

    // Atualizar o contato da conta se o cliente informou um WhatsApp novo
    if (whatsapp && whatsapp !== authUser.whatsapp) {
      await prisma.user.update({
        where: { id: authUser.id },
        data: { whatsapp, phone: contactPhone },
      })
    }

    const normalizedPaymentMethod =
      paymentMethod && paymentMethod.length > 0 ? paymentMethod : 'Dinheiro'
    const isPayOnline = Boolean(payOnline)

    const appointment = await prisma.appointment.create({
      data: {
        clientId: authUser.id,
        barberId,
        serviceId,
        date: appointmentDateStr,
        startTime,
        endTime,
        clientName,
        clientEmail,
        clientPhone: contactPhone || '',
        clientWhatsapp: whatsapp || '',
        paymentMethod: normalizedPaymentMethod,
        payOnline: isPayOnline,
        status: isPayOnline ? 'pending' : 'confirmed',
        notes: appointmentNotes || undefined,
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

    // Confirmação por e-mail com o arquivo .ics anexado.
    // Uma falha aqui nunca invalida o agendamento já criado.
    let emailSent = false
    try {
      const result = await sendAppointmentConfirmationEmail({
        id: appointment.id,
        clientName: appointment.clientName,
        clientEmail: appointment.clientEmail,
        date: appointment.date,
        startTime: appointment.startTime,
        endTime: appointment.endTime,
        status: appointment.status,
        payOnline: appointment.payOnline,
        paymentMethod: appointment.paymentMethod,
        serviceName: appointment.service?.name,
        servicePrice: appointment.service?.price,
        serviceDuration: appointment.service?.duration,
        barberName: appointment.barber?.name,
        siteUrl: resolveSiteUrl(request),
      })

      emailSent = result.sent

      if (!result.sent) {
        console.warn(
          `[appointments] Confirmação não enviada para ${appointment.id}:`,
          result.skipped || result.error,
        )
      }
    } catch (emailError) {
      console.error('Erro ao enviar e-mail de confirmação:', emailError)
    }

    return NextResponse.json(
      {
        success: true,
        emailSent,
        appointment: {
          id: appointment.id,
          date: appointment.date,
          startTime: appointment.startTime,
          endTime: appointment.endTime,
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

