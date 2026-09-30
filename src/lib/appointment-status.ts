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

const toMinutes = (hhmm: string) => {
  const [h, m] = (hhmm || '00:00').split(':').map((n) => Number.parseInt(n, 10))
  return (Number.isFinite(h) ? h : 0) * 60 + (Number.isFinite(m) ? m : 0)
}

type Db = Prisma.TransactionClient | typeof prisma

// Há outro agendamento ocupando [startTime, startTime + duração) com este barbeiro nesse dia?
// Dentro de withSlotLock, passe o tx para a checagem enxergar a mesma transação.
export async function hasSlotConflict(
  params: {
    barberId: string
    date: string
    startTime: string
    durationMinutes: number
    excludeId?: string
  },
  db: Db = prisma,
) {
  const existing = await db.appointment.findMany({
    where: {
      barberId: params.barberId,
      date: params.date,
      ...(params.excludeId ? { id: { not: params.excludeId } } : {}),
      ...slotBlockingWhere(),
    },
    select: { startTime: true, service: { select: { duration: true } } },
  })

  const start = toMinutes(params.startTime)
  const end = start + params.durationMinutes
  return existing.some((appt) => {
    const apptStart = toMinutes(appt.startTime)
    const apptEnd = apptStart + (appt.service?.duration ?? 30)
    return start < apptEnd && end > apptStart
  })
}

// Serializa quem mexe na agenda de um barbeiro num dia: checar conflito e gravar
// a reserva acontecem sob a mesma trava, então duas reservas simultâneas do mesmo
// horário não passam juntas. A trava some sozinha no fim da transação.
export async function withSlotLock<T>(
  barberId: string,
  date: string,
  fn: (tx: Prisma.TransactionClient) => Promise<T>,
) {
  return prisma.$transaction(async (tx) => {
    const key = `agenda:${barberId}:${date}`
    await tx.$queryRaw`SELECT 1 AS locked FROM (SELECT pg_advisory_xact_lock(hashtext(${key}))) AS l`
    return fn(tx)
  })
}

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
