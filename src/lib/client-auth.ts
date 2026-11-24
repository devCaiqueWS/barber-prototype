import { NextRequest, NextResponse } from 'next/server'
import jwt from 'jsonwebtoken'
import { createHash } from 'crypto'
import { prisma } from '@/lib/prisma'

const JWT_SECRET = process.env.JWT_SECRET || 'sua-chave-secreta-aqui'
const TOKEN_MAX_AGE = 60 * 60 * 24 * 7 // 7 dias

export interface AuthTokenPayload {
  userId: string
  email: string
  role: string
  /** Impressão da senha no login: trocar a senha derruba as sessões abertas */
  pwv?: string
}

// Muda sempre que a senha muda (o hash bcrypt é refeito). Não revela a senha.
export const passwordVersion = (passwordHash: string): string =>
  createHash('sha256').update(passwordHash).digest('hex').slice(0, 16)

// JWT do cliente (cookie auth-token), usado no login e no cadastro
export function signAuthToken(user: { id: string; email: string; role: string; password: string }) {
  return jwt.sign(
    { userId: user.id, email: user.email, role: user.role, pwv: passwordVersion(user.password) },
    JWT_SECRET,
    { expiresIn: '7d' },
  )
}

// Grava o cookie httpOnly de sessão na resposta
export function setAuthCookie(response: NextResponse, token: string) {
  response.cookies.set('auth-token', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: TOKEN_MAX_AGE,
    path: '/',
  })
  return response
}

// Lê e valida o cookie auth-token; retorna o usuário atual do banco ou null
export async function getAuthUser(request: NextRequest) {
  const token = request.cookies.get('auth-token')?.value
  if (!token) return null

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as AuthTokenPayload
    if (!decoded?.userId) return null

    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        phone: true,
        whatsapp: true,
        cpf: true,
        clientCode: true,
        isRegistered: true,
        isActive: true,
        password: true,
      },
    })

    if (!user || !user.isActive) return null
    // Senha trocada depois do login (ex.: "Esqueci a senha"): sessão não vale mais.
    // Tokens antigos, sem pwv, seguem válidos até expirar (no máximo 7 dias).
    if (decoded.pwv && decoded.pwv !== passwordVersion(user.password)) return null
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { password, ...safeUser } = user
    return safeUser
  } catch {
    return null
  }
}
