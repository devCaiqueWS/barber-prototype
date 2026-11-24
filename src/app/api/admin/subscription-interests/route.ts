import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireStaff } from '@/lib/staff-auth'

// GET - Fila de clientes que clicaram "Quero assinar", em ordem de chegada.
export async function GET() {
  const staff = await requireStaff()
  if (!staff) return NextResponse.json({ error: 'Acesso negado' }, { status: 403 })

  try {
    const interests = await prisma.subscriptionInterest.findMany({
      where: { status: 'waiting' },
      orderBy: { createdAt: 'asc' },
      select: {
        id: true,
        createdAt: true,
        client: {
          select: { id: true, name: true, email: true, whatsapp: true, phone: true, clientCode: true },
        },
      },
    })
    return NextResponse.json({ success: true, interests })
  } catch (error) {
    console.error('Erro ao carregar fila de interessados:', error)
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 })
  }
}
