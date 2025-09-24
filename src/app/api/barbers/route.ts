import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// GET - Buscar barbeiros disponíveis (atualizado)
export async function GET() {
  try {
    const barbers = await prisma.user.findMany({
      where: {
        role: 'BARBER'
      },
      select: {
        id: true,
        name: true,
        email: true,
      },
      orderBy: {
        name: 'asc'
      }
    })

    return NextResponse.json({ success: true, barbers })
  } catch (error) {
    console.error('Erro ao buscar barbeiros:', error)
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 })
  }
}
