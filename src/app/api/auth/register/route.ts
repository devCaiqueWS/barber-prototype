import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import bcrypt from 'bcryptjs'
import { signAuthToken, setAuthCookie } from '@/lib/client-auth'

// POST - Cadastro de cliente (obrigatório para agendar).
// Se o e-mail pertencer a uma conta antiga auto-criada (isRegistered=false),
// o cadastro "reivindica" essa conta, preservando o histórico de agendamentos.
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { name, email, password, whatsapp } = body as {
      name?: string
      email?: string
      password?: string
      whatsapp?: string
    }

    const normalizedEmail = (email || '').trim().toLowerCase()
    const trimmedName = (name || '').trim()

    if (!trimmedName || !normalizedEmail || !password) {
      return NextResponse.json(
        { error: 'Nome, e-mail e senha são obrigatórios.' },
        { status: 400 },
      )
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
      return NextResponse.json(
        { error: 'E-mail inválido.' },
        { status: 400 },
      )
    }

    if (password.length < 6) {
      return NextResponse.json(
        { error: 'A senha deve ter pelo menos 6 caracteres.' },
        { status: 400 },
      )
    }

    const hashedPassword = await bcrypt.hash(password, 10)

    const existing = await prisma.user.findUnique({
      where: { email: normalizedEmail },
    })

    let user
    if (existing) {
      if (existing.role !== 'CLIENT' || existing.isRegistered) {
        return NextResponse.json(
          { error: 'Este e-mail já possui uma conta. Faça login.' },
          { status: 409 },
        )
      }

      // Conta antiga auto-criada: assume a conta e mantém o histórico
      user = await prisma.user.update({
        where: { id: existing.id },
        data: {
          name: trimmedName,
          password: hashedPassword,
          whatsapp: whatsapp || existing.whatsapp,
          phone: whatsapp || existing.phone,
          isRegistered: true,
          registeredAt: new Date(),
          isActive: true,
        },
      })
    } else {
      user = await prisma.user.create({
        data: {
          name: trimmedName,
          email: normalizedEmail,
          password: hashedPassword,
          role: 'CLIENT',
          whatsapp: whatsapp || null,
          phone: whatsapp || null,
          isRegistered: true,
          registeredAt: new Date(),
        },
      })
    }

    // Assinatura criada no painel antes de o cliente ter conta. O e-mail não é
    // verificado no cadastro, então só vincula quando o WhatsApp também confere
    // com o registrado pela barbearia — evita alguém "herdar" a assinatura de outro.
    const whatsappDigits = (user.whatsapp || '').replace(/\D/g, '')
    if (whatsappDigits.length >= 10) {
      const orphans = await prisma.subscription.findMany({
        where: { clientId: null, clientEmail: { equals: normalizedEmail, mode: 'insensitive' } },
        select: { id: true, clientWhatsapp: true },
      })
      const matching = orphans
        .filter((s) => (s.clientWhatsapp || '').replace(/\D/g, '').endsWith(whatsappDigits.slice(-10)))
        .map((s) => s.id)
      if (matching.length > 0) {
        await prisma.subscription.updateMany({ where: { id: { in: matching } }, data: { clientId: user.id } })
      }
    }

    const token = signAuthToken(user)

    const response = NextResponse.json(
      {
        success: true,
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
          whatsapp: user.whatsapp,
        },
      },
      { status: 201 },
    )

    return setAuthCookie(response, token)
  } catch (error) {
    console.error('Erro no cadastro:', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 },
    )
  }
}
