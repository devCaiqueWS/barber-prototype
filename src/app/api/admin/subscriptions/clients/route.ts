import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireStaff } from '@/lib/staff-auth'

type ClientOption = {
  clientId?: string | null
  clientCode?: number | null
  name: string
  email?: string | null
  whatsapp?: string | null
  hasCpf?: boolean
}

const toKey = (item: ClientOption) => {
  if (item.clientId) return `id:${item.clientId}`
  if (item.whatsapp) return `wa:${item.whatsapp.replace(/\D/g, '')}`
  if (item.email) return `email:${item.email.toLowerCase()}`
  return `name:${item.name.toLowerCase()}`
}

// Clientes que podem receber proposta de assinatura: primeiro os atendidos pelo
// barbeiro, depois todas as contas de cliente cadastradas.
export async function GET(request: NextRequest) {
  const staff = await requireStaff()
  if (!staff) return NextResponse.json({ error: 'Acesso negado' }, { status: 403 })

  try {
    const { searchParams } = new URL(request.url)
    const barberId = staff.role === 'BARBER' ? staff.id : searchParams.get('barberId')

    if (!barberId) {
      return NextResponse.json({ error: 'barberId obrigatório' }, { status: 400 })
    }

    const clientSelect = { id: true, clientCode: true, name: true, email: true, whatsapp: true, phone: true, cpf: true }

    const appointments = await prisma.appointment.findMany({
      where: { barberId, status: { not: 'cancelled' } },
      select: {
        clientId: true,
        clientName: true,
        clientEmail: true,
        clientWhatsapp: true,
        client: { select: clientSelect },
      },
      orderBy: { createdAt: 'desc' },
    })

    const registered = await prisma.user.findMany({
      where: { role: 'CLIENT', isRegistered: true, isActive: true },
      select: clientSelect,
      orderBy: { name: 'asc' },
    })

    const unique = new Map<string, ClientOption>()
    const add = (option: ClientOption) => {
      if (!option.name) return
      const key = toKey(option)
      if (!unique.has(key)) unique.set(key, option)
    }

    for (const appt of appointments) {
      add({
        clientId: appt.client?.id || appt.clientId,
        clientCode: appt.client?.clientCode ?? null,
        name: appt.client?.name || appt.clientName,
        email: appt.client?.email || appt.clientEmail,
        whatsapp: appt.client?.whatsapp || appt.client?.phone || appt.clientWhatsapp,
        hasCpf: Boolean(appt.client?.cpf),
      })
    }

    for (const user of registered) {
      add({
        clientId: user.id,
        clientCode: user.clientCode,
        name: user.name || user.email,
        email: user.email,
        whatsapp: user.whatsapp || user.phone,
        hasCpf: Boolean(user.cpf),
      })
    }

    return NextResponse.json({ success: true, clients: Array.from(unique.values()) })
  } catch (error) {
    console.error('Erro ao carregar clientes elegíveis:', error)
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 })
  }
}
