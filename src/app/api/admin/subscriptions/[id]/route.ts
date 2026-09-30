import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { asaasRequest, AsaasError } from '@/lib/asaas'
import { requireStaff } from '@/lib/staff-auth'

// PATCH - Ativar manualmente (ex.: pagou no balcão) ou cancelar uma assinatura.
// Body: { action: 'activate' | 'cancel' }
export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const staff = await requireStaff()
  if (!staff) return NextResponse.json({ error: 'Acesso negado' }, { status: 403 })

  const { id } = await params

  let action = ''
  try {
    action = ((await request.json()) as { action?: string }).action || ''
  } catch {
    // validado abaixo
  }

  if (action !== 'activate' && action !== 'cancel') {
    return NextResponse.json({ error: 'Ação inválida' }, { status: 400 })
  }

  try {
    const subscription = await prisma.subscription.findUnique({ where: { id } })
    if (!subscription || (staff.role === 'BARBER' && subscription.barberId !== staff.id)) {
      return NextResponse.json({ error: 'Assinatura não encontrada' }, { status: 404 })
    }

    if (action === 'activate') {
      if (subscription.status === 'cancelled') {
        return NextResponse.json({ error: 'Assinatura cancelada não pode ser reativada. Crie uma nova.' }, { status: 409 })
      }
      const updated = await prisma.subscription.update({
        where: { id },
        data: { status: 'active', lastPaymentAt: new Date() },
      })
      return NextResponse.json({ success: true, subscription: updated })
    }

    // Cancelar: interrompe a cobrança recorrente no Asaas antes de marcar aqui,
    // para não deixar o cliente sendo cobrado sem benefício.
    if (subscription.asaasSubscriptionId && subscription.status !== 'cancelled') {
      try {
        await asaasRequest(`/subscriptions/${encodeURIComponent(subscription.asaasSubscriptionId)}`, {
          method: 'DELETE',
        })
      } catch (error) {
        // 404: já removida no Asaas — seguimos com o cancelamento local
        if (!(error instanceof AsaasError && error.status === 404)) {
          const detail = error instanceof Error ? error.message : 'erro desconhecido'
          return NextResponse.json(
            { error: `Não foi possível cancelar no Asaas (${detail}). Nada foi alterado.` },
            { status: 502 },
          )
        }
      }
    }

    const updated = await prisma.subscription.update({ where: { id }, data: { status: 'cancelled' } })
    return NextResponse.json({ success: true, subscription: updated })
  } catch (error) {
    console.error('Erro ao atualizar assinatura:', error)
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 })
  }
}
