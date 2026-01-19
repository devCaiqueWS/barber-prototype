import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { Prisma } from '@prisma/client'
import { parseDateOnly } from '@/lib/date'

// Helper para extrair o ID da URL em rotas dinâmicas
function getIdFromRequest(request: NextRequest): string | null {
  const segments = request.nextUrl.pathname.split('/').filter(Boolean)
  const last = segments[segments.length - 1]
  return last && last !== '[id]' ? last : null
}

// GET - Buscar agendamento por ID
export async function GET(request: NextRequest) {
  try {
    const id = getIdFromRequest(request)
    if (!id) {
      return NextResponse.json(
        { error: 'ID do agendamento é obrigatório' },
        { status: 400 },
      )
    }

    const appointment = await prisma.appointment.findUnique({
      where: { id },
      include: {
        client: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
          },
        },
        barber: {
          select: {
            id: true,
            name: true,
          },
        },
        service: {
          select: {
            id: true,
            name: true,
            duration: true,
            price: true,
          },
        },
      },
    })

    if (!appointment) {
      return NextResponse.json(
        { error: 'Agendamento não encontrado' },
        { status: 404 },
      )
    }

    return NextResponse.json({ appointment })
  } catch (error) {
    console.error('Erro ao buscar agendamento (admin):', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 },
    )
  }
}

// PATCH - Atualização parcial (ex.: status, observações)
export async function PATCH(request: NextRequest) {
  try {
    const id = getIdFromRequest(request)
    if (!id) {
      return NextResponse.json(
        { error: 'ID do agendamento é obrigatório' },
        { status: 400 },
      )
    }

    const body = await request.json()
    const { status, notes, paymentMethod } = body as {
      status?: string
      notes?: string
      paymentMethod?: string
    }

    if (!status && !notes && !paymentMethod) {
      return NextResponse.json(
        { error: 'Nenhum campo para atualização informado' },
        { status: 400 },
      )
    }

    const existing = await prisma.appointment.findUnique({ where: { id } })
    if (!existing) {
      return NextResponse.json(
        { error: 'Agendamento não encontrado' },
        { status: 404 },
      )
    }

    const updated = await prisma.appointment.update({
      where: { id },
      data: {
        ...(status ? { status } : {}),
        ...(typeof notes === 'string' ? { notes } : {}),
        ...(typeof paymentMethod === 'string' ? { paymentMethod } : {}),
      },
    })

    return NextResponse.json({ success: true, appointment: updated })
  } catch (error) {
    console.error('Erro ao atualizar agendamento (PATCH/admin):', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 },
    )
  }
}

// PUT - Atualização completa dos dados principais do agendamento
export async function PUT(request: NextRequest) {
  try {
    const id = getIdFromRequest(request)
    if (!id) {
      return NextResponse.json(
        { error: 'ID do agendamento é obrigatório' },
        { status: 400 },
      )
    }

    const body = await request.json()
    const {
      serviceId,
      barberId,
      date,
      time,
      clientName,
      clientEmail,
      clientPhone,
      notes,
      status,
      paymentMethod,
    } = body as {
      serviceId?: string
      barberId?: string
      date?: string
      time?: string
      clientName?: string
      clientEmail?: string
      clientPhone?: string
      notes?: string
      status?: string
      paymentMethod?: string
    }

    const existing = await prisma.appointment.findUnique({ where: { id } })
    if (!existing) {
      return NextResponse.json(
        { error: 'Agendamento não encontrado' },
        { status: 404 },
      )
    }

    const data: Prisma.AppointmentUncheckedUpdateInput = {}

    if (serviceId) data.serviceId = serviceId
    if (barberId) data.barberId = barberId
    if (typeof clientName === 'string') data.clientName = clientName
    if (typeof clientEmail === 'string') data.clientEmail = clientEmail
    if (typeof clientPhone === 'string') data.clientPhone = clientPhone
    if (typeof notes === 'string') data.notes = notes
    if (typeof status === 'string') data.status = status
    if (typeof paymentMethod === 'string') data.paymentMethod = paymentMethod
    if (date && time) {
      const baseDate = parseDateOnly(date) || new Date(date)
      if (!Number.isFinite(baseDate.getTime())) {
        return NextResponse.json(
          { error: 'Data invalida' },
          { status: 400 },
        )
      }
      const [h, m] = time.split(':').map((n) => Number.parseInt(n, 10))
      baseDate.setHours(h || 0, m || 0, 0, 0)

      const serviceLookupId = serviceId || existing.serviceId
      const service = serviceLookupId
        ? await prisma.service.findUnique({
            where: { id: serviceLookupId },
            select: { duration: true },
          })
        : null
      const durationMinutes = service?.duration ?? 30
      const endDT = new Date(baseDate.getTime() + durationMinutes * 60 * 1000)
      const endHours = endDT.getHours().toString().padStart(2, '0')
      const endMinutes = endDT.getMinutes().toString().padStart(2, '0')
      const endTime = endHours + ':' + endMinutes

      data.date = date
      data.startTime = time
      data.endTime = endTime
    }

    if (Object.keys(data).length === 0) {
      return NextResponse.json(
        { error: 'Nenhum campo para atualização informado' },
        { status: 400 },
      )
    }

    const updated = await prisma.appointment.update({
      where: { id },
      data,
    })

    return NextResponse.json({ success: true, appointment: updated })
  } catch (error) {
    console.error('Erro ao atualizar agendamento (PUT/admin):', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 },
    )
  }
}

// DELETE - Remover agendamento
export async function DELETE(request: NextRequest) {
  try {
    const id = getIdFromRequest(request)
    if (!id) {
      return NextResponse.json(
        { error: 'ID do agendamento é obrigatório' },
        { status: 400 },
      )
    }

    const existing = await prisma.appointment.findUnique({ where: { id } })
    if (!existing) {
      return NextResponse.json(
        { error: 'Agendamento não encontrado' },
        { status: 404 },
      )
    }

    await prisma.appointment.delete({ where: { id } })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Erro ao excluir agendamento (admin):', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 },
    )
  }
}
