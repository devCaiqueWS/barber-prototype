import { NextRequest, NextResponse } from 'next/server'

import { prisma } from '@/lib/prisma'

// GET - Listar barbeiros
export async function GET(request: NextRequest) {
  try {
    const barbers = await prisma.user.findMany({
      where: {
        role: 'barber'
      },
      select: {
        id: true,
        name: true,
        email: true,
        createdAt: true,
        _count: {
          select: {
            barberAppointments: {
              where: {
                status: 'CONFIRMED'
              }
            }
          }
        }
      },
      orderBy: {
        name: 'asc'
      }
    })

    return NextResponse.json(barbers)
  } catch (error) {
    console.error('Erro ao buscar barbeiros:', error)
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 })
  }
}

// POST - Criar novo barbeiro
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
  const { name, email, phone, password } = body

    // Verificar se o email já existe
    const existingUser = await prisma.user.findUnique({
      where: { email }
    })

    if (existingUser) {
      return NextResponse.json({ error: 'Email já está em uso' }, { status: 400 })
    }

  // ...existing code...
  // const bcrypt = require('bcryptjs')
  // Use import instead of require
  const bcrypt = await import('bcryptjs')
  const hashedPassword = await bcrypt.default.hash(password, 12)

    const barber = await prisma.user.create({
      data: {
        name,
        email,
        password: hashedPassword,
        role: 'barber',
      },
      select: {
        id: true,
        name: true,
        email: true,
        createdAt: true
      }
    })

    return NextResponse.json(barber, { status: 201 })
  } catch (error) {
    console.error('Erro ao criar barbeiro:', error)
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 })
  }
}
