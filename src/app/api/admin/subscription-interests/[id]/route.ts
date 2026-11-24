import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireStaff } from '@/lib/staff-auth'

// PATCH - Tira o cliente da fila: 'dismissed' (descartado) ou 'converted' (virou assinante).
export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const staff = await requireStaff()
  if (!staff) return NextResponse.json({ error: 'Acesso negado' }, { status: 403 })

  try {
    const { id } = await params
    const body = (await request.json().catch(() => null)) as { status?: string } | null
    const status = body?.status
    if (status !== 'dismissed' && status !== 'converted') {
      return NextResponse.json({ error: 'Status inválido' }, { status: 400 })
    }

    const updated = await prisma.subscriptionInterest.updateMany({
      where: { id, status: 'waiting' },
      data: { status, handledAt: new Date(), handledById: staff.id },
    })
    if (updated.count === 0) {
      return NextResponse.json({ error: 'Pedido não encontrado ou já atendido' }, { status: 404 })
    }
    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error('Erro ao atualizar interesse em assinatura:', error)
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 })
  }
}
