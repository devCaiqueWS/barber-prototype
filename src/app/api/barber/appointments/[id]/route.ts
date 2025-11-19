import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

function getIdFromRequest(request: NextRequest): string | null {
  const segments = request.nextUrl.pathname.split('/').filter(Boolean)
  const last = segments[segments.length - 1]
  return last && last !== '[id]' ? last : null
}

async function getBarberSession() {
  const session = await getServerSession(authOptions)
  const role = (session?.user as { role?: string })?.role
  const id = (session?.user as { id?: string })?.id

  if (!session || !id || (role !== 'BARBER' && role !== 'barber')) {
    return null
  }

  return { session, barberId: id }
}

// GET - Buscar um agendamento específico do barbeiro
export async function GET(request: NextRequest) {
  try {
    const auth = await getBarberSession()
    if (!auth) {
      return NextResponse.json({ error: 'Acesso negado' }, { status: 403 })
    }

    const id = getIdFromRequest(request)
    if (!id) {
      return NextResponse.json(
        { error: 'ID do agendamento é obrigatório' },
        { status: 400 },
      )
    }

    const appointment = await prisma.appointment.findFirst({
      where: {
        id,
        barberId: auth.barberId,
      },
      include: {
        client: {
          select: {
            name: true,
            email: true,
            phone: true,
          },
        },
        service: {
          select: {
            name: true,
            price: true,
            duration: true,
          },
        },
      },
    })

    if (!appointment) {
      return NextResponse.json(
        { error: 'Agendamento não encontrado' },
        { status: 404 },
      )
    }

    return NextResponse.json({ success: true, appointment })
  } catch (error) {
    console.error('Erro ao buscar agendamento (barber):', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 },
    )
  }
}

// PATCH - Atualizar parcialmente (status, notas, forma de pagamento)
export async function PATCH(request: NextRequest) {
  try {
    const auth = await getBarberSession()
    if (!auth) {
      return NextResponse.json({ error: 'Acesso negado' }, { status: 403 })
    }

    const id = getIdFromRequest(request)
    if (!id) {
      return NextResponse.json(
        { error: 'ID do agendamento é obrigatório' },
        { status: 400 },
      )
    }

    const body = await request.json()
    const { status, notes, paymentMethod } = body as {
      status?: string
      notes?: string
      paymentMethod?: string
    }

    if (!status && !notes && !paymentMethod) {
      return NextResponse.json(
        { error: 'Nenhum campo para atualização informado' },
        { status: 400 },
      )
    }

    const existing = await prisma.appointment.findFirst({
      where: { id, barberId: auth.barberId },
    })
    if (!existing) {
      return NextResponse.json(
        { error: 'Agendamento não encontrado' },
        { status: 404 },
      )
    }

    const updated = await prisma.appointment.update({
      where: { id },
      data: {
        ...(status ? { status } : {}),
        ...(typeof notes === 'string' ? { notes } : {}),
        ...(typeof paymentMethod === 'string' ? { paymentMethod } : {}),
      },
    })

    return NextResponse.json({ success: true, appointment: updated })
  } catch (error) {
    console.error('Erro ao atualizar agendamento (barber):', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 },
    )
  }
}

// DELETE - Excluir agendamento do barbeiro
export async function DELETE(request: NextRequest) {
  try {
    const auth = await getBarberSession()
    if (!auth) {
      return NextResponse.json({ error: 'Acesso negado' }, { status: 403 })
    }

    const id = getIdFromRequest(request)
    if (!id) {
      return NextResponse.json(
        { error: 'ID do agendamento é obrigatório' },
        { status: 400 },
      )
    }

    const existing = await prisma.appointment.findFirst({
      where: { id, barberId: auth.barberId },
    })
    if (!existing) {
      return NextResponse.json(
        { error: 'Agendamento não encontrado' },
        { status: 404 },
      )
    }

    await prisma.appointment.delete({ where: { id } })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Erro ao excluir agendamento (barber):', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 },
    )
  }
}

