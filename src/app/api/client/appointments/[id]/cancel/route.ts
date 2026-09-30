import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getAuthUser } from '@/lib/client-auth'
import { cancelCheckout } from '@/lib/asaas'
import { CLIENT_CANCEL_MIN_HOURS, clientCanCancel } from '@/lib/client-hub'

// POST - Cliente cancela o próprio agendamento pelo Hub (sem pagamento online
// e com antecedência mínima). Pagos seguem pelo WhatsApp por causa do estorno.
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const authUser = await getAuthUser(request)
  if (!authUser) {
    return NextResponse.json({ error: 'É necessário estar logado.', needsAuth: true }, { status: 401 })
  }

  const { id } = await params

  try {
    const appointment = await prisma.appointment.findFirst({ where: { id, clientId: authUser.id } })
    if (!appointment) {
      return NextResponse.json({ error: 'Agendamento não encontrado.' }, { status: 404 })
    }

    if (!clientCanCancel(appointment)) {
      const reason = appointment.paidAt
        ? 'Agendamentos pagos são cancelados pelo WhatsApp, para combinarmos o estorno.'
        : `Só é possível cancelar pelo site até ${CLIENT_CANCEL_MIN_HOURS}h antes do horário. Fale com a gente pelo WhatsApp.`
      return NextResponse.json({ error: reason }, { status: 409 })
    }

    const result = await prisma.appointment.updateMany({
      where: { id: appointment.id, paidAt: null, status: appointment.status },
      data: {
        status: 'cancelled',
        notes: [appointment.notes, `Cancelado pelo cliente em ${new Date().toISOString()}`].filter(Boolean).join('\n'),
      },
    })

    if (result.count === 0) {
      return NextResponse.json(
        { error: 'Este agendamento acabou de ser atualizado. Recarregue a página.' },
        { status: 409 },
      )
    }

    if (appointment.status === 'awaiting_payment' && appointment.asaasCheckoutId) {
      await cancelCheckout(appointment.asaasCheckoutId)
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Erro ao cancelar agendamento do cliente:', error)
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 })
  }
}
