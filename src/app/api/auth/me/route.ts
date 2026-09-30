import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/client-auth'
import { getActiveSubscription } from '@/lib/subscription'

export async function GET(request: NextRequest) {
  try {
    const user = await getAuthUser(request)
    if (!user) return NextResponse.json({ user: null })

    // Assinante ativo agenda sem pagamento online
    const subscription = user.role === 'CLIENT' ? await getActiveSubscription(user.id) : null

    return NextResponse.json({
      user: {
        id: user.id,
        clientCode: user.clientCode,
        name: user.name,
        email: user.email,
        role: user.role,
        whatsapp: user.whatsapp || user.phone || '',
        isSubscriber: Boolean(subscription),
      },
    })
  } catch (error) {
    console.error('Erro ao verificar sessão:', error)
    return NextResponse.json({ user: null })
  }
}
