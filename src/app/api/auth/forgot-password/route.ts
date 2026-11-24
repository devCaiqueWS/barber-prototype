import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { resolveSiteUrl } from '@/lib/business'
import { sendEmail } from '@/lib/email'
import {
  buildPasswordResetHtml,
  buildPasswordResetSubject,
  buildPasswordResetText,
} from '@/lib/email-templates/password-reset'
import {
  MAX_RESETS_PER_HOUR,
  countRecentResetRequests,
  createPasswordResetToken,
} from '@/lib/password-reset'

// POST - Pede o link de redefinição de senha.
// A resposta é sempre a mesma, exista a conta ou não, para não revelar quem tem cadastro.
export async function POST(request: NextRequest) {
  const body = (await request.json().catch(() => null)) as { email?: string } | null
  const email = (body?.email || '').trim().toLowerCase()

  if (!email) {
    return NextResponse.json({ error: 'Informe seu e-mail.' }, { status: 400 })
  }

  try {
    const user = await prisma.user.findUnique({
      where: { email },
      select: { id: true, name: true, role: true, isActive: true, isRegistered: true },
    })

    // Conta antiga auto-criada (sem cadastro) não tem senha própria: deve usar "Criar conta".
    const eligible =
      user && user.isActive && (user.role.toUpperCase() !== 'CLIENT' || user.isRegistered)

    if (eligible && (await countRecentResetRequests(user.id)) < MAX_RESETS_PER_HOUR) {
      const token = await createPasswordResetToken(user.id)
      const resetUrl = `${resolveSiteUrl(request)}/redefinir-senha?token=${token}`
      const result = await sendEmail({
        to: email,
        subject: buildPasswordResetSubject(),
        html: buildPasswordResetHtml({ name: user.name, resetUrl }),
        text: buildPasswordResetText({ name: user.name, resetUrl }),
      })
      if (!result.sent) {
        console.warn('[forgot-password] E-mail não enviado:', result.error || result.skipped)
      }
    }
  } catch (error) {
    console.error('[forgot-password] Erro:', error)
  }

  return NextResponse.json({ ok: true })
}
