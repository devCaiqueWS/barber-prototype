import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// GET - Listar serviços
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const category = searchParams.get('category')
    const isActive = searchParams.get('isActive')

    const services = await prisma.service.findMany({
      where: {
        ...(category && { category }),
        ...(isActive && { active: isActive === 'true' })
      },
      select: {
        id: true,
        name: true,
        price: true,
        duration: true,
        createdAt: true,
        _count: {
          select: {
            appointments: true
          }
        }
      },
      orderBy: {
        name: 'asc'
      }
    })

    return NextResponse.json(services)
  } catch (error) {
    console.error('Erro ao buscar serviços:', error)
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 })
  }
}

// POST - Criar novo serviço
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { name, price, duration, category = true } = body

    // Validar dados obrigatórios
    if (!name || !price || !duration || !category) {
      return NextResponse.json({ 
        error: 'Nome, preço, duração e categoria são obrigatórios' 
      }, { status: 400 })
    }

    const service = await prisma.service.create({
      data: {
        name,
        price: parseFloat(price),
        duration: parseInt(duration)
      },
      select: {
        id: true,
        name: true,
        price: true,
        duration: true,
        createdAt: true
      }
    })

    return NextResponse.json(service, { status: 201 })
  } catch (error) {
    console.error('Erro ao criar serviço:', error)
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 })
  }
}
