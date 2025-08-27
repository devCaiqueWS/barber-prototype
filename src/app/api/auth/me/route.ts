import { NextRequest, NextResponse } from 'next/server'
import jwt from 'jsonwebtoken'
import { prisma } from '@/lib/prisma'

export async function GET(request: NextRequest) {
  try {
    console.log('Auth ME called - checking cookies')
    const token = request.cookies.get('auth-token')?.value
    console.log('Token found:', !!token)

    if (!token) {
      console.log('No token found, returning null user')
      return NextResponse.json({ user: null })
    }

    // Verificar token
    const decoded = jwt.verify(
      token, 
      process.env.JWT_SECRET || 'sua-chave-secreta-aqui'
    ) as { userId: string }

    console.log('Token decoded successfully, userId:', decoded.userId)

    // Buscar usuário atual
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      select: {
        id: true,
        name: true,
        email: true,
        role: true
      }
    })

    if (!user) {
      console.log('User not found in database')
      return NextResponse.json({ user: null })
    }

    console.log('User found and returning:', { id: user.id, role: user.role })
    return NextResponse.json({ 
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role
      }
    })
  } catch (error) {
    console.error('Erro ao verificar sessão:', error)
    return NextResponse.json({ user: null })
  }
}
