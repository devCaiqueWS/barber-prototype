import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// GET - Listar serviços (admin)
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const category = searchParams.get('category')
    const isActive = searchParams.get('isActive')

    const services = await prisma.service.findMany({
      where: {
        ...(category ? { category } : {}),
        ...(isActive !== null ? { isActive: isActive === 'true' } : {}),
      },
      select: {
        id: true,
        name: true,
        description: true,
        price: true,
        duration: true,
        category: true,
        isActive: true,
        createdAt: true,
        _count: {
          select: {
            appointments: true,
          },
        },
      },
      orderBy: {
        name: 'asc',
      },
    })

    return NextResponse.json({ success: true, services })
  } catch (error) {
    console.error('Erro ao buscar serviços (admin):', error)
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 })
  }
}

// POST - Criar novo serviço (admin)
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const {
      name,
      description,
      price,
      duration,
      category,
      isActive: isActiveFromBody,
      active,
    } = body as {
      name?: string
      description?: string
      price?: number | string
      duration?: number | string
      category?: string
      isActive?: boolean
      active?: boolean
    }

    let isActive = isActiveFromBody

    // Permitir alias "active" vindo de componentes antigos
    if (typeof isActive === 'undefined' && typeof active !== 'undefined') {
      isActive = !!active
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
        category: true,
        isActive: true,
        createdAt: true,
        _count: {
          select: {
            appointments: true,
          },
        },
      },
    })

    return NextResponse.json({ success: true, service }, { status: 201 })
  } catch (error) {
    console.error('Erro ao criar serviço (admin):', error)
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 })
  }
}
