import { NextRequest, NextResponse } from 'next/server'
import jwt from 'jsonwebtoken'
import { prisma } from '@/lib/prisma'

const JWT_SECRET = process.env.JWT_SECRET || 'sua-chave-secreta-aqui'
const TOKEN_MAX_AGE = 60 * 60 * 24 * 7 // 7 dias

export interface AuthTokenPayload {
  userId: string
  email: string
  role: string
}

// Gera o mesmo JWT usado em /api/auth/login
export function signAuthToken(user: { id: string; email: string; role: string }) {
  return jwt.sign(
    { userId: user.id, email: user.email, role: user.role },
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
        isRegistered: true,
        isActive: true,
      },
    })

    if (!user || !user.isActive) return null
    return user
  } catch {
    return null
  }
}
