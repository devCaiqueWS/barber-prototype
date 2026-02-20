import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { formatDateKey } from '@/lib/date'

const ASAAS_API_KEY = process.env.ASAAS_API_KEY
const ASAAS_API_URL = process.env.ASAAS_API_URL || 'https://sandbox.asaas.com/api/v3'

type SubscriptionBody = {
  barberId?: string
  clientId?: string
  clientName?: string
  clientEmail?: string
  clientWhatsapp?: string
  amount?: number
  cycle?: string
}

const normalizeDigits = (value?: string | null) =>
  value ? value.replace(/\D/g, '') : ''

const pickUrl = (data: Record<string, unknown>): string | null => {
  const candidates = [
    data.paymentLink,
    data.paymentLinkUrl,
    data.invoiceUrl,
    data.url,
  ]
  for (const candidate of candidates) {
    if (typeof candidate === 'string' && candidate.length > 0) {
      return candidate
    }
  }
  return null
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const barberId = searchParams.get('barberId')
    const status = searchParams.get('status')

    const where: Record<string, unknown> = {}
    if (barberId) where.barberId = barberId
    if (status) where.status = status

    const subscriptions = await prisma.subscription.findMany({
      where,
      include: {
        barber: { select: { id: true, name: true } },
        client: { select: { id: true, name: true, email: true, whatsapp: true } },
      },
      orderBy: { createdAt: 'desc' },
    })

    return NextResponse.json({ success: true, subscriptions })
  } catch (error) {
    console.error('Erro ao carregar assinaturas:', error)
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as SubscriptionBody
    const {
      barberId,
      clientId,
      clientName,
      clientEmail,
      clientWhatsapp,
      amount,
      cycle,
    } = body

    const amountNumber = Number(amount)
    if (!barberId || !Number.isFinite(amountNumber) || amountNumber <= 0) {
      return NextResponse.json(
        { error: 'barberId e valor s\u00e3o obrigat\u00f3rios' },
        { status: 400 },
      )
    }

    let resolvedClientName = clientName?.trim() || ''
    let resolvedEmail = clientEmail?.trim() || ''
    let resolvedWhatsapp = clientWhatsapp?.trim() || ''
    let resolvedClientId = clientId
    let existingAsaasCustomerId = ''

    if (clientId) {
      const client = await prisma.user.findUnique({ where: { id: clientId } })
      if (client) {
        resolvedClientName = client.name || resolvedClientName
        resolvedEmail = client.email || resolvedEmail
        resolvedWhatsapp = client.whatsapp || resolvedWhatsapp
        existingAsaasCustomerId = client.asaasCustomerId || ''
      }
    }

    if (!resolvedClientName) {
      return NextResponse.json(
        { error: 'Nome do cliente obrigat\u00f3rio' },
        { status: 400 },
      )
    }

    if (!ASAAS_API_KEY) {
      return NextResponse.json({ error: 'ASAAS_API_KEY n\u00e3o configurada' }, { status: 500 })
    }

    let asaasCustomerId = existingAsaasCustomerId

    if (!asaasCustomerId) {
      const customerPayload = {
        name: resolvedClientName,
        email: resolvedEmail || undefined,
        mobilePhone: normalizeDigits(resolvedWhatsapp) || undefined,
      }

      const customerRes = await fetch(`${ASAAS_API_URL}/customers`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          access_token: ASAAS_API_KEY,
        },
        body: JSON.stringify(customerPayload),
      })

      const customerText = await customerRes.text()
      let customerData: Record<string, unknown> = {}
      try {
        customerData = customerText ? (JSON.parse(customerText) as Record<string, unknown>) : {}
      } catch (err) {
        customerData = { raw: customerText, parseError: (err as Error).message }
      }

      if (!customerRes.ok) {
        console.error('Falha ao criar cliente Asaas:', customerData)
        return NextResponse.json(
          { error: 'Falha ao criar cliente Asaas' },
          { status: customerRes.status },
        )
      }

      asaasCustomerId = typeof customerData.id === 'string' ? customerData.id : ''
      if (!asaasCustomerId) {
        return NextResponse.json(
          { error: 'Cliente Asaas criado sem id' },
          { status: 502 },
        )
      }

      if (clientId) {
        await prisma.user.update({
          where: { id: clientId },
          data: { asaasCustomerId },
        })
      }
    }

    const payload = {
      customer: asaasCustomerId,
      billingType: 'UNDEFINED',
      value: amountNumber,
      cycle: cycle || 'MONTHLY',
      nextDueDate: formatDateKey(new Date()),
    }

    const response = await fetch(`${ASAAS_API_URL}/subscriptions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        access_token: ASAAS_API_KEY,
      },
      body: JSON.stringify(payload),
    })

    const text = await response.text()
    let data: Record<string, unknown> = {}
    try {
      data = text ? (JSON.parse(text) as Record<string, unknown>) : {}
    } catch (err) {
      data = { raw: text, parseError: (err as Error).message }
    }

    if (!response.ok) {
      console.error('Falha ao criar assinatura Asaas:', data)
      return NextResponse.json(
        { error: 'Falha ao criar assinatura Asaas' },
        { status: response.status },
      )
    }

    const subscriptionId = typeof data.id === 'string' ? data.id : null
    const proposalUrl = pickUrl(data)
    const status = typeof data.status === 'string' ? data.status : 'active'

    const subscription = await prisma.subscription.create({
      data: {
        barberId,
        clientId: resolvedClientId || null,
        clientName: resolvedClientName,
        clientEmail: resolvedEmail || null,
        clientWhatsapp: resolvedWhatsapp || null,
        amount: amountNumber,
        cycle: payload.cycle,
        status,
        asaasCustomerId,
        asaasSubscriptionId: subscriptionId,
        proposalUrl,
      },
      include: {
        barber: { select: { id: true, name: true } },
        client: { select: { id: true, name: true, email: true, whatsapp: true } },
      },
    })

    return NextResponse.json({ success: true, subscription })
  } catch (error) {
    console.error('Erro ao criar assinatura:', error)
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 })
  }
}
