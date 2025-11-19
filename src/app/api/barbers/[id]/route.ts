import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { Prisma } from '@prisma/client'

function getIdFromRequest(request: NextRequest): string | null {
  const segments = request.nextUrl.pathname.split('/').filter(Boolean)
  const last = segments[segments.length - 1]
  return last && last !== '[id]' ? last : null
}

// GET - Buscar barbeiro por ID (público)
export async function GET(request: NextRequest) {
  try {
    const id = getIdFromRequest(request)
    if (!id) {
      return NextResponse.json(
        { error: 'ID do barbeiro é obrigatório' },
        { status: 400 },
      )
    }

    const barber = await prisma.user.findFirst({
      where: {
        id,
        role: 'BARBER',
        isActive: true,
      },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
      },
    })

    if (!barber) {
      return NextResponse.json(
        { error: 'Barbeiro não encontrado' },
        { status: 404 },
      )
    }

    return NextResponse.json({ success: true, barber })
  } catch (error) {
    console.error('Erro ao buscar barbeiro:', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 },
    )
  }
}

// PUT - Atualizar barbeiro (público)
export async function PUT(request: NextRequest) {
  try {
    const id = getIdFromRequest(request)
    if (!id) {
      return NextResponse.json(
        { error: 'ID do barbeiro é obrigatório' },
        { status: 400 },
      )
    }

    const body = await request.json()
    const { name, email, password, phone, isActive } = body as {
      name?: string
      email?: string
      password?: string
      phone?: string
      isActive?: boolean
    }

    const existing = await prisma.user.findFirst({
      where: { id, role: 'BARBER' },
    })

    if (!existing) {
      return NextResponse.json(
        { error: 'Barbeiro não encontrado' },
        { status: 404 },
      )
    }

    if (email && email !== existing.email) {
      const emailExists = await prisma.user.findUnique({
        where: { email },
      })
      if (emailExists) {
        return NextResponse.json(
          { error: 'Email já está em uso' },
          { status: 400 },
        )
      }
    }

    const data: Prisma.UserUpdateInput = {}

    if (typeof name === 'string') data.name = name
    if (typeof email === 'string') data.email = email
    if (typeof phone === 'string') data.phone = phone
    if (typeof isActive === 'boolean') data.isActive = isActive

    if (password && password.trim().length > 0) {
      const bcrypt = await import('bcryptjs')
      const hashed = await bcrypt.default.hash(password, 12)
      data.password = hashed
    }

    if (Object.keys(data).length === 0) {
      return NextResponse.json(
        { error: 'Nenhum campo para atualização informado' },
        { status: 400 },
      )
    }

    const updated = await prisma.user.update({
      where: { id },
      data,
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        isActive: true,
      },
    })

    return NextResponse.json({ success: true, barber: updated })
  } catch (error) {
    console.error('Erro ao atualizar barbeiro:', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 },
    )
  }
}

// DELETE - Desativar ou deletar barbeiro (público)
export async function DELETE(request: NextRequest) {
  try {
    const id = getIdFromRequest(request)
    if (!id) {
      return NextResponse.json(
        { error: 'ID do barbeiro é obrigatório' },
        { status: 400 },
      )
    }

    const existing = await prisma.user.findFirst({
      where: { id, role: 'BARBER' },
    })

    if (!existing) {
      return NextResponse.json(
        { error: 'Barbeiro não encontrado' },
        { status: 404 },
      )
    }

    const today = new Date().toISOString().split('T')[0]
    const futureAppointments = await prisma.appointment.count({
      where: {
        barberId: id,
        date: {
          gt: today,
        },
        status: 'confirmed',
      },
    })

    if (futureAppointments > 0) {
      await prisma.user.update({
        where: { id },
        data: { isActive: false },
      })

      return NextResponse.json({
        success: true,
        message:
          'Barbeiro desativado (existem agendamentos futuros)',
      })
    }

    await prisma.user.delete({ where: { id } })

    return NextResponse.json({
      success: true,
      message: 'Barbeiro deletado com sucesso',
    })
  } catch (error) {
    console.error('Erro ao deletar barbeiro:', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 },
    )
  }
}
