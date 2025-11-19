import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// GET - Buscar serviços disponíveis (público)
export async function GET() {
  try {
    const services = await prisma.service.findMany({
      where: {
        isActive: true,
      },
      select: {
        id: true,
        name: true,
        description: true,
        price: true,
        duration: true,
      },
      orderBy: {
        name: 'asc',
      },
    })

    const servicesWithDescription = services.map((service) => ({
      ...service,
      description:
        service.description ||
        `Serviço de ${service.name.toLowerCase()}`,
    }))

    return NextResponse.json({
      success: true,
      services: servicesWithDescription,
    })
  } catch (error) {
    console.error('Erro ao buscar serviços:', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 },
    )
  }
}

// POST - Criar serviço (público / API externa)
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const {
      name,
      description,
      price,
      duration,
      category,
      isActive,
    } = body as {
      name?: string
      description?: string
      price?: number | string
      duration?: number | string
      category?: string
      isActive?: boolean
    }

    const priceNumber =
      typeof price === 'string' ? parseFloat(price) : price
    const durationNumber =
      typeof duration === 'string' ? parseInt(duration, 10) : duration

    if (!name || !priceNumber || !durationNumber) {
      return NextResponse.json(
        { error: 'Nome, preço e duração são obrigatórios' },
        { status: 400 },
      )
    }

    const service = await prisma.service.create({
      data: {
        name,
        description: description || null,
        price: priceNumber,
        duration: durationNumber,
        category: category || null,
        isActive: typeof isActive === 'boolean' ? isActive : true,
      },
      select: {
        id: true,
        name: true,
        description: true,
        price: true,
        duration: true,
      },
    })

    return NextResponse.json(
      { success: true, service },
      { status: 201 },
    )
  } catch (error) {
    console.error('Erro ao criar serviço:', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 },
    )
  }
}

