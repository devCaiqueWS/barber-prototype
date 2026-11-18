import { prisma } from '@/lib/prisma'
import { OCCUPANCY_SELECT, occupiedMinutes, slotBlockingWhere, toMinutes } from '@/lib/appointment-status'

const DEFAULT_WORK_END = '20:00'

// Minutos livres logo depois do serviço principal, onde cabem serviços adicionais.
// O tempo livre termina no que vier primeiro: o próximo agendamento do barbeiro,
// um horário bloqueado por ele ou o fim do expediente.
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
      select: { isDayBlocked: true, blockedSlots: true },
    }),
    prisma.user.findUnique({ where: { id: params.barberId }, select: { workEndTime: true } }),
  ])

  if (override?.isDayBlocked) return 0

  let limit = toMinutes(barber?.workEndTime || DEFAULT_WORK_END)

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
