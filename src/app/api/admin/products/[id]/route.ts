import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { Prisma } from '@prisma/client'
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

function getIdFromRequest(request: NextRequest): string | null {
  const segments = request.nextUrl.pathname.split('/').filter(Boolean)
  const last = segments[segments.length - 1]
  return last && last !== '[id]' ? last : null
}

// PUT - Atualizar produto (admin ou barbeiro)
export async function PUT(request: NextRequest) {
  if (!(await requireStaff())) {
    return NextResponse.json({ error: 'Acesso negado' }, { status: 403 })
  }

  try {
    const id = getIdFromRequest(request)
    if (!id) {
      return NextResponse.json({ error: 'ID do produto é obrigatório' }, { status: 400 })
    }

    const body = (await request.json()) as {
      name?: string
      description?: string
      price?: number | string
      category?: string
      isActive?: boolean
    }

    const existing = await prisma.product.findUnique({ where: { id } })
    if (!existing) {
      return NextResponse.json({ error: 'Produto não encontrado' }, { status: 404 })
    }

    const data: Prisma.ProductUpdateInput = {}

    if (typeof body.name === 'string') {
      const name = body.name.trim()
      if (!name) return NextResponse.json({ error: 'Nome não pode ficar vazio' }, { status: 400 })
      data.name = name
    }
    if (typeof body.description === 'string') data.description = body.description.trim() || null
    if (typeof body.category === 'string') data.category = body.category.trim() || null
    if (typeof body.price !== 'undefined') {
      const price = typeof body.price === 'string' ? parseFloat(body.price) : body.price
      if (typeof price !== 'number' || !Number.isFinite(price) || price <= 0) {
        return NextResponse.json({ error: 'Preço deve ser maior que zero' }, { status: 400 })
      }
      data.price = price
    }
    if (typeof body.isActive === 'boolean') data.isActive = body.isActive

    if (Object.keys(data).length === 0) {
      return NextResponse.json({ error: 'Nenhum campo para atualização informado' }, { status: 400 })
    }

    const product = await prisma.product.update({ where: { id }, data, select: productSelect })
    return NextResponse.json({ success: true, product })
  } catch (error) {
    console.error('Erro ao atualizar produto (admin):', error)
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 })
  }
}

// DELETE - Excluir produto; se já foi vendido, apenas desativa (admin ou barbeiro)
export async function DELETE(request: NextRequest) {
  if (!(await requireStaff())) {
    return NextResponse.json({ error: 'Acesso negado' }, { status: 403 })
  }

  try {
    const id = getIdFromRequest(request)
    if (!id) {
      return NextResponse.json({ error: 'ID do produto é obrigatório' }, { status: 400 })
    }

    const existing = await prisma.product.findUnique({ where: { id } })
    if (!existing) {
      return NextResponse.json({ error: 'Produto não encontrado' }, { status: 404 })
    }

    const soldCount = await prisma.appointmentProduct.count({ where: { productId: id } })

    if (soldCount > 0) {
      await prisma.product.update({ where: { id }, data: { isActive: false } })
      return NextResponse.json({
        success: true,
        deactivated: true,
        message: 'Produto desativado (já foi incluído em agendamentos)',
      })
    }

    await prisma.product.delete({ where: { id } })
    return NextResponse.json({ success: true, message: 'Produto excluído com sucesso' })
  } catch (error) {
    console.error('Erro ao excluir produto (admin):', error)
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 })
  }
}
