import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getAuthUser } from '@/lib/client-auth'
import { getActiveSubscription, getWaitingSubscriptionInterest } from '@/lib/subscription'

// POST - "Quero assinar": coloca o cliente na fila de interessados do painel.
// Idempotente: se já está na fila, devolve o mesmo pedido.
export async function POST(request: NextRequest) {
  const authUser = await getAuthUser(request)
  if (!authUser) {
    return NextResponse.json({ error: 'É necessário estar logado.', needsAuth: true }, { status: 401 })
  }

  try {
    if (await getActiveSubscription(authUser.id)) {
      return NextResponse.json({ error: 'Você já é assinante.' }, { status: 409 })
    }

    const existing = await getWaitingSubscriptionInterest(authUser.id)
    if (existing) return NextResponse.json({ interest: existing })

    const interest = await prisma.subscriptionInterest.create({
      data: { clientId: authUser.id },
      select: { id: true, status: true, createdAt: true },
    })

    // Dois cliques simultâneos podem criar dois pedidos: fica só o mais antigo.
    const duplicates = await prisma.subscriptionInterest.findMany({
      where: { clientId: authUser.id, status: 'waiting' },
      orderBy: { createdAt: 'asc' },
      select: { id: true, status: true, createdAt: true },
    })
    if (duplicates.length > 1) {
      await prisma.subscriptionInterest.deleteMany({
        where: { id: { in: duplicates.slice(1).map((d) => d.id) } },
      })
      return NextResponse.json({ interest: duplicates[0] })
    }

    return NextResponse.json({ interest })
  } catch (error) {
    console.error('Erro ao registrar interesse em assinatura:', error)
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 })
  }
}
