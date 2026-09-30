import { prisma } from '@/lib/prisma'

export const SUBSCRIPTION_STATUS_LABELS: Record<string, string> = {
  pending: 'Aguardando 1º pagamento',
  active: 'Ativa',
  overdue: 'Pagamento em atraso',
  cancelled: 'Cancelada',
}

// Assinatura que libera agendar sem pagamento: status 'active' e vinculada à conta.
export async function getActiveSubscription(clientId: string) {
  return prisma.subscription.findFirst({
    where: { clientId, status: 'active' },
    orderBy: { createdAt: 'desc' },
    select: {
      id: true,
      amount: true,
      cycle: true,
      status: true,
      provider: true,
      lastPaymentAt: true,
      createdAt: true,
    },
  })
}

// Assinatura mais relevante para exibir no Hub (ativa, senão a mais recente não cancelada).
export async function getDisplaySubscription(clientId: string) {
  const active = await getActiveSubscription(clientId)
  if (active) return active
  return prisma.subscription.findFirst({
    where: { clientId, status: { not: 'cancelled' } },
    orderBy: { createdAt: 'desc' },
    select: {
      id: true,
      amount: true,
      cycle: true,
      status: true,
      provider: true,
      lastPaymentAt: true,
      createdAt: true,
    },
  })
}
