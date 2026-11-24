import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getAuthUser } from '@/lib/client-auth'
import { MAX_DEPENDENTS, isRelationship, normalizeDependentName } from '@/lib/dependents'

const dependentSelect = { id: true, name: true, relationship: true } as const

const needsAuth = () =>
  NextResponse.json({ error: 'É necessário estar logado.', needsAuth: true }, { status: 401 })

// GET - Dependentes ativos do titular
export async function GET(request: NextRequest) {
  const authUser = await getAuthUser(request)
  if (!authUser) return needsAuth()

  try {
    const dependents = await prisma.dependent.findMany({
      where: { ownerId: authUser.id, isActive: true },
      orderBy: { name: 'asc' },
      select: dependentSelect,
    })
    return NextResponse.json({ dependents })
  } catch (error) {
    console.error('Erro ao listar dependentes:', error)
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 })
  }
}

// POST - Cadastra um dependente
export async function POST(request: NextRequest) {
  const authUser = await getAuthUser(request)
  if (!authUser) return needsAuth()

  try {
    const body = (await request.json().catch(() => null)) as { name?: unknown; relationship?: unknown } | null
    const name = normalizeDependentName(body?.name)
    if (!name) {
      return NextResponse.json({ error: 'Informe o nome do dependente (2 a 80 caracteres).' }, { status: 400 })
    }
    if (!isRelationship(body?.relationship)) {
      return NextResponse.json({ error: 'Escolha o parentesco.' }, { status: 400 })
    }

    const count = await prisma.dependent.count({ where: { ownerId: authUser.id, isActive: true } })
    if (count >= MAX_DEPENDENTS) {
      return NextResponse.json({ error: `Limite de ${MAX_DEPENDENTS} dependentes por conta.` }, { status: 400 })
    }

    const dependent = await prisma.dependent.create({
      data: { ownerId: authUser.id, name, relationship: body.relationship },
      select: dependentSelect,
    })
    return NextResponse.json({ dependent }, { status: 201 })
  } catch (error) {
    console.error('Erro ao cadastrar dependente:', error)
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 })
  }
}
