import { BUSINESS } from './business'

// Gerador de arquivos .ics (RFC 5545) sem dependências e sem APIs de browser,
// para ser usado tanto no servidor (anexo de e-mail / download) quanto no cliente.

const pad = (n: number) => String(n).padStart(2, '0')

const encoder = new TextEncoder()

// Escapa os caracteres com significado especial em valores de texto do iCalendar.
const escapeText = (value: string) =>
  value
    .replace(/\\/g, '\\\\')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,')
    .replace(/\r?\n/g, '\\n')

// RFC 5545: linhas com no máximo 75 octetos; continuações começam com espaço.
const foldLine = (line: string): string => {
  if (encoder.encode(line).length <= 75) return line

  const parts: string[] = []
  let current = ''
  let currentBytes = 0

  for (const char of line) {
    const size = encoder.encode(char).length
    if (currentBytes + size > 75) {
      parts.push(current)
      current = ' '
      currentBytes = 1
    }
    current += char
    currentBytes += size
  }
  parts.push(current)

  return parts.join('\r\n')
}

const toUtcStamp = (date: Date) =>
  `${date.getUTCFullYear()}${pad(date.getUTCMonth() + 1)}${pad(date.getUTCDate())}T` +
  `${pad(date.getUTCHours())}${pad(date.getUTCMinutes())}${pad(date.getUTCSeconds())}Z`

// Monta o carimbo local (YYYYMMDDTHHMMSS) direto das strings, sem passar por
// Date — assim o horário não sofre deslocamento pelo fuso do servidor.
const toLocalStamp = (date: string, time: string): string | null => {
  const dateMatch = /^(\d{4})-(\d{2})-(\d{2})$/.exec(date.trim().slice(0, 10))
  const timeMatch = /^(\d{1,2}):(\d{2})$/.exec(time.trim())
  if (!dateMatch || !timeMatch) return null

  const [, year, month, day] = dateMatch
  const [, hour, minute] = timeMatch
  return `${year}${month}${day}T${pad(Number(hour))}${minute}00`
}

// Soma minutos a um par data/hora e devolve o novo horário no mesmo formato.
export const addMinutesToTime = (
  date: string,
  time: string,
  minutes: number,
): { date: string; time: string } | null => {
  const dateMatch = /^(\d{4})-(\d{2})-(\d{2})$/.exec(date.trim().slice(0, 10))
  const timeMatch = /^(\d{1,2}):(\d{2})$/.exec(time.trim())
  if (!dateMatch || !timeMatch) return null

  const [, year, month, day] = dateMatch
  const [, hour, minute] = timeMatch

  const base = new Date(Number(year), Number(month) - 1, Number(day), Number(hour), Number(minute), 0, 0)
  const shifted = new Date(base.getTime() + minutes * 60 * 1000)

  return {
    date: `${shifted.getFullYear()}-${pad(shifted.getMonth() + 1)}-${pad(shifted.getDate())}`,
    time: `${pad(shifted.getHours())}:${pad(shifted.getMinutes())}`,
  }
}

// O Brasil não adota mais horário de verão (desde 2019), então America/Sao_Paulo
// é um offset fixo de -03:00. Declarar o VTIMEZONE evita ambiguidade quando o
// cliente abre o convite em outro fuso.
const VTIMEZONE = [
  'BEGIN:VTIMEZONE',
  `TZID:${BUSINESS.timeZone}`,
  `X-LIC-LOCATION:${BUSINESS.timeZone}`,
  'BEGIN:STANDARD',
  'DTSTART:19700101T000000',
  'TZOFFSETFROM:-0300',
  'TZOFFSETTO:-0300',
  'TZNAME:-03',
  'END:STANDARD',
  'END:VTIMEZONE',
]

export type IcsEvent = {
  uid: string
  /** YYYY-MM-DD */
  date: string
  /** HH:mm */
  startTime: string
  /** HH:mm — se ausente, usa durationMinutes */
  endDate?: string | null
  endTime?: string | null
  durationMinutes?: number | null
  summary: string
  description?: string | null
  location?: string | null
  url?: string | null
  status?: 'CONFIRMED' | 'TENTATIVE' | 'CANCELLED'
  /** Minutos antes do evento para o alarme. `null` desativa. */
  reminderMinutes?: number | null
}

export const buildIcs = (event: IcsEvent): string | null => {
  const dtStart = toLocalStamp(event.date, event.startTime)
  if (!dtStart) return null

  let endDate = event.endDate || event.date
  let endTime = event.endTime || ''

  if (!endTime) {
    const computed = addMinutesToTime(event.date, event.startTime, event.durationMinutes || 30)
    if (!computed) return null
    endDate = computed.date
    endTime = computed.time
  } else if (!event.endDate && endTime <= event.startTime) {
    // endTime menor que startTime indica virada de dia
    const shifted = addMinutesToTime(event.date, '00:00', 24 * 60)
    if (shifted) endDate = shifted.date
  }

  const dtEnd = toLocalStamp(endDate, endTime)
  if (!dtEnd) return null

  const reminder = event.reminderMinutes === undefined ? 60 : event.reminderMinutes

  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Elemento//Agendamentos//PT-BR',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    ...VTIMEZONE,
    'BEGIN:VEVENT',
    `UID:${escapeText(event.uid)}`,
    `DTSTAMP:${toUtcStamp(new Date())}`,
    `DTSTART;TZID=${BUSINESS.timeZone}:${dtStart}`,
    `DTEND;TZID=${BUSINESS.timeZone}:${dtEnd}`,
    `SUMMARY:${escapeText(event.summary)}`,
    event.description ? `DESCRIPTION:${escapeText(event.description)}` : null,
    event.location ? `LOCATION:${escapeText(event.location)}` : null,
    event.url ? `URL:${escapeText(event.url)}` : null,
    `STATUS:${event.status || 'CONFIRMED'}`,
    'TRANSP:OPAQUE',
    'SEQUENCE:0',
    reminder
      ? [
          'BEGIN:VALARM',
          'ACTION:DISPLAY',
          `DESCRIPTION:${escapeText(event.summary)}`,
          `TRIGGER:-PT${reminder}M`,
          'END:VALARM',
        ].join('\r\n')
      : null,
    'END:VEVENT',
    'END:VCALENDAR',
  ].filter((line): line is string => Boolean(line))

  return lines.flatMap((line) => line.split('\r\n')).map(foldLine).join('\r\n')
}

export type AppointmentIcsInput = {
  id: string
  date: string
  startTime: string
  endTime?: string | null
  serviceName?: string | null
  serviceDuration?: number | null
  barberName?: string | null
  clientName?: string | null
  status?: string | null
  url?: string | null
}

export const buildAppointmentIcs = (appointment: AppointmentIcsInput): string | null => {
  const serviceName = appointment.serviceName || 'Atendimento'
  const barberName = appointment.barberName || 'barbeiro'

  const description = [
    `Serviço: ${serviceName}`,
    `Profissional: ${barberName}`,
    appointment.clientName ? `Cliente: ${appointment.clientName}` : null,
    `Local: ${BUSINESS.address}`,
    `Contato: ${BUSINESS.phone}`,
  ]
    .filter(Boolean)
    .join('\n')

  return buildIcs({
    uid: `${appointment.id}@elemento-barbearia`,
    date: appointment.date,
    startTime: appointment.startTime,
    endTime: appointment.endTime,
    durationMinutes: appointment.serviceDuration || 30,
    summary: `${serviceName} - ${BUSINESS.name}`,
    description,
    location: `${BUSINESS.name} - ${BUSINESS.address}`,
    url: appointment.url,
    status: appointment.status === 'cancelled' ? 'CANCELLED' : appointment.status === 'pending' ? 'TENTATIVE' : 'CONFIRMED',
  })
}

export const appointmentIcsFilename = (appointment: { date: string; startTime: string }) =>
  `elemento-${appointment.date}-${appointment.startTime.replace(':', 'h')}.ics`
