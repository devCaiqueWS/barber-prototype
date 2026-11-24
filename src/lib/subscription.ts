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

// Fila de "Quero assinar": interesse aguardando contato da barbearia.
export async function getWaitingSubscriptionInterest(clientId: string) {
  return prisma.subscriptionInterest.findFirst({
    where: { clientId, status: 'waiting' },
    orderBy: { createdAt: 'desc' },
    select: { id: true, status: true, createdAt: true },
  })
}

// Assinatura criada para o cliente: tira ele da fila de interessados.
export async function closeSubscriptionInterest(clientId: string, staffId: string | null): Promise<void> {
  await prisma.subscriptionInterest.updateMany({
    where: { clientId, status: 'waiting' },
    data: { status: 'converted', handledAt: new Date(), handledById: staffId },
  })
}
