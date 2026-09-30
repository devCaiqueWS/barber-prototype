import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { formatDateKey } from '@/lib/date'
import { asaasRequest, AsaasError, isAsaasConfigured, onlyDigits } from '@/lib/asaas'
import { requireStaff } from '@/lib/staff-auth'

type SubscriptionBody = {
  barberId?: string
  clientId?: string
  clientName?: string
  clientEmail?: string
  clientWhatsapp?: string
  cpf?: string
  amount?: number
  cycle?: string
  provider?: string
}

const CYCLES = new Set(['WEEKLY', 'BIWEEKLY', 'MONTHLY', 'BIMONTHLY', 'QUARTERLY', 'SEMIANNUALLY', 'YEARLY'])

// Nomes antigos da tela → nomes aceitos pelo Asaas
const normalizeCycle = (cycle?: string) => {
  const upper = (cycle || 'MONTHLY').toUpperCase()
  if (upper === 'SEMIANNUAL') return 'SEMIANNUALLY'
  return CYCLES.has(upper) ? upper : 'MONTHLY'
}

const subscriptionInclude = {
  barber: { select: { id: true, name: true } },
  client: { select: { id: true, name: true, email: true, whatsapp: true, clientCode: true } },
} as const

export async function GET(request: NextRequest) {
  const staff = await requireStaff()
  if (!staff) return NextResponse.json({ error: 'Acesso negado' }, { status: 403 })

  try {
    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status')
    // Barbeiro só enxerga as próprias assinaturas
    const barberId = staff.role === 'BARBER' ? staff.id : searchParams.get('barberId')

    const where: Record<string, unknown> = {}
    if (barberId) where.barberId = barberId
    if (status) where.status = status

    const subscriptions = await prisma.subscription.findMany({
      where,
      include: subscriptionInclude,
      orderBy: { createdAt: 'desc' },
    })

    return NextResponse.json({ success: true, subscriptions })
  } catch (error) {
    console.error('Erro ao carregar assinaturas:', error)
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  const staff = await requireStaff()
  if (!staff) return NextResponse.json({ error: 'Acesso negado' }, { status: 403 })

  try {
    const body = (await request.json()) as SubscriptionBody
    const provider = body.provider === 'manual' ? 'manual' : 'asaas'
    const barberId = staff.role === 'BARBER' ? staff.id : body.barberId
    const amountNumber = Number(body.amount)
    const cycle = normalizeCycle(body.cycle)

    if (!barberId || !Number.isFinite(amountNumber) || amountNumber <= 0) {
      return NextResponse.json({ error: 'Barbeiro e valor são obrigatórios' }, { status: 400 })
    }

    // Vincula à conta do cliente: pelo id escolhido, senão pelo e-mail ou WhatsApp.
    // Sem conta ainda, a assinatura é vinculada quando o cliente se cadastrar com o mesmo e-mail.
    const email = body.clientEmail?.trim().toLowerCase() || ''
    const whatsappDigits = onlyDigits(body.clientWhatsapp)
    let client = body.clientId ? await prisma.user.findUnique({ where: { id: body.clientId } }) : null
    if (!client && email) {
      client = await prisma.user.findUnique({ where: { email } })
    }
    if (!client && whatsappDigits.length >= 10) {
      const candidates = await prisma.user.findMany({
        where: { role: 'CLIENT', OR: [{ whatsapp: { not: null } }, { phone: { not: null } }] },
        select: { id: true, whatsapp: true, phone: true },
      })
      const match = candidates.find(
        (c) => onlyDigits(c.whatsapp) === whatsappDigits || onlyDigits(c.phone) === whatsappDigits,
      )
      if (match) client = await prisma.user.findUnique({ where: { id: match.id } })
    }
    if (client && client.role !== 'CLIENT') client = null

    const clientName = client?.name || body.clientName?.trim() || ''
    const clientEmail = client?.email || email || null
    const clientWhatsapp = client?.whatsapp || client?.phone || body.clientWhatsapp?.trim() || null
    const cpf = onlyDigits(body.cpf) || onlyDigits(client?.cpf)

    if (!clientName) {
      return NextResponse.json({ error: 'Nome do cliente obrigatório' }, { status: 400 })
    }

    if (client) {
      const existing = await prisma.subscription.findFirst({
        where: { clientId: client.id, status: { in: ['active', 'pending', 'overdue'] } },
      })
      if (existing) {
        return NextResponse.json(
          { error: 'Este cliente já tem uma assinatura em andamento. Cancele a atual antes de criar outra.' },
          { status: 409 },
        )
      }
    }

    if (client && cpf && cpf !== client.cpf) {
      await prisma.user.update({ where: { id: client.id }, data: { cpf } })
    }

    // Assinatura manual: paga fora do Asaas (balcão), ativa na hora.
    if (provider === 'manual') {
      const subscription = await prisma.subscription.create({
        data: {
          barberId,
          clientId: client?.id || null,
          clientName,
          clientEmail,
          clientWhatsapp,
          amount: amountNumber,
          cycle,
          status: 'active',
          provider: 'manual',
          lastPaymentAt: new Date(),
        },
        include: subscriptionInclude,
      })
      return NextResponse.json({ success: true, subscription })
    }

    if (!isAsaasConfigured()) {
      return NextResponse.json({ error: 'ASAAS_API_KEY não configurada' }, { status: 503 })
    }

    if (cpf.length !== 11 && cpf.length !== 14) {
      return NextResponse.json(
        { error: 'Informe o CPF (ou CNPJ) do cliente: o Asaas exige para criar a assinatura.' },
        { status: 400 },
      )
    }

    let asaasCustomerId = client?.asaasCustomerId || ''
    if (!asaasCustomerId) {
      const customer = await asaasRequest<{ id?: string }>('/customers', {
        method: 'POST',
        body: {
          name: clientName,
          cpfCnpj: cpf,
          email: clientEmail || undefined,
          mobilePhone: onlyDigits(clientWhatsapp) || undefined,
          externalReference: client?.id,
          notificationDisabled: false,
        },
      })
      asaasCustomerId = customer.id || ''
      if (!asaasCustomerId) {
        return NextResponse.json({ error: 'Asaas não retornou o cliente criado' }, { status: 502 })
      }
      if (client) {
        await prisma.user.update({ where: { id: client.id }, data: { asaasCustomerId } })
      }
    }

    const asaasSubscription = await asaasRequest<{ id?: string }>('/subscriptions', {
      method: 'POST',
      body: {
        customer: asaasCustomerId,
        billingType: 'UNDEFINED',
        value: amountNumber,
        cycle,
        nextDueDate: formatDateKey(new Date()),
        description: `Assinatura ${clientName}`,
        externalReference: client?.id,
      },
    })

    // Link da primeira mensalidade, enviado ao cliente junto com a proposta
    let proposalUrl: string | null = null
    if (asaasSubscription.id) {
      try {
        const payments = await asaasRequest<{ data?: { invoiceUrl?: string }[] }>(
          `/subscriptions/${asaasSubscription.id}/payments`,
        )
        proposalUrl = payments.data?.[0]?.invoiceUrl || null
      } catch {
        // sem link a proposta segue só com os termos
      }
    }

    // Só vira 'active' quando o webhook confirmar o primeiro pagamento
    const subscription = await prisma.subscription.create({
      data: {
        barberId,
        clientId: client?.id || null,
        clientName,
        clientEmail,
        clientWhatsapp,
        amount: amountNumber,
        cycle,
        status: 'pending',
        provider: 'asaas',
        asaasCustomerId,
        asaasSubscriptionId: asaasSubscription.id || null,
        proposalUrl,
      },
      include: subscriptionInclude,
    })

    return NextResponse.json({ success: true, subscription })
  } catch (error) {
    console.error('Erro ao criar assinatura:', error)
    if (error instanceof AsaasError) {
      return NextResponse.json({ error: `Asaas: ${error.message}` }, { status: 502 })
    }
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 })
  }
}
