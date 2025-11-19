import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// Helper para validar sessão do barbeiro
async function getBarberSession() {
  const session = await getServerSession(authOptions)
  const role = (session?.user as { role?: string })?.role
  const id = (session?.user as { id?: string })?.id

  if (!session || !id || (role !== 'BARBER' && role !== 'barber')) {
    return null
  }

  return { session, barberId: id }
}

// GET - Buscar agendamentos do barbeiro
export async function GET(request: NextRequest) {
  try {
    const auth = await getBarberSession()
    if (!auth) {
      return NextResponse.json({ error: 'Acesso negado' }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const date = searchParams.get('date')

    const whereClause: Record<string, unknown> = {
      barberId: auth.barberId,
      status: {
        not: 'CANCELLED',
      },
    }

    if (date) {
      whereClause.date = date
    }

    const appointments = await prisma.appointment.findMany({
      where: whereClause,
      include: {
        client: {
          select: {
            name: true,
            email: true,
            phone: true,
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
      orderBy: {
        date: 'asc',
      },
    })

    return NextResponse.json({
      success: true,
      appointments,
    })
  } catch (error) {
    console.error('Erro ao buscar agendamentos do barbeiro:', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 },
    )
  }
}

// POST - Criar agendamento manual pelo barbeiro
export async function POST(request: NextRequest) {
  try {
    const auth = await getBarberSession()
    if (!auth) {
      return NextResponse.json({ error: 'Acesso negado' }, { status: 403 })
    }

    const body = await request.json()
    const {
      serviceId,
      date,
      time,
      clientName,
      clientEmail,
      clientPhone,
      notes,
      status,
    } = body as {
      serviceId?: string
      date?: string
      time?: string
      clientName?: string
      clientEmail?: string
      clientPhone?: string
      notes?: string
      status?: string
    }

    if (!serviceId || !date || !time) {
      return NextResponse.json(
        { error: 'serviceId, date e time são obrigatórios' },
        { status: 400 },
      )
    }

    const service = await prisma.service.findUnique({
      where: { id: serviceId },
    })
    if (!service) {
      return NextResponse.json(
        { error: 'Serviço não encontrado' },
        { status: 404 },
      )
    }

    const [h, m] = time.split(':').map((n: string) => parseInt(n, 10))
    const startDT = new Date(date)
    startDT.setHours(h, m, 0, 0)
    const endDT = new Date(
      startDT.getTime() + (service.duration || 30) * 60 * 1000,
    )
    const endTime = `${endDT.getHours().toString().padStart(2, '0')}:${endDT
      .getMinutes()
      .toString()
      .padStart(2, '0')}`

    const existing = await prisma.appointment.findMany({
      where: { barberId: auth.barberId, date },
      select: {
        startTime: true,
        service: { select: { duration: true } },
      },
    })

    const hasConflict = existing.some((appt) => {
      const [ah, am] = (appt.startTime || '00:00')
        .split(':')
        .map((n) => parseInt(n, 10))
      const apptStart = new Date(date)
      apptStart.setHours(ah, am, 0, 0)
      const apptDur = appt.service?.duration ?? 30
      const apptEnd = new Date(apptStart.getTime() + apptDur * 60 * 1000)
      return startDT < apptEnd && endDT > apptStart
    })

    if (hasConflict) {
      return NextResponse.json(
        { error: 'Horário já ocupado' },
        { status: 400 },
      )
    }

    const email =
      clientEmail && String(clientEmail).trim().length > 0
        ? String(clientEmail)
        : `walkin+${Date.now()}@local`

    let client = await prisma.user.findUnique({ where: { email } })
    if (!client) {
      client = await prisma.user.create({
        data: {
          name: clientName || 'Walk-in',
          email,
          password: 'manual',
          role: 'CLIENT',
          phone: clientPhone || '',
        },
      })
    }

    const appointment = await prisma.appointment.create({
      data: {
        clientId: client.id,
        barberId: auth.barberId,
        serviceId,
        date,
        startTime: time,
        endTime,
        clientName: clientName || client.name || 'Walk-in',
        clientEmail: email,
        clientPhone: clientPhone || '',
        paymentMethod: 'Dinheiro',
        status: status || 'confirmed',
        notes,
        source: 'manual',
      },
      include: {
        client: { select: { name: true, email: true } },
        barber: { select: { name: true } },
        service: { select: { name: true, price: true, duration: true } },
      },
    })

    return NextResponse.json({ success: true, appointment }, { status: 201 })
  } catch (error) {
    console.error('Erro ao criar agendamento (barber):', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 },
    )
  }
}
