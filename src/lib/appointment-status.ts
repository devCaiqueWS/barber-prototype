import type { Prisma } from '@prisma/client'
import { prisma } from '@/lib/prisma'

// Quanto tempo o horário fica reservado aguardando o pagamento online.
// O checkout do Asaas expira antes (ver ASAAS_CHECKOUT_MINUTES em lib/asaas.ts),
// deixando folga para o webhook chegar.
export const PAYMENT_HOLD_MINUTES = 20

// Status que nunca ocupam horário na agenda.
export const INACTIVE_STATUSES = ['cancelled', 'no_show', 'expired', 'payment_conflict']

// Status que já saíram da lista de "próximos" do cliente.
export const FINISHED_STATUSES = [...INACTIVE_STATUSES, 'completed']

export const STATUS_LABELS_PT: Record<string, string> = {
  awaiting_payment: 'Aguardando pagamento',
  pending: 'Pendente',
  confirmed: 'Confirmado',
  completed: 'Concluído',
  cancelled: 'Cancelado',
  no_show: 'Não compareceu',
  expired: 'Reserva expirada',
  payment_conflict: 'Pago sem horário',
}

export const paymentHoldDeadline = (from = new Date()) =>
  new Date(from.getTime() + PAYMENT_HOLD_MINUTES * 60 * 1000)

// Filtro Prisma dos agendamentos que ocupam horário agora: tudo que não está
// inativo, exceto reservas aguardando pagamento cujo prazo já passou.
export function slotBlockingWhere(now = new Date()): Prisma.AppointmentWhereInput {
  return {
    status: { notIn: INACTIVE_STATUSES },
    OR: [
      { status: { not: 'awaiting_payment' } },
      { paymentExpiresAt: null },
      { paymentExpiresAt: { gt: now } },
    ],
  }
}

export const isHoldExpired = (
  appointment: { status: string; paymentExpiresAt: Date | null },
  now = new Date(),
) =>
  appointment.status === 'awaiting_payment' &&
  appointment.paymentExpiresAt != null &&
  appointment.paymentExpiresAt <= now

// Marca como 'expired' as reservas vencidas. É chamado nas leituras (disponibilidade,
// Hub, criação de agendamento) em vez de um cron; o filtro acima já ignora as
// vencidas, então isso só deixa o status legível no painel e no Hub.
export async function expireStaleHolds(where: Prisma.AppointmentWhereInput = {}, now = new Date()) {
  try {
    await prisma.appointment.updateMany({
      where: { ...where, status: 'awaiting_payment', paymentExpiresAt: { lte: now } },
      data: { status: 'expired' },
    })
  } catch (error) {
    console.error('[appointments] Falha ao expirar reservas vencidas:', error)
  }
}
