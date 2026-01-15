const DATE_ONLY_RE = /^\d{4}-\d{2}-\d{2}$/

export const parseDateOnly = (value?: string | null): Date | null => {
  if (!value) return null
  const datePart = value.trim().slice(0, 10)
  if (!DATE_ONLY_RE.test(datePart)) return null
  const [year, month, day] = datePart.split('-').map((n) => Number(n))
  if (!year || !month || !day) return null
  const date = new Date(year, month - 1, day)
  return Number.isFinite(date.getTime()) ? date : null
}

export const formatDateKey = (value: Date | string | null | undefined): string => {
  const date = value instanceof Date ? value : parseDateOnly(value ?? undefined)
  if (!date || !Number.isFinite(date.getTime())) return ''
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${date.getFullYear()}-${month}-${day}`
}

export const formatDateBR = (value: Date | string | null | undefined): string => {
  const date = value instanceof Date ? value : parseDateOnly(value ?? undefined)
  if (!date || !Number.isFinite(date.getTime())) {
    return value ? String(value).slice(0, 10) : ''
  }
  return date.toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  })
}
