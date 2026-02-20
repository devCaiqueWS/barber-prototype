import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

type ClientOption = {
  clientId?: string | null
  name: string
  email?: string | null
  whatsapp?: string | null
}

const toKey = (item: ClientOption) => {
  if (item.clientId) return `id:${item.clientId}`
  if (item.whatsapp) return `wa:${item.whatsapp.replace(/\D/g, '')}`
  if (item.email) return `email:${item.email.toLowerCase()}`
  return `name:${item.name.toLowerCase()}`
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const barberId = searchParams.get('barberId')

    if (!barberId) {
      return NextResponse.json({ error: 'barberId obrigat\u00f3rio' }, { status: 400 })
    }

    const appointments = await prisma.appointment.findMany({
      where: { barberId, status: { not: 'cancelled' } },
      select: {
        clientId: true,
        clientName: true,
        clientEmail: true,
        clientWhatsapp: true,
        client: {
          select: {
            id: true,
            name: true,
            email: true,
            whatsapp: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    })

    const unique = new Map<string, ClientOption>()

    for (const appt of appointments) {
      const option: ClientOption = {
        clientId: appt.client?.id || appt.clientId,
        name: appt.client?.name || appt.clientName,
        email: appt.client?.email || appt.clientEmail,
        whatsapp: appt.client?.whatsapp || appt.clientWhatsapp,
      }
      if (!option.name) continue
      const key = toKey(option)
      if (!unique.has(key)) {
        unique.set(key, option)
      }
    }

    return NextResponse.json({
      success: true,
      clients: Array.from(unique.values()),
    })
  } catch (error) {
    console.error('Erro ao carregar clientes elegiveis:', error)
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 })
  }
}
