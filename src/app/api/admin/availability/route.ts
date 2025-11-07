import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// GET - Listar overrides de disponibilidade
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const barberId = searchParams.get('barberId')
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')

    const where: any = {}
    if (barberId) where.barberId = barberId
    if (startDate && endDate) {
      where.date = { gte: startDate, lte: endDate }
    } else if (startDate) {
      where.date = { gte: startDate }
    } else if (endDate) {
      where.date = { lte: endDate }
    }

    const overrides = await prisma.barberAvailability.findMany({ where, orderBy: { date: 'asc' } })
    return NextResponse.json({ success: true, overrides })
  } catch (error) {
    console.error('Erro ao listar disponibilidade/admin:', error)
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 })
  }
}

// POST - Bloquear/definir disponibilidade (merge por padrão)
export async function POST(request: NextRequest) {
  try {
    const { barberId, date, blockedSlots = [], isDayBlocked = false, availableSlots, mode = 'add' } = await request.json()
    if (!barberId || !date) {
      return NextResponse.json({ error: 'barberId e date são obrigatórios' }, { status: 400 })
    }

    const existing = await prisma.barberAvailability.findUnique({ where: { barberId_date: { barberId, date } } })
    const mergedBlocked = new Set([...(existing?.blockedSlots ?? []), ...blockedSlots])

    const updated = await prisma.barberAvailability.upsert({
      where: { barberId_date: { barberId, date } },
      create: {
        barberId,
        date,
        isDayBlocked,
        availableSlots: availableSlots ?? [],
        blockedSlots: Array.from(mergedBlocked)
      },
      update: {
        isDayBlocked,
        ...(availableSlots !== undefined
          ? { availableSlots: mode === 'set' ? availableSlots : Array.from(new Set([...(existing?.availableSlots ?? []), ...availableSlots])) }
          : {}),
        blockedSlots: Array.from(mergedBlocked)
      }
    })

    return NextResponse.json({ success: true, availability: updated })
  } catch (error) {
    console.error('Erro ao atualizar disponibilidade/admin:', error)
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 })
  }
}

// DELETE - Desbloquear horário ou remover override do dia
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const barberId = searchParams.get('barberId')
    const date = searchParams.get('date')
    const slot = searchParams.get('slot')
    const clearDay = searchParams.get('clearDay') === 'true'
    if (!barberId || !date) {
      return NextResponse.json({ error: 'barberId e date são obrigatórios' }, { status: 400 })
    }

    if (clearDay) {
      await prisma.barberAvailability.delete({ where: { barberId_date: { barberId, date } } })
      return NextResponse.json({ success: true })
    }

    if (slot) {
      const existing = await prisma.barberAvailability.findUnique({ where: { barberId_date: { barberId, date } } })
      if (!existing) return NextResponse.json({ success: true })
      const blockedSlots = (existing.blockedSlots || []).filter(s => s !== slot)
      const updated = await prisma.barberAvailability.update({
        where: { barberId_date: { barberId, date } },
        data: { blockedSlots }
      })
      return NextResponse.json({ success: true, availability: updated })
    }

    return NextResponse.json({ error: 'Informe slot ou clearDay=true' }, { status: 400 })
  } catch (error) {
    console.error('Erro ao desbloquear horário/admin:', error)
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 })
  }
}

