import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// GET - Gerar relatórios
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const type = searchParams.get('type')
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')
    const barberId = searchParams.get('barberId')

    const start = startDate ? new Date(startDate) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) // 30 dias atrás
    const end = endDate ? new Date(endDate) : new Date()

    switch (type) {
      case 'appointments':
        return await generateAppointmentsReport(start, end, barberId)
      case 'revenue':
        return await generateRevenueReport(start, end, barberId)
      case 'barbers':
        return await generateBarbersReport(start, end)
      case 'services':
        return await generateServicesReport(start, end)
      default:
        return await generateGeneralReport(start, end)
    }
  } catch (error) {
    console.error('Erro ao gerar relatório:', error)
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 })
  }
}

async function generateAppointmentsReport(startDate: Date, endDate: Date, barberId?: string | null) {
  const appointments = await prisma.appointment.findMany({
    where: {
      date: {
        gte: startDate,
        lte: endDate
      },
      ...(barberId && { barberId })
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
    },
    orderBy: {
      date: 'desc'
    }
  })

  const stats = {
    total: appointments.length,
    confirmed: appointments.filter((a: typeof appointments[number]) => a.status === 'confirmed').length,
    cancelled: appointments.filter((a: typeof appointments[number]) => a.status === 'canceled').length,
    completed: appointments.filter((a: typeof appointments[number]) => a.status === 'completed').length,
    totalRevenue: appointments
      .filter((a: typeof appointments[number]) => a.status === 'completed')
      .reduce((sum: number, a: typeof appointments[number]) => sum + (a.service?.price || 0), 0)
  }

  return NextResponse.json({
    type: 'appointments',
    period: { startDate, endDate },
    stats,
    data: appointments
  })
}

async function generateRevenueReport(startDate: Date, endDate: Date, barberId?: string | null) {
  const appointments = await prisma.appointment.findMany({
    where: {
      date: {
        gte: startDate,
        lte: endDate
      },
      status: 'completed',
      ...(barberId && { barberId })
    },
    include: {
      service: {
        select: {
          name: true,
          price: true,
        }
      },
      barber: {
        select: {
          name: true
        }
      }
    }
  })

  const totalRevenue = appointments.reduce((sum: number, a: typeof appointments[number]) => sum + (a.service?.price || 0), 0)
  
  const revenueByService = appointments.reduce((acc: Record<string, { count: number; revenue: number }>, appointment: typeof appointments[number]) => {
    const serviceName = appointment.service?.name || 'Não informado'
    const price = appointment.service?.price || 0
    
    if (!acc[serviceName]) {
      acc[serviceName] = { count: 0, revenue: 0 }
    }
    
    acc[serviceName].count += 1
    acc[serviceName].revenue += price
    
    return acc
  }, {} as Record<string, { count: number; revenue: number }>)
  
  const revenueByBarber = appointments.reduce((acc: Record<string, { count: number; revenue: number }>, appointment: typeof appointments[number]) => {
    const barberName = appointment.barber?.name || 'Não informado'
    const price = appointment.service?.price || 0
    
    if (!acc[barberName]) {
      acc[barberName] = { count: 0, revenue: 0 }
    }
    
    acc[barberName].count += 1
    acc[barberName].revenue += price
    
    return acc
  }, {} as Record<string, { count: number; revenue: number }>)

  return NextResponse.json({
    type: 'revenue',
    period: { startDate, endDate },
    stats: {
      totalRevenue,
      totalAppointments: appointments.length,
      averageTicket: appointments.length > 0 ? totalRevenue / appointments.length : 0
    },
    revenueByService,
    revenueByBarber,
    data: appointments
  })
}

async function generateBarbersReport(startDate: Date, endDate: Date) {
  const barbers = await prisma.user.findMany({
    where: {
      role: 'barber'
    },
    include: {
      barberAppointments: {
        where: {
          date: {
            gte: startDate,
            lte: endDate
          }
        },
        include: {
          service: {
            select: {
              price: true
            }
          }
        }
      }
    }
  })
  
  const barbersStats = barbers.map((barber: typeof barbers[number]) => {
    const appointments = barber.barberAppointments
    const completedAppointments = appointments.filter((a: typeof appointments[number]) => a.status === 'completed')
    const revenue = completedAppointments.reduce((sum: number, a: typeof completedAppointments[number]) => sum + (a.service?.price || 0), 0)
    
    return {
      id: barber.id,
      name: barber.name,
      email: barber.email,
      totalAppointments: appointments.length,
      completedAppointments: completedAppointments.length,
      cancelledAppointments: appointments.filter((a: typeof appointments[number]) => a.status === 'canceled').length,
      revenue,
      averageTicket: completedAppointments.length > 0 ? revenue / completedAppointments.length : 0
    }
  })

  return NextResponse.json({
    type: 'barbers',
    period: { startDate, endDate },
    data: barbersStats
  })
}

async function generateServicesReport(startDate: Date, endDate: Date) {
  const services = await prisma.service.findMany({
    include: {
      appointments: {
        where: {
          date: {
            gte: startDate,
            lte: endDate
          }
        }
      }
    }
  })
  
  const servicesStats = services.map((service: typeof services[number]) => {
    const appointments = service.appointments
    const completedAppointments = appointments.filter((a: typeof appointments[number]) => a.status === 'completed')
    
    return {
      id: service.id,
      name: service.name,
      price: service.price,
      duration: service.duration,
      active: service.active,
      totalAppointments: appointments.length,
      completedAppointments: completedAppointments.length,
      revenue: completedAppointments.length * service.price
    }
  })

  return NextResponse.json({
    type: 'services',
    period: { startDate, endDate },
    data: servicesStats
  })
}

async function generateGeneralReport(startDate: Date, endDate: Date) {
  const appointments = await prisma.appointment.count({
    where: {
      date: {
        gte: startDate,
        lte: endDate
      }
    }
  })
  
  const completedAppointments = await prisma.appointment.findMany({
    where: {
      date: {
        gte: startDate,
        lte: endDate
      },
      status: 'completed'
    },
    include: {
      service: {
        select: { price: true }
      }
    }
  })
  
  const revenue = completedAppointments.reduce(
    (sum: number, a: typeof completedAppointments[number]) => sum + (a.service?.price || 0),
    0
  )
  
  const clients = await prisma.user.count({
    where: {
      role: 'client',
      createdAt: {
        gte: startDate,
        lte: endDate
      }
    }
  })
  
  const barbers = await prisma.user.count({
    where: {
      role: 'barber'
    }
  })
  
  const services = await prisma.service.count({
    where: {
      active: true
    }
  })
  
  return NextResponse.json({
    type: 'general',
    period: { startDate, endDate },
    stats: {
      totalAppointments: appointments,
      completedAppointments: completedAppointments.length,
      totalRevenue: revenue,
      newClients: clients,
      activeBarbers: barbers,
      activeServices: services,
      averageTicket: completedAppointments.length > 0 ? revenue / completedAppointments.length : 0
    }
  })
}
