import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// GET - Obter disponibilidade/bloqueios do barbeiro em um dia
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const barberId = searchParams.get('barberId')
    const date = searchParams.get('date') // YYYY-MM-DD

    if (!barberId || !date) {
      return NextResponse.json({ error: 'barberId e date são obrigatórios' }, { status: 400 })
    }

    const override = await prisma.barberAvailability.findUnique({
      where: { barberId_date: { barberId, date } }
    })

    return NextResponse.json({ success: true, availability: override })
  } catch (error) {
    console.error('Erro ao buscar disponibilidade do barbeiro:', error)
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 })
  }
}

// POST - Definir/atualizar disponibilidade ou bloqueios de um dia (barbeiro/admin)
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { barberId, date, availableSlots, blockedSlots, isDayBlocked } = body as {
      barberId?: string
      date?: string
      availableSlots?: string[]
      blockedSlots?: string[]
      isDayBlocked?: boolean
    }

    if (!barberId || !date) {
      return NextResponse.json({ error: 'barberId e date são obrigatórios' }, { status: 400 })
    }

    const upserted = await prisma.barberAvailability.upsert({
      where: { barberId_date: { barberId, date } },
      create: {
        barberId,
        date,
        availableSlots: availableSlots ?? [],
        blockedSlots: blockedSlots ?? [],
        isDayBlocked: isDayBlocked ?? false,
      },
      update: {
        ...(availableSlots !== undefined ? { availableSlots } : {}),
        ...(blockedSlots !== undefined ? { blockedSlots } : {}),
        ...(isDayBlocked !== undefined ? { isDayBlocked } : {}),
      }
    })

    return NextResponse.json({ success: true, availability: upserted })
  } catch (error) {
    console.error('Erro ao salvar disponibilidade do barbeiro:', error)
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 })
  }
}

