import { createHash, randomBytes } from 'crypto'
import { prisma } from '@/lib/prisma'

// Link de "Esqueci a senha": válido por 1 hora e de uso único.
export const RESET_TOKEN_TTL_MS = 60 * 60 * 1000
export const MAX_RESETS_PER_HOUR = 3

// Só o hash fica no banco: quem lê a tabela não consegue usar os links.
export const hashResetToken = (token: string): string =>
  createHash('sha256').update(token).digest('hex')

/** Conta os pedidos de reset do usuário na última hora. */
export async function countRecentResetRequests(userId: string): Promise<number> {
  return prisma.passwordResetToken.count({
    where: { userId, createdAt: { gt: new Date(Date.now() - 60 * 60 * 1000) } },
  })
}

/**
 * Cria um token novo e invalida os anteriores ainda não usados do mesmo usuário
 * (só o link mais recente funciona). Devolve o token em claro, para o e-mail.
 */
export async function createPasswordResetToken(userId: string): Promise<string> {
  const token = randomBytes(32).toString('hex')
  const now = new Date()

  await prisma.$transaction([
    prisma.passwordResetToken.updateMany({
      where: { userId, usedAt: null },
      data: { usedAt: now },
    }),
    prisma.passwordResetToken.create({
      data: {
        userId,
        tokenHash: hashResetToken(token),
        expiresAt: new Date(now.getTime() + RESET_TOKEN_TTL_MS),
      },
    }),
  ])

  return token
}
