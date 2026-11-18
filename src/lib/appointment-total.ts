// Valor de um agendamento: serviço + produtos incluídos.
// Usado na criação, no "Pagar agora", no webhook e nas telas — sempre no servidor
// para cobrança; o navegador nunca informa valores.

export const MAX_PRODUCT_QUANTITY = 10

export type AppointmentItem = { name: string; unitPrice: number; quantity: number }

type Totalable = {
  paymentMethod?: string | null
  service?: { price?: number | null } | null
  extraServices?: Array<{ price: number }> | null
  products?: Array<{ unitPrice: number; quantity: number }> | null
}

const round2 = (value: number) => Math.round(value * 100) / 100

export const productsTotal = (products?: Totalable['products']) =>
  round2((products || []).reduce((sum, item) => sum + item.unitPrice * item.quantity, 0))

// Preço de tabela de todos os serviços do agendamento (principal + adicionais).
export const servicesPrice = (appointment: Totalable) =>
  round2(
    (appointment.service?.price ?? 0) +
      (appointment.extraServices || []).reduce((sum, extra) => sum + extra.price, 0),
  )

// Agendamento de assinante: os serviços já estão pagos pela assinatura.
export const isServiceCoveredBySubscription = (appointment: { paymentMethod?: string | null }) =>
  appointment.paymentMethod === 'assinatura'

// Parte dos serviços que entra na cobrança (zero para assinante).
export const serviceAmountDue = (appointment: Totalable) =>
  isServiceCoveredBySubscription(appointment) ? 0 : servicesPrice(appointment)

// Total a cobrar online por este agendamento.
export const appointmentAmountDue = (appointment: Totalable) =>
  round2(serviceAmountDue(appointment) + productsTotal(appointment.products))

// Pedido de produtos vindo do navegador: só ids e quantidades são aproveitados.
// Devolve null se o formato for inválido; ids repetidos são somados.
export function parseProductRequest(input: unknown): Array<{ productId: string; quantity: number }> | null {
  if (input == null) return []
  if (!Array.isArray(input)) return null

  const byId = new Map<string, number>()
  for (const raw of input) {
    const item = raw as { productId?: unknown; quantity?: unknown }
    const productId = typeof item?.productId === 'string' ? item.productId.trim() : ''
    const quantity = Number(item?.quantity)
    if (!productId || !Number.isInteger(quantity) || quantity < 1) return null
    byId.set(productId, (byId.get(productId) || 0) + quantity)
  }

  for (const quantity of byId.values()) {
    if (quantity > MAX_PRODUCT_QUANTITY) return null
  }
  return Array.from(byId, ([productId, quantity]) => ({ productId, quantity }))
}

// Linhas do checkout do Asaas para um agendamento.
export function checkoutItemsFor(appointment: {
  paymentMethod?: string | null
  service?: { name?: string | null; price?: number | null } | null
  extraServices?: Array<{ name: string; price: number }> | null
  products?: Array<{ name: string; unitPrice: number; quantity: number }> | null
}): AppointmentItem[] {
  const items: AppointmentItem[] = []
  if (!isServiceCoveredBySubscription(appointment)) {
    const mainPrice = round2(appointment.service?.price ?? 0)
    if (mainPrice > 0) {
      items.push({ name: appointment.service?.name || 'Agendamento', unitPrice: mainPrice, quantity: 1 })
    }
    for (const extra of appointment.extraServices || []) {
      items.push({ name: extra.name, unitPrice: extra.price, quantity: 1 })
    }
  }
  for (const product of appointment.products || []) {
    items.push({ name: product.name, unitPrice: product.unitPrice, quantity: product.quantity })
  }
  return items
}

// Resumo dos serviços para e-mail e telas: nomes juntos, preço e duração somados.
export function servicesSummary(appointment: {
  service?: { name?: string | null; price?: number | null; duration?: number | null } | null
  extraServices?: Array<{ name: string; price: number; duration: number }> | null
}) {
  const extras = appointment.extraServices || []
  const mainName = appointment.service?.name || ''
  return {
    name: [mainName, ...extras.map((extra) => extra.name)].filter(Boolean).join(' + '),
    price: servicesPrice(appointment),
    duration: (appointment.service?.duration ?? 0) + extras.reduce((sum, extra) => sum + extra.duration, 0),
  }
}

// Ids de serviços adicionais vindos do navegador: lista de strings, sem repetição.
export const MAX_EXTRA_SERVICES = 5

export function parseExtraServiceIds(input: unknown, mainServiceId: string): string[] | null {
  if (input == null) return []
  if (!Array.isArray(input)) return null
  const ids: string[] = []
  for (const raw of input) {
    const id = typeof raw === 'string' ? raw.trim() : ''
    if (!id || id === mainServiceId || ids.includes(id)) return null
    ids.push(id)
  }
  return ids.length > MAX_EXTRA_SERVICES ? null : ids
}
