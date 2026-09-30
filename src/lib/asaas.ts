import { CHECKOUT_ITEM_IMAGE_BASE64 } from '@/lib/asaas-checkout-image'
import { BUSINESS } from '@/lib/business'

// Cliente mínimo da API v3 do Asaas.
// Configuração: ASAAS_API_KEY e ASAAS_API_URL (sandbox por padrão).

export const ASAAS_API_URL = process.env.ASAAS_API_URL || 'https://sandbox.asaas.com/api/v3'

// O checkout expira antes da reserva do horário (PAYMENT_HOLD_MINUTES = 20)
// para o webhook de um pagamento feito no último minuto ainda chegar a tempo.
export const ASAAS_CHECKOUT_MINUTES = 15

export class AsaasError extends Error {
  constructor(
    message: string,
    public status: number,
    public details?: unknown,
  ) {
    super(message)
    this.name = 'AsaasError'
  }
}

export const isAsaasConfigured = () => Boolean(process.env.ASAAS_API_KEY)

export const onlyDigits = (value?: string | null) => (value ? value.replace(/\D/g, '') : '')

// Primeira mensagem de erro legível que o Asaas devolve em { errors: [{ description }] }
const describeAsaasError = (data: Record<string, unknown>) => {
  const errors = data.errors
  if (Array.isArray(errors) && errors.length > 0) {
    const first = errors[0] as { description?: string }
    if (first?.description) return first.description
  }
  return 'Erro na comunicação com o Asaas'
}

export async function asaasRequest<T = Record<string, unknown>>(
  path: string,
  init: { method?: string; body?: unknown } = {},
): Promise<T> {
  const apiKey = process.env.ASAAS_API_KEY
  if (!apiKey) throw new AsaasError('ASAAS_API_KEY não configurada', 503)

  const response = await fetch(`${ASAAS_API_URL}${path}`, {
    method: init.method || 'GET',
    headers: {
      'Content-Type': 'application/json',
      'User-Agent': 'elemento-barbearia',
      access_token: apiKey,
    },
    body: init.body === undefined ? undefined : JSON.stringify(init.body),
    cache: 'no-store',
  })

  const text = await response.text()
  let data: Record<string, unknown> = {}
  try {
    data = text ? (JSON.parse(text) as Record<string, unknown>) : {}
  } catch {
    data = { raw: text }
  }

  if (!response.ok) {
    console.error(`[asaas] ${init.method || 'GET'} ${path} → ${response.status}`, data)
    throw new AsaasError(describeAsaasError(data), response.status, data)
  }

  return data as T
}

// URL pública do checkout; o Asaas devolve em `link`, com fallback para o formato conhecido.
const checkoutUrlFor = (data: { id?: string; link?: string }) => {
  if (data.link) return data.link
  const host = ASAAS_API_URL.includes('sandbox') ? 'https://sandbox.asaas.com' : 'https://www.asaas.com'
  return `${host}/checkoutSession/show?id=${data.id}`
}

export interface AppointmentCheckoutInput {
  appointmentId: string
  serviceName: string
  amount: number
  siteUrl: string
  customer: { name?: string | null; email?: string | null; phone?: string | null; cpf?: string | null }
}

// Cria um Asaas Checkout (PIX ou cartão, sem boleto) para um agendamento.
// O valor vem sempre do serviço no banco — nunca do navegador.
export async function createAppointmentCheckout(input: AppointmentCheckoutInput) {
  const back = (result: string) =>
    `${input.siteUrl}/minha-conta?pagamento=${result}&agendamento=${encodeURIComponent(input.appointmentId)}`

  const phone = onlyDigits(input.customer.phone)
  const cpf = onlyDigits(input.customer.cpf)

  const data = await asaasRequest<{ id?: string; link?: string; status?: string }>('/checkouts', {
    method: 'POST',
    body: {
      billingTypes: ['PIX', 'CREDIT_CARD'],
      chargeTypes: ['DETACHED'],
      minutesToExpire: ASAAS_CHECKOUT_MINUTES,
      externalReference: input.appointmentId,
      callback: {
        successUrl: back('sucesso'),
        cancelUrl: back('cancelado'),
        expiredUrl: back('expirado'),
      },
      items: [
        {
          name: input.serviceName.slice(0, 30),
          description: `${BUSINESS.shortName} — agendamento ${input.appointmentId.slice(0, 8)}`.slice(0, 150),
          quantity: 1,
          value: Number(input.amount.toFixed(2)),
          externalReference: input.appointmentId,
          imageBase64: CHECKOUT_ITEM_IMAGE_BASE64,
        },
      ],
      customerData: {
        name: input.customer.name || undefined,
        email: input.customer.email || undefined,
        phone: phone || undefined,
        cpfCnpj: cpf.length === 11 || cpf.length === 14 ? cpf : undefined,
      },
    },
  })

  if (!data.id) throw new AsaasError('Checkout criado sem id', 502, data)
  return { id: data.id, url: checkoutUrlFor(data) }
}

// Cancela um checkout ainda ativo (reserva expirada ou agendamento cancelado).
// Falhas são só registradas: o checkout expira sozinho de qualquer forma.
export async function cancelCheckout(checkoutId: string) {
  try {
    await asaasRequest(`/checkouts/${encodeURIComponent(checkoutId)}/cancel`, { method: 'POST' })
  } catch (error) {
    console.warn(`[asaas] Não foi possível cancelar o checkout ${checkoutId}:`, (error as Error).message)
  }
}

export const checkoutUrlFromId = (checkoutId: string) => checkoutUrlFor({ id: checkoutId })
