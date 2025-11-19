import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { Prisma } from '@prisma/client'

function getIdFromRequest(request: NextRequest): string | null {
  const segments = request.nextUrl.pathname.split('/').filter(Boolean)
  const last = segments[segments.length - 1]
  return last && last !== '[id]' ? last : null
}

// GET - Buscar serviço por ID (público)
export async function GET(request: NextRequest) {
  try {
    const id = getIdFromRequest(request)
    if (!id) {
      return NextResponse.json(
        { error: 'ID do serviço é obrigatório' },
        { status: 400 },
      )
    }

    const service = await prisma.service.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        description: true,
        price: true,
        duration: true,
      },
    })

    if (!service || service === null) {
      return NextResponse.json(
        { error: 'Serviço não encontrado' },
        { status: 404 },
      )
    }

    return NextResponse.json({ success: true, service })
  } catch (error) {
    console.error('Erro ao buscar serviço:', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 },
    )
  }
}

// PUT - Atualizar serviço (público)
export async function PUT(request: NextRequest) {
  try {
    const id = getIdFromRequest(request)
    if (!id) {
      return NextResponse.json(
        { error: 'ID do serviço é obrigatório' },
        { status: 400 },
      )
    }

    const body = await request.json()
    const {
      name,
      description,
      price,
      duration,
      category,
      isActive,
    } = body as {
      name?: string
      description?: string
      price?: number | string
      duration?: number | string
      category?: string
      isActive?: boolean
    }

    const existing = await prisma.service.findUnique({ where: { id } })
    if (!existing) {
      return NextResponse.json(
        { error: 'Serviço não encontrado' },
        { status: 404 },
      )
    }

    const data: Prisma.ServiceUpdateInput = {}

    if (typeof name === 'string') data.name = name
    if (typeof description === 'string') data.description = description

    if (typeof price !== 'undefined') {
      const priceNumber =
        typeof price === 'string' ? parseFloat(price) : price
      if (!Number.isNaN(priceNumber as number)) {
        data.price = priceNumber
      }
    }

    if (typeof duration !== 'undefined') {
      const durationNumber =
        typeof duration === 'string' ? parseInt(duration, 10) : duration
      if (!Number.isNaN(durationNumber as number)) {
        data.duration = durationNumber
      }
    }

    if (typeof category === 'string') data.category = category
    if (typeof isActive === 'boolean') data.isActive = isActive

    if (Object.keys(data).length === 0) {
      return NextResponse.json(
        { error: 'Nenhum campo para atualização informado' },
        { status: 400 },
      )
    }

    const updated = await prisma.service.update({
      where: { id },
      data,
      select: {
        id: true,
        name: true,
        description: true,
        price: true,
        duration: true,
      },
    })

    return NextResponse.json({ success: true, service: updated })
  } catch (error) {
    console.error('Erro ao atualizar serviço:', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 },
    )
  }
}

// DELETE - Deletar ou desativar serviço (público)
export async function DELETE(request: NextRequest) {
  try {
    const id = getIdFromRequest(request)
    if (!id) {
      return NextResponse.json(
        { error: 'ID do serviço é obrigatório' },
        { status: 400 },
      )
    }

    const existing = await prisma.service.findUnique({ where: { id } })
    if (!existing) {
      return NextResponse.json(
        { error: 'Serviço não encontrado' },
        { status: 404 },
      )
    }

    const appointmentsCount = await prisma.appointment.count({
      where: { serviceId: id },
    })

    if (appointmentsCount > 0) {
      await prisma.service.update({
        where: { id },
        data: { isActive: false },
      })

      return NextResponse.json({
        success: true,
        message:
          'Serviço desativado (existem agendamentos associados)',
      })
    }

    await prisma.service.delete({ where: { id } })

    return NextResponse.json({
      success: true,
      message: 'Serviço deletado com sucesso',
    })
  } catch (error) {
    console.error('Erro ao deletar serviço:', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 },
    )
  }
}
