import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { Prisma } from '@prisma/client'
import { requireStaff } from '@/lib/staff-auth'

function getIdFromRequest(request: NextRequest): string | null {
  const segments = request.nextUrl.pathname.split('/').filter(Boolean)
  const last = segments[segments.length - 1]
  return last && last !== '[id]' ? last : null
}

// GET - Buscar serviço por ID (admin)
export async function GET(request: NextRequest) {
  if (!(await requireStaff())) {
    return NextResponse.json({ error: 'Acesso negado' }, { status: 403 })
  }

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
        category: true,
        isActive: true,
        createdAt: true,
        _count: {
          select: {
            appointments: true,
          },
        },
      },
    })

    if (!service) {
      return NextResponse.json(
        { error: 'Serviço não encontrado' },
        { status: 404 },
      )
    }

    return NextResponse.json({ success: true, service })
  } catch (error) {
    console.error('Erro ao buscar serviço (admin):', error)
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 })
  }
}

// PUT - Atualizar serviço (admin)
export async function PUT(request: NextRequest) {
  if (!(await requireStaff(['ADMIN']))) {
    return NextResponse.json({ error: 'Acesso negado' }, { status: 403 })
  }

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
      isActive: isActiveFromBody,
      active,
    } = body as {
      name?: string
      description?: string
      price?: number | string
      duration?: number | string
      category?: string
      isActive?: boolean
      active?: boolean
    }

    let isActive = isActiveFromBody

    const existingService = await prisma.service.findUnique({ where: { id } })
    if (!existingService) {
      return NextResponse.json(
        { error: 'Serviço não encontrado' },
        { status: 404 },
      )
    }

    if (typeof isActive === 'undefined' && typeof active !== 'undefined') {
      isActive = !!active
    }

    const priceNumber =
      typeof price === 'string' ? parseFloat(price) : price
    const durationNumber =
      typeof duration === 'string' ? parseInt(duration, 10) : duration

    const data: Prisma.ServiceUpdateInput = {}

    if (typeof name === 'string') data.name = name
    if (typeof description === 'string') data.description = description
    if (typeof category === 'string') data.category = category
    if (typeof priceNumber === 'number' && !Number.isNaN(priceNumber)) {
      data.price = priceNumber
    }
    if (
      typeof durationNumber === 'number' &&
      !Number.isNaN(durationNumber)
    ) {
      data.duration = durationNumber
    }
    if (typeof isActive === 'boolean') {
      data.isActive = isActive
    }

    if (Object.keys(data).length === 0) {
      return NextResponse.json(
        { error: 'Nenhum campo para atualização informado' },
        { status: 400 },
      )
    }

    const updatedService = await prisma.service.update({
      where: { id },
      data,
      select: {
        id: true,
        name: true,
        description: true,
        price: true,
        duration: true,
        category: true,
        isActive: true,
        createdAt: true,
        _count: {
          select: {
            appointments: true,
          },
        },
      },
    })

    return NextResponse.json({ success: true, service: updatedService })
  } catch (error) {
    console.error('Erro ao atualizar serviço (admin):', error)
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 })
  }
}

// DELETE - Deletar ou desativar serviço (admin)
export async function DELETE(request: NextRequest) {
  if (!(await requireStaff(['ADMIN']))) {
    return NextResponse.json({ error: 'Acesso negado' }, { status: 403 })
  }

  try {
    const id = getIdFromRequest(request)
    if (!id) {
      return NextResponse.json(
        { error: 'ID do serviço é obrigatório' },
        { status: 400 },
      )
    }

    const existingService = await prisma.service.findUnique({ where: { id } })
    if (!existingService) {
      return NextResponse.json(
        { error: 'Serviço não encontrado' },
        { status: 404 },
      )
    }

    const appointmentsCount = await prisma.appointment.count({
      where: { serviceId: id },
    })

    if (appointmentsCount > 0) {
      const deactivated = await prisma.service.update({
        where: { id },
        data: { isActive: false },
        select: {
          id: true,
          name: true,
          isActive: true,
        },
      })

      return NextResponse.json({
        success: true,
        message:
          'Serviço desativado com sucesso (existem agendamentos associados)',
        service: deactivated,
      })
    }

    await prisma.service.delete({ where: { id } })

    return NextResponse.json({
      success: true,
      message: 'Serviço deletado com sucesso',
    })
  } catch (error) {
    console.error('Erro ao deletar serviço (admin):', error)
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 })
  }
}
