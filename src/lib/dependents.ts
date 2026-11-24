// Dependentes: pessoas da família que o titular agenda pela própria conta.
// A assinatura é do titular e não cobre dependentes.

export const RELATIONSHIPS = {
  filho: 'Filho(a)',
  conjuge: 'Cônjuge',
  irmao: 'Irmão(ã)',
  outro: 'Outro',
} as const

export type Relationship = keyof typeof RELATIONSHIPS

export const MAX_DEPENDENTS = 10

export const isRelationship = (value: unknown): value is Relationship =>
  typeof value === 'string' && Object.prototype.hasOwnProperty.call(RELATIONSHIPS, value)

/** Nome limpo (espaços colapsados) ou null se fora de 2 a 80 caracteres. */
export const normalizeDependentName = (value: unknown): string | null => {
  if (typeof value !== 'string') return null
  const name = value.trim().replace(/\s+/g, ' ')
  return name.length >= 2 && name.length <= 80 ? name : null
}

/**
 * Nome exibido no painel e na agenda: o de quem vai cortar.
 * Para dependente: "João (dependente de Pedro Silva)".
 */
export const appointmentDisplayName = (appointment: {
  clientName?: string | null
  client?: { name?: string | null } | null
  dependentName?: string | null
}): string => {
  const holder = appointment.client?.name || appointment.clientName || ''
  if (!appointment.dependentName) return holder
  return holder ? `${appointment.dependentName} (dependente de ${holder})` : appointment.dependentName
}
