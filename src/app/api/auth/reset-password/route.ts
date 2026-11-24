import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { prisma } from '@/lib/prisma'
import { hashResetToken } from '@/lib/password-reset'

const INVALID_LINK = 'Link inválido ou expirado. Peça um novo.'

// POST - Troca a senha usando o token recebido por e-mail.
export async function POST(request: NextRequest) {
  const body = (await request.json().catch(() => null)) as { token?: string; password?: string } | null
  const token = (body?.token || '').trim()
  const password = body?.password || ''

  if (!token) {
    return NextResponse.json({ error: INVALID_LINK }, { status: 400 })
  }
  if (password.length < 6) {
    return NextResponse.json({ error: 'A senha deve ter pelo menos 6 caracteres.' }, { status: 400 })
  }

  try {
    const record = await prisma.passwordResetToken.findUnique({
      where: { tokenHash: hashResetToken(token) },
      select: {
        id: true,
        userId: true,
        usedAt: true,
        expiresAt: true,
        user: { select: { role: true, isActive: true } },
      },
    })

    if (!record || record.usedAt || record.expiresAt <= new Date() || !record.user.isActive) {
      return NextResponse.json({ error: INVALID_LINK }, { status: 400 })
    }

    const hashed = await bcrypt.hash(password, 10)

    // Marca o token como usado só se ainda não foi: dois envios simultâneos
    // do mesmo link não trocam a senha duas vezes.
    const changed = await prisma.$transaction(async (tx) => {
      const claimed = await tx.passwordResetToken.updateMany({
        where: { id: record.id, usedAt: null },
        data: { usedAt: new Date() },
      })
      if (claimed.count === 0) return false
      await tx.user.update({ where: { id: record.userId }, data: { password: hashed } })
      return true
    })

    if (!changed) {
      return NextResponse.json({ error: INVALID_LINK }, { status: 400 })
    }

    return NextResponse.json({ ok: true, role: record.user.role })
  } catch (error) {
    console.error('[reset-password] Erro:', error)
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 })
  }
}
