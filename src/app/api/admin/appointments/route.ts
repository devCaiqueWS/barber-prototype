import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '10')
    const status = searchParams.get('status')
    const date = searchParams.get('date')

    const skip = (page - 1) * limit

  const where: Record<string, unknown> = {}
    
    if (status) {
      where.status = status
    }
    
    if (date) {
      where.date = date
    }

    const appointments = await prisma.appointment.findMany({
      where,
      include: {
        client: {
          select: {
            id: true,
            name: true,
            email: true,
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
      orderBy: [
        { date: 'asc' },
      ],
      skip,
      take: limit,
    })

    const total = await prisma.appointment.count({ where })

    return NextResponse.json({
      appointments,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    })
  } catch (error) {
    console.error('Erro ao buscar agendamentos:', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { serviceId, barberId, date, time, clientName, clientEmail, clientPhone, notes, status } = body as any

    if (!serviceId || !barberId || !date || !time) {
      return NextResponse.json({ error: 'serviceId, barberId, date e time são obrigatórios' }, { status: 400 })
    }

    const service = await prisma.service.findUnique({ where: { id: serviceId } })
    if (!service) {
      return NextResponse.json({ error: 'Serviço não encontrado' }, { status: 404 })
    }

    // Calcular fim pelo tempo do serviço
    const [h, m] = (time as string).split(':').map((n: string) => parseInt(n, 10))
    const startDT = new Date(date)
    startDT.setHours(h, m, 0, 0)
    const endDT = new Date(startDT.getTime() + (service.duration || 30) * 60 * 1000)
    const endTime = `${endDT.getHours().toString().padStart(2, '0')}:${endDT.getMinutes().toString().padStart(2, '0')}`

    // Conflitos no mesmo dia para o barbeiro
    const existing = await prisma.appointment.findMany({
      where: { barberId, date },
      select: { startTime: true, service: { select: { duration: true } } }
    })
    const hasConflict = existing.some(appt => {
      const [ah, am] = (appt.startTime || '00:00').split(':').map(n => parseInt(n,10))
      const apptStart = new Date(date)
      apptStart.setHours(ah, am, 0, 0)
      const apptDur = appt.service?.duration ?? 30
      const apptEnd = new Date(apptStart.getTime() + apptDur * 60 * 1000)
      return (startDT < apptEnd && endDT > apptStart)
    })
    if (hasConflict) {
      return NextResponse.json({ error: 'Horário já ocupado' }, { status: 400 })
    }

    // Resolver cliente (permite walk-in sem email: gera placeholder)
    const email = clientEmail && String(clientEmail).trim().length > 0
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
          phone: clientPhone || ''
        }
      })
    }

    const appointment = await prisma.appointment.create({
      data: {
        clientId: client.id,
        barberId,
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
        source: 'manual'
      },
      include: {
        client: { select: { name: true, email: true } },
        barber: { select: { name: true } },
        service: { select: { name: true, price: true, duration: true } }
      }
    })

    return NextResponse.json({ success: true, appointment }, { status: 201 })
  } catch (error) {
    console.error('Erro ao criar agendamento (admin):', error)
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 })
  }
}
