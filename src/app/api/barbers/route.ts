import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// GET - Buscar barbeiros disponíveis (público/admin)
export async function GET() {
  try {
    const barbers = await prisma.user.findMany({
      where: {
        role: 'BARBER',
        isActive: true,
      },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        isActive: true,
        createdAt: true,
      },
      orderBy: {
        name: 'asc',
      },
    })

    return NextResponse.json({ success: true, barbers })
  } catch (error) {
    console.error('Erro ao buscar barbeiros:', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 },
    )
  }
}

// POST - Criar barbeiro (público / API externa)
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { name, email, password, phone } = body as {
      name?: string
      email?: string
      password?: string
      phone?: string
    }

    if (!name || !email || !password) {
      return NextResponse.json(
        { error: 'Nome, email e senha são obrigatórios' },
        { status: 400 },
      )
    }

    const existing = await prisma.user.findUnique({
      where: { email },
    })

    if (existing) {
      return NextResponse.json(
        { error: 'Email já está em uso' },
        { status: 400 },
      )
    }

    const bcrypt = await import('bcryptjs')
    const hashedPassword = await bcrypt.default.hash(password, 12)

    const barber = await prisma.user.create({
      data: {
        name,
        email,
        password: hashedPassword,
        role: 'BARBER',
        phone: phone || null,
        isActive: true,
      },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        isActive: true,
        createdAt: true,
      },
    })

    return NextResponse.json(
      { success: true, barber },
      { status: 201 },
    )
  } catch (error) {
    console.error('Erro ao criar barbeiro:', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 },
    )
  }
}

