import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { formatDateKey, parseDateOnly } from '@/lib/date'
import { expireStaleHolds } from '@/lib/appointment-status'
import { extraServicesGap } from '@/lib/extra-services'

// GET - Serviços que ainda cabem logo depois do serviço principal, no horário escolhido.
// Devolve o tempo livre (gapMinutes) e os serviços ativos cuja duração cabe nele.
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const barberId = searchParams.get('barberId')
    const date = searchParams.get('date')
    const time = searchParams.get('time')
    const serviceId = searchParams.get('serviceId')

    if (!barberId || !date || !time || !serviceId) {
      return NextResponse.json({ error: 'barberId, date, time e serviceId são obrigatórios' }, { status: 400 })
    }

    const parsedDate = parseDateOnly(date)
    if (!parsedDate || !/^\d{2}:\d{2}$/.test(time)) {
      return NextResponse.json({ error: 'Data ou horário inválido' }, { status: 400 })
    }
    const dateStr = formatDateKey(parsedDate)

    const mainService = await prisma.service.findUnique({
      where: { id: serviceId },
      select: { duration: true },
    })
    if (!mainService) {
      return NextResponse.json({ error: 'Serviço não encontrado' }, { status: 404 })
    }

    await expireStaleHolds({ barberId, date: dateStr })

    const gapMinutes = await extraServicesGap({
      barberId,
      date: dateStr,
      startTime: time,
      mainDurationMinutes: mainService.duration || 30,
    })

    const services =
      gapMinutes > 0
        ? await prisma.service.findMany({
            where: { isActive: true, id: { not: serviceId }, duration: { lte: gapMinutes } },
            select: { id: true, name: true, description: true, price: true, duration: true },
            orderBy: { name: 'asc' },
          })
        : []

    return NextResponse.json({ success: true, gapMinutes, services })
  } catch (error) {
    console.error('Erro ao buscar serviços adicionais:', error)
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 })
  }
}
