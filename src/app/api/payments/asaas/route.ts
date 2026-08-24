import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

const ASAAS_API_KEY = process.env.ASAAS_API_KEY
const ASAAS_API_URL = process.env.ASAAS_API_URL || 'https://sandbox.asaas.com/api/v3'

export async function POST(request: NextRequest) {
  if (!ASAAS_API_KEY) {
    return NextResponse.json({ error: 'ASAAS_API_KEY não configurada' }, { status: 500 })
  }

  try {
    const body = await request.json()
    const {
      appointmentId,
      serviceName,
      amount,
    } = body as {
      appointmentId?: string
      serviceName?: string
      amount?: number
    }

    const amountNumber = Number(amount)

    if (!appointmentId || !serviceName || Number.isNaN(amountNumber) || amountNumber <= 0) {
      return NextResponse.json(
        { error: 'Dados insuficientes para gerar checkout' },
        { status: 400 },
      )
    }

    const payload = {
      name: `Agendamento - ${serviceName}`,
      description: `Pagamento online do agendamento para ${serviceName}`,
      billingType: 'UNDEFINED',
      chargeType: 'DETACHED',
      value: amountNumber,
      externalReference: appointmentId,
      dueDateLimitDays: 3,
      maxInstallmentCount: 1,
    }

    const response = await fetch(`${ASAAS_API_URL}/paymentLinks`, {
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
    } catch (error) {
      data = { raw: text, parseError: (error as Error).message }
    }

    if (!response.ok) {
      console.error('Falha ao criar checkout Asaas:', data)
      return NextResponse.json(
        { error: 'Falha ao criar checkout Asaas' },
        { status: response.status },
      )
    }

    const checkoutUrl =
      (data.url as string | undefined) ||
      (data.paymentLinkUrl as string | undefined) ||
      (data.invoiceUrl as string | undefined)

    if (!checkoutUrl) {
      return NextResponse.json(
        { error: 'Checkout criado, mas nenhuma URL foi retornada' },
        { status: 502 },
      )
    }

    // Guarda o id do link no agendamento: é por ele que o webhook reconhece o
    // pagamento quando a cobrança não propaga o externalReference.
    const paymentLinkId = typeof data.id === 'string' ? data.id : null
    if (paymentLinkId) {
      try {
        await prisma.appointment.update({
          where: { id: appointmentId },
          data: { asaasPaymentLinkId: paymentLinkId },
        })
      } catch (linkError) {
        console.error('Falha ao vincular link de pagamento ao agendamento:', linkError)
      }
    }

    return NextResponse.json({
      checkoutUrl,
      asaasId: data.id,
    })
  } catch (error) {
    console.error('Erro ao gerar checkout Asaas:', error)
    return NextResponse.json(
      { error: 'Erro ao gerar checkout Asaas' },
      { status: 500 },
    )
  }
}
