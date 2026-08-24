import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { appointmentIcsFilename, buildAppointmentIcs } from '@/lib/ics'
import { resolveSiteUrl } from '@/lib/business'

// Extrai o id de /api/appointments/[id]/ics (penúltimo segmento)
function getAppointmentId(request: NextRequest): string | null {
  const segments = request.nextUrl.pathname.split('/').filter(Boolean)
  const id = segments[segments.length - 2]
  return id && id !== '[id]' ? id : null
}

// GET - Baixar o arquivo .ics do agendamento (usado pelo botão do e-mail)
export async function GET(request: NextRequest) {
  try {
    const id = getAppointmentId(request)
    if (!id) {
      return NextResponse.json({ error: 'ID do agendamento é obrigatório' }, { status: 400 })
    }

    const appointment = await prisma.appointment.findUnique({
      where: { id },
      select: {
        id: true,
        date: true,
        startTime: true,
        endTime: true,
        status: true,
        clientName: true,
        barber: { select: { name: true } },
        service: { select: { name: true, duration: true } },
      },
    })

    if (!appointment) {
      return NextResponse.json({ error: 'Agendamento não encontrado' }, { status: 404 })
    }

    const siteUrl = resolveSiteUrl(request)

    const ics = buildAppointmentIcs({
      id: appointment.id,
      date: appointment.date,
      startTime: appointment.startTime,
      endTime: appointment.endTime,
      serviceName: appointment.service?.name,
      serviceDuration: appointment.service?.duration,
      barberName: appointment.barber?.name,
      clientName: appointment.clientName,
      status: appointment.status,
      url: `${siteUrl}/api/appointments/${appointment.id}/ics`,
    })

    if (!ics) {
      return NextResponse.json({ error: 'Não foi possível gerar o arquivo' }, { status: 422 })
    }

    return new NextResponse(ics, {
      status: 200,
      headers: {
        'Content-Type': 'text/calendar; charset=utf-8; method=PUBLISH',
        'Content-Disposition': `attachment; filename="${appointmentIcsFilename(appointment)}"`,
        'Cache-Control': 'no-store',
      },
    })
  } catch (error) {
    console.error('Erro ao gerar arquivo de calendário:', error)
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 })
  }
}
