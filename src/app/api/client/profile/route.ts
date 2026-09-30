import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getAuthUser } from '@/lib/client-auth'
import { isValidCpfCnpj } from '@/lib/client-hub'

// PATCH - Cliente atualiza nome, WhatsApp e CPF pelo Hub.
// E-mail não muda por aqui: é o login e a chave de vínculo das assinaturas.
export async function PATCH(request: NextRequest) {
  const authUser = await getAuthUser(request)
  if (!authUser) {
    return NextResponse.json({ error: 'É necessário estar logado.', needsAuth: true }, { status: 401 })
  }

  let body: { name?: string; whatsapp?: string; cpf?: string }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Dados inválidos.' }, { status: 400 })
  }

  const data: { name?: string; whatsapp?: string; phone?: string; cpf?: string | null } = {}

  if (body.name !== undefined) {
    const name = body.name.trim()
    if (name.length < 2) return NextResponse.json({ error: 'Informe seu nome.' }, { status: 400 })
    data.name = name
  }

  if (body.whatsapp !== undefined) {
    const whatsapp = body.whatsapp.trim()
    if (whatsapp.replace(/\D/g, '').length < 10) {
      return NextResponse.json({ error: 'WhatsApp inválido. Use DDD + número.' }, { status: 400 })
    }
    data.whatsapp = whatsapp
    data.phone = whatsapp
  }

  if (body.cpf !== undefined) {
    const cpf = body.cpf.replace(/\D/g, '')
    if (cpf && !isValidCpfCnpj(cpf)) {
      return NextResponse.json({ error: 'CPF inválido.' }, { status: 400 })
    }
    data.cpf = cpf || null
  }

  try {
    const user = await prisma.user.update({
      where: { id: authUser.id },
      data,
      select: { name: true, whatsapp: true, cpf: true },
    })
    return NextResponse.json({
      success: true,
      user: { name: user.name, whatsapp: user.whatsapp || '', hasCpf: Boolean(user.cpf) },
    })
  } catch (error) {
    console.error('Erro ao atualizar perfil do cliente:', error)
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 })
  }
}
