import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getAuthUser } from '@/lib/client-auth'
import { isRelationship, normalizeDependentName } from '@/lib/dependents'

type Params = { params: Promise<{ id: string }> }

const needsAuth = () =>
  NextResponse.json({ error: 'É necessário estar logado.', needsAuth: true }, { status: 401 })
const notFound = () => NextResponse.json({ error: 'Dependente não encontrado.' }, { status: 404 })

// PATCH - Edita nome e/ou parentesco
export async function PATCH(request: NextRequest, { params }: Params) {
  const authUser = await getAuthUser(request)
  if (!authUser) return needsAuth()

  try {
    const { id } = await params
    const body = (await request.json().catch(() => null)) as { name?: unknown; relationship?: unknown } | null
    const data: { name?: string; relationship?: string } = {}

    if (body?.name !== undefined) {
      const name = normalizeDependentName(body.name)
      if (!name) {
        return NextResponse.json({ error: 'Informe o nome do dependente (2 a 80 caracteres).' }, { status: 400 })
      }
      data.name = name
    }
    if (body?.relationship !== undefined) {
      if (!isRelationship(body.relationship)) {
        return NextResponse.json({ error: 'Escolha o parentesco.' }, { status: 400 })
      }
      data.relationship = body.relationship
    }

    const updated = await prisma.dependent.updateMany({
      where: { id, ownerId: authUser.id, isActive: true },
      data,
    })
    if (updated.count === 0) return notFound()

    const dependent = await prisma.dependent.findUnique({
      where: { id },
      select: { id: true, name: true, relationship: true },
    })
    return NextResponse.json({ dependent })
  } catch (error) {
    console.error('Erro ao editar dependente:', error)
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 })
  }
}

// DELETE - Remove da lista (o histórico de agendamentos continua com o nome)
export async function DELETE(request: NextRequest, { params }: Params) {
  const authUser = await getAuthUser(request)
  if (!authUser) return needsAuth()

  try {
    const { id } = await params
    const updated = await prisma.dependent.updateMany({
      where: { id, ownerId: authUser.id, isActive: true },
      data: { isActive: false },
    })
    if (updated.count === 0) return notFound()
    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error('Erro ao remover dependente:', error)
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 })
  }
}
