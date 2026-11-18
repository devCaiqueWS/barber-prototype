import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireStaff } from '@/lib/staff-auth'

const productSelect = {
  id: true,
  name: true,
  description: true,
  price: true,
  category: true,
  isActive: true,
  createdAt: true,
  _count: { select: { appointmentItems: true } },
} as const

// GET - Listar produtos (equipe)
export async function GET() {
  if (!(await requireStaff())) {
    return NextResponse.json({ error: 'Acesso negado' }, { status: 403 })
  }

  try {
    const products = await prisma.product.findMany({ select: productSelect, orderBy: { name: 'asc' } })
    return NextResponse.json({ success: true, products })
  } catch (error) {
    console.error('Erro ao buscar produtos (admin):', error)
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 })
  }
}

// POST - Criar produto (admin ou barbeiro)
export async function POST(request: NextRequest) {
  if (!(await requireStaff())) {
    return NextResponse.json({ error: 'Acesso negado' }, { status: 403 })
  }

  try {
    const body = (await request.json()) as {
      name?: string
      description?: string
      price?: number | string
      category?: string
      isActive?: boolean
    }

    const name = body.name?.trim()
    const price = typeof body.price === 'string' ? parseFloat(body.price) : body.price

    if (!name || typeof price !== 'number' || !Number.isFinite(price) || price <= 0) {
      return NextResponse.json({ error: 'Nome e preço (maior que zero) são obrigatórios' }, { status: 400 })
    }

    const product = await prisma.product.create({
      data: {
        name,
        description: body.description?.trim() || null,
        price,
        category: body.category?.trim() || null,
        isActive: typeof body.isActive === 'boolean' ? body.isActive : true,
      },
      select: productSelect,
    })

    return NextResponse.json({ success: true, product }, { status: 201 })
  } catch (error) {
    console.error('Erro ao criar produto (admin):', error)
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 })
  }
}
