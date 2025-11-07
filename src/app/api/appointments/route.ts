import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import bcrypt from 'bcryptjs'

// POST - Criar novo agendamento
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
      paymentMethod,
      payOnline,
      notes
    } = body

    // Construir dateTime se date e time foram fornecidos separadamente
    let appointmentDateTime: Date
    if (dateTime) {
      appointmentDateTime = new Date(dateTime)
    } else if (date && time) {
      const [hours, minutes] = time.split(':')
      appointmentDateTime = new Date(date)
      appointmentDateTime.setHours(parseInt(hours), parseInt(minutes), 0, 0)
    } else {
      return NextResponse.json(
        { error: 'Data e horário são obrigatórios' },
        { status: 400 }
      )
    }

    // Validar dados obrigatórios
    if (!clientName || !clientEmail || !clientPhone || !serviceId || !barberId) {
      return NextResponse.json(
        { error: 'Todos os campos são obrigatórios' },
        { status: 400 }
      )
    }

    // Verificar se o horário ainda está disponível
    const appointmentDateStr = appointmentDateTime.toISOString().split('T')[0];
    const existingAppointment = await prisma.appointment.findFirst({
      where: {
        barberId,
        date: appointmentDateStr,
        status: {
          not: 'CANCELLED'
        }
      }
    })

    if (existingAppointment) {
      return NextResponse.json(
        { error: 'Horário não está mais disponível' },
        { status: 400 }
      )
    }

    // Verificar se o cliente já existe ou criar novo
    let client = await prisma.user.findUnique({
      where: { email: clientEmail }
    })

    if (!client) {
      // Criar novo cliente
      const defaultPassword = await bcrypt.hash('123456', 10) // Senha padrão
      
      client = await prisma.user.create({
        data: {
          name: clientName,
          email: clientEmail,
          password: defaultPassword,
          role: 'CLIENT'
        }
      })
    } else {
      // Atualizar dados do cliente se necessário
      await prisma.user.update({
        where: { id: client.id },
        data: {
          name: clientName,
        }
      })
    }

    // Criar agendamento
    const appointment = await prisma.appointment.create({
      data: {
        clientId: client.id,
        barberId,
        serviceId,
        date: appointmentDateStr,
        startTime: time || appointmentDateTime.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
        endTime: time || appointmentDateTime.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
        clientName: clientName,
        clientEmail: clientEmail,
        clientPhone: clientPhone || '',
        paymentMethod: 'Dinheiro',
        status: 'confirmed',
        source: 'online',
      },
      include: {
        client: {
          select: {
            name: true,
            email: true,
          }
        },
        barber: {
          select: {
            name: true
          }
        },
        service: {
          select: {
            name: true,
            price: true,
            duration: true
          }
        }
      }
    })

    return NextResponse.json({
      success: true,
      appointment: {
        id: appointment.id,
        date: appointment.date,
        status: appointment.status,
        client: appointment.client,
        barber: appointment.barber,
        service: appointment.service
      },
      message: 'Agendamento criado com sucesso!'
    }, { status: 201 })

  } catch (error) {
    console.error('Erro ao criar agendamento:', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}
