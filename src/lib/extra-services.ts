import { prisma } from '@/lib/prisma'
import { OCCUPANCY_SELECT, occupiedMinutes, slotBlockingWhere, toMinutes } from '@/lib/appointment-status'

const DEFAULT_WORK_END = '20:00'

// Minutos livres logo depois do serviço principal, onde cabem serviços adicionais.
// O tempo livre termina no que vier primeiro: o próximo agendamento do barbeiro,
// um horário bloqueado ou não aberto por ele, ou o fim do expediente.
export async function extraServicesGap(params: {
  barberId: string
  date: string
  startTime: string
  mainDurationMinutes: number
  excludeAppointmentId?: string
}) {
  const mainEnd = toMinutes(params.startTime) + params.mainDurationMinutes

  const [appointments, override, barber] = await Promise.all([
    prisma.appointment.findMany({
      where: {
        barberId: params.barberId,
        date: params.date,
        ...(params.excludeAppointmentId ? { id: { not: params.excludeAppointmentId } } : {}),
        ...slotBlockingWhere(),
      },
      select: OCCUPANCY_SELECT,
    }),
    prisma.barberAvailability.findUnique({
      where: { barberId_date: { barberId: params.barberId, date: params.date } },
      select: { isDayBlocked: true, blockedSlots: true, availableSlots: true },
    }),
    prisma.user.findUnique({ where: { id: params.barberId }, select: { workEndTime: true } }),
  ])

  if (override?.isDayBlocked) return 0

  let limit = toMinutes(barber?.workEndTime || DEFAULT_WORK_END)

  // Dia com horários definidos manualmente: vale o último horário aberto, e um
  // horário de 30 em 30 min que o barbeiro deixou de fora (almoço, por exemplo)
  // conta como ocupado.
  const openSlots = (override?.availableSlots || []).map((slot) => toMinutes(slot.trim()))
  if (openSlots.length > 0) {
    const open = new Set(openSlots)
    const first = Math.min(...openSlots)
    const last = Math.max(...openSlots)
    limit = Math.max(limit, last)
    for (let t = first; t < last; t += 30) {
      if (!open.has(t) && t >= mainEnd) {
        limit = Math.min(limit, t)
        break
      }
    }
  }

  for (const appointment of appointments) {
    const start = toMinutes(appointment.startTime)
    const end = start + occupiedMinutes(appointment)
    // Qualquer agendamento que termine depois do serviço principal limita o tempo livre
    if (end > mainEnd) limit = Math.min(limit, start)
  }

  for (const slot of override?.blockedSlots || []) {
    const blocked = toMinutes(slot.trim())
    if (blocked >= mainEnd) limit = Math.min(limit, blocked)
  }

  return Math.max(0, limit - mainEnd)
}
