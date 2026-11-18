import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// GET - Produtos disponíveis para incluir no agendamento (público)
export async function GET() {
  try {
    const products = await prisma.product.findMany({
      where: { isActive: true },
      select: { id: true, name: true, description: true, price: true, category: true },
      orderBy: { name: 'asc' },
    })

    return NextResponse.json({ success: true, products })
  } catch (error) {
    console.error('Erro ao buscar produtos:', error)
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 })
  }
}
