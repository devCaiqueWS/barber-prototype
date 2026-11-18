// Valor de um agendamento: serviço + produtos incluídos.
// Usado na criação, no "Pagar agora", no webhook e nas telas — sempre no servidor
// para cobrança; o navegador nunca informa valores.

export const MAX_PRODUCT_QUANTITY = 10

export type AppointmentItem = { name: string; unitPrice: number; quantity: number }

type Totalable = {
  paymentMethod?: string | null
  service?: { price?: number | null } | null
  products?: Array<{ unitPrice: number; quantity: number }> | null
}

const round2 = (value: number) => Math.round(value * 100) / 100

export const productsTotal = (products?: Totalable['products']) =>
  round2((products || []).reduce((sum, item) => sum + item.unitPrice * item.quantity, 0))

// Agendamento de assinante: o serviço já está pago pela assinatura.
export const isServiceCoveredBySubscription = (appointment: { paymentMethod?: string | null }) =>
  appointment.paymentMethod === 'assinatura'

// Parte do serviço que entra na cobrança (zero para assinante).
export const serviceAmountDue = (appointment: Totalable) =>
  isServiceCoveredBySubscription(appointment) ? 0 : round2(appointment.service?.price ?? 0)

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
  products?: Array<{ name: string; unitPrice: number; quantity: number }> | null
}): AppointmentItem[] {
  const items: AppointmentItem[] = []
  const servicePrice = serviceAmountDue(appointment)
  if (servicePrice > 0) {
    items.push({ name: appointment.service?.name || 'Agendamento', unitPrice: servicePrice, quantity: 1 })
  }
  for (const product of appointment.products || []) {
    items.push({ name: product.name, unitPrice: product.unitPrice, quantity: product.quantity })
  }
  return items
}
