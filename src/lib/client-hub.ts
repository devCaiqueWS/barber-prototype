// Regras do Hub do cliente compartilhadas entre as rotas e a tela.

// Antecedência mínima para o próprio cliente cancelar pelo Hub.
export const CLIENT_CANCEL_MIN_HOURS = 2

// Horário do agendamento como instante absoluto (a barbearia fica em São Paulo,
// UTC−3 o ano todo desde o fim do horário de verão).
export const appointmentStartsAt = (date: string, startTime: string) =>
  new Date(`${date}T${(startTime || '00:00').slice(0, 5)}:00-03:00`)

// Data de hoje (YYYY-MM-DD) em São Paulo, independente do fuso do servidor
export const todayKeySaoPaulo = (now = new Date()) =>
  new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Sao_Paulo',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(now)

export const formatClientCode = (code?: number | null) =>
  code ? `#${String(code).padStart(6, '0')}` : ''

// Valida CPF (dígitos verificadores) ou aceita CNPJ com 14 dígitos.
export function isValidCpfCnpj(value: string) {
  const digits = value.replace(/\D/g, '')
  if (digits.length === 14) return true
  if (digits.length !== 11 || /^(\d)\1{10}$/.test(digits)) return false
  const calc = (length: number) => {
    let sum = 0
    for (let i = 0; i < length; i++) sum += Number(digits[i]) * (length + 1 - i)
    const rest = (sum * 10) % 11
    return rest === 10 ? 0 : rest
  }
  return calc(9) === Number(digits[9]) && calc(10) === Number(digits[10])
}

// Cliente pode cancelar sozinho quando não houve pagamento online (assinante,
// reserva ainda não paga) e falta tempo suficiente. Pago → estorno pelo WhatsApp.
export function clientCanCancel(
  appointment: { status: string; paidAt: Date | null; date: string; startTime: string },
  now = new Date(),
) {
  if (appointment.paidAt) return false
  if (!['awaiting_payment', 'pending', 'confirmed'].includes(appointment.status)) return false
  const startsAt = appointmentStartsAt(appointment.date, appointment.startTime)
  return startsAt.getTime() - now.getTime() >= CLIENT_CANCEL_MIN_HOURS * 60 * 60 * 1000
}
