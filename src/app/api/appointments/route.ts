import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { formatDateKey, parseDateOnly } from '@/lib/date'
import { resolveSiteUrl } from '@/lib/business'
import { sendAppointmentConfirmationEmail } from '@/lib/appointment-email'
import { getAuthUser } from '@/lib/client-auth'
import { hasSlotConflict, paymentHoldDeadline, toMinutes, withSlotLock } from '@/lib/appointment-status'
import { AsaasError, createAppointmentCheckout, isAsaasConfigured } from '@/lib/asaas'
import { getActiveSubscription } from '@/lib/subscription'
import { ONLINE_PAYMENT_REQUIRED } from '@/lib/payment-config'
import { extraServicesGap } from '@/lib/extra-services'
import {
  appointmentAmountDue,
  checkoutItemsFor,
  parseExtraServiceIds,
  parseProductRequest,
  servicesSummary,
} from '@/lib/appointment-total'

// Normaliza objeto Date para string HH:mm
const toHHMM = (date: Date) => {
  const h = date.getHours().toString().padStart(2, '0')
  const m = date.getMinutes().toString().padStart(2, '0')
  return `${h}:${m}`
}

// POST - Criar novo agendamento (requer conta de cliente logada)
export async function POST(request: NextRequest) {
  try {
    const authUser = await getAuthUser(request)

    if (!authUser) {
      return NextResponse.json(
        { error: 'É necessário estar logado para agendar. Crie sua conta ou faça login.', needsAuth: true },
        { status: 401 },
      )
    }

    const body = await request.json()
    const {
      clientInstagram,
      clientWhatsapp,
      serviceId,
      barberId,
      date,
      time,
      dateTime,
      notes,
      products: requestedProductsRaw,
      extraServiceIds: extraServiceIdsRaw,
      dependentId: dependentIdRaw,
    } = body as {
      clientInstagram?: string
      clientWhatsapp?: string
      serviceId?: string
      barberId?: string
      date?: string
      time?: string
      dateTime?: string
      notes?: string
      products?: unknown
      extraServiceIds?: unknown
      dependentId?: unknown
    }

    // Corte para um dependente do titular: precisa ser dele e estar ativo
    let dependent: { id: string; name: string } | null = null
    if (dependentIdRaw !== undefined && dependentIdRaw !== null && dependentIdRaw !== '') {
      dependent =
        typeof dependentIdRaw === 'string'
          ? await prisma.dependent.findFirst({
              where: { id: dependentIdRaw, ownerId: authUser.id, isActive: true },
              select: { id: true, name: true },
            })
          : null
      if (!dependent) {
        return NextResponse.json({ error: 'Dependente não encontrado.' }, { status: 400 })
      }
    }

    // Identidade sempre vem da conta logada
    const clientName = authUser.name || ''
    const clientEmail = authUser.email
    const whatsapp = clientWhatsapp || authUser.whatsapp || authUser.phone || ''

    if (!clientName || !whatsapp || !serviceId || !barberId) {
      return NextResponse.json(
        { error: 'WhatsApp, serviço e barbeiro são obrigatórios.' },
        { status: 400 },
      )
    }

    const contactPhone = whatsapp
    const instagram = clientInstagram?.trim()
    const appointmentNotes = [instagram ? `Instagram: ${instagram}` : null, notes]
      .filter(Boolean)
      .join('\n')

    // Construir Date a partir de date+time ou dateTime
    let appointmentDateTime: Date | null = null
    if (dateTime) {
      const parsed = new Date(dateTime)
      if (!Number.isFinite(parsed.getTime())) {
        return NextResponse.json(
          { error: 'Data/hora inválida.' },
          { status: 400 },
        )
      }
      appointmentDateTime = parsed
    } else if (date && time) {
      const [hours, minutes] = time.split(':')
      const d = parseDateOnly(date)
      if (!d || !Number.isFinite(d.getTime())) {
        return NextResponse.json(
          { error: 'Data inválida.' },
          { status: 400 },
        )
      }
      d.setHours(Number.parseInt(hours, 10), Number.parseInt(minutes, 10), 0, 0)
      appointmentDateTime = d
    } else {
      return NextResponse.json(
        { error: 'Data e horário são obrigatórios.' },
        { status: 400 },
      )
    }

    const appointmentDateStr = formatDateKey(appointmentDateTime)
    const startTime = toHHMM(appointmentDateTime)

    // Carregar serviço para obter duração
    const service = await prisma.service.findUnique({
      where: { id: serviceId },
      select: { duration: true, name: true, price: true },
    })

    if (!service) {
      return NextResponse.json(
        { error: 'Serviço não encontrado.' },
        { status: 404 },
      )
    }

    // Produtos incluídos: o navegador manda só id e quantidade; nome e preço vêm do cadastro.
    const requestedProducts = parseProductRequest(requestedProductsRaw)
    if (!requestedProducts) {
      return NextResponse.json({ error: 'Lista de produtos inválida.' }, { status: 400 })
    }

    const catalog = requestedProducts.length
      ? await prisma.product.findMany({
          where: { id: { in: requestedProducts.map((p) => p.productId) }, isActive: true },
          select: { id: true, name: true, price: true },
        })
      : []

    if (catalog.length !== requestedProducts.length) {
      return NextResponse.json(
        {
          error: 'Um dos produtos escolhidos não está mais disponível. Revise os produtos e tente de novo.',
          productsUnavailable: true,
        },
        { status: 409 },
      )
    }

    const productItems = requestedProducts.map((requested) => {
      const product = catalog.find((p) => p.id === requested.productId)!
      return { productId: product.id, name: product.name, unitPrice: product.price, quantity: requested.quantity }
    })

    // Serviços adicionais: feitos em sequência no mesmo horário. O navegador manda só
    // os ids; nome, preço e duração vêm do cadastro, e o tempo total é conferido abaixo.
    const extraServiceIds = parseExtraServiceIds(extraServiceIdsRaw, serviceId)
    if (!extraServiceIds) {
      return NextResponse.json({ error: 'Lista de serviços adicionais inválida.' }, { status: 400 })
    }

    const extraCatalog = extraServiceIds.length
      ? await prisma.service.findMany({
          where: { id: { in: extraServiceIds }, isActive: true },
          select: { id: true, name: true, price: true, duration: true },
        })
      : []

    if (extraCatalog.length !== extraServiceIds.length) {
      return NextResponse.json(
        {
          error: 'Um dos serviços adicionais não está mais disponível. Revise sua escolha e tente de novo.',
          extrasUnavailable: true,
        },
        { status: 409 },
      )
    }

    const extraItems = extraServiceIds.map((id) => {
      const extra = extraCatalog.find((s) => s.id === id)!
      return { serviceId: extra.id, name: extra.name, price: extra.price, duration: extra.duration || 30 }
    })

    const durationMinutes =
      (service.duration || 30) + extraItems.reduce((sum, extra) => sum + extra.duration, 0)
    const startDT = new Date(appointmentDateTime)
    const endDT = new Date(startDT.getTime() + durationMinutes * 60 * 1000)
    const endTime = toHHMM(endDT)

    // Verificar conflitos de horário com base na duração real dos serviços
    const hasConflict = await hasSlotConflict({
      barberId,
      date: appointmentDateStr,
      startTime,
      durationMinutes,
    })

    if (hasConflict) {
      return NextResponse.json(
        {
          error: extraItems.length
            ? 'Não há mais tempo livre para os serviços adicionais nesse horário. Revise sua escolha.'
            : 'Horário não está mais disponível.',
          extrasUnavailable: extraItems.length > 0,
        },
        { status: 409 },
      )
    }

    // Respeitar bloqueios da agenda do barbeiro
    const override = await prisma.barberAvailability.findUnique({
      where: { barberId_date: { barberId, date: appointmentDateStr } },
    })

    if (override?.isDayBlocked) {
      return NextResponse.json(
        { error: 'Dia bloqueado para atendimento.' },
        { status: 409 },
      )
    }

    if (override && override.availableSlots.length > 0) {
      const allowedSet = new Set(override.availableSlots.map((s) => s.trim()))
      if (!allowedSet.has(startTime)) {
        return NextResponse.json(
          { error: 'Horário não permitido para este dia.' },
          { status: 409 },
        )
      }
    }

    if (override && override.blockedSlots.length > 0) {
      const blockedSet = new Set(override.blockedSlots.map((s) => s.trim()))
      if (blockedSet.has(startTime)) {
        return NextResponse.json(
          { error: 'Horário bloqueado na agenda do barbeiro.' },
          { status: 409 },
        )
      }

      // Os adicionais não podem avançar sobre um horário bloqueado pelo barbeiro
      if (extraItems.length > 0) {
        const startMin = toMinutes(startTime)
        const endMin = startMin + durationMinutes
        const invadesBlocked = override.blockedSlots.some((slot) => {
          const blockedMin = toMinutes(slot.trim())
          return blockedMin > startMin && blockedMin < endMin
        })
        if (invadesBlocked) {
          return NextResponse.json(
            {
              error: 'Não há tempo livre para os serviços adicionais nesse horário. Revise sua escolha.',
              extrasUnavailable: true,
            },
            { status: 409 },
          )
        }
      }
    }

    // Adicionais só valem se couberem antes do próximo horário ocupado ou do fim do expediente
    if (extraItems.length > 0) {
      const gapMinutes = await extraServicesGap({
        barberId,
        date: appointmentDateStr,
        startTime,
        mainDurationMinutes: service.duration || 30,
      })
      const extrasMinutes = extraItems.reduce((sum, extra) => sum + extra.duration, 0)
      if (extrasMinutes > gapMinutes) {
        return NextResponse.json(
          {
            error: 'Não há mais tempo livre para os serviços adicionais nesse horário. Revise sua escolha.',
            extrasUnavailable: true,
          },
          { status: 409 },
        )
      }
    }

    // Atualizar o contato da conta se o cliente informou um WhatsApp novo
    if (whatsapp && whatsapp !== authUser.whatsapp) {
      await prisma.user.update({
        where: { id: authUser.id },
        data: { whatsapp, phone: contactPhone },
      })
    }

    // Assinante ativo não paga os serviços. Com o pagamento online ligado, o resto
    // (serviços de quem não é assinante e produtos) é pago online antes de confirmar;
    // desligado, o agendamento é confirmado na hora e o cliente paga na barbearia.
    // A assinatura é do titular e intransferível: corte de dependente é cobrado.
    const subscription = dependent ? null : await getActiveSubscription(authUser.id)
    const hasCharge =
      service.price > 0 || productItems.length > 0 || extraItems.some((extra) => extra.price > 0)
    const paymentMethod = subscription
      ? 'assinatura'
      : !hasCharge
        ? 'gratuito'
        : ONLINE_PAYMENT_REQUIRED
          ? 'online'
          : 'no_local'
    const amountDue = appointmentAmountDue({
      paymentMethod,
      service,
      extraServices: extraItems,
      products: productItems,
    })
    const requiresPayment = ONLINE_PAYMENT_REQUIRED && amountDue > 0

    if (requiresPayment && !isAsaasConfigured()) {
      console.error('[appointments] ASAAS_API_KEY ausente — agendamento pago não pode ser criado.')
      return NextResponse.json(
        { error: 'Pagamento online indisponível no momento. Fale com a gente pelo WhatsApp para agendar.' },
        { status: 503 },
      )
    }

    // Checagem final e reserva sob a trava da agenda do barbeiro nesse dia:
    // duas pessoas não conseguem reservar o mesmo horário ao mesmo tempo.
    const appointment = await withSlotLock(barberId, appointmentDateStr, async (tx) => {
      const takenMeanwhile = await hasSlotConflict(
        { barberId, date: appointmentDateStr, startTime, durationMinutes },
        tx,
      )
      if (takenMeanwhile) return null

      return tx.appointment.create({
        data: {
          clientId: authUser.id,
          barberId,
          serviceId,
          date: appointmentDateStr,
          startTime,
          endTime,
          clientName,
          clientEmail,
          clientPhone: contactPhone || '',
          clientWhatsapp: whatsapp || '',
          paymentMethod,
          payOnline: requiresPayment,
          status: requiresPayment ? 'awaiting_payment' : 'confirmed',
          paymentExpiresAt: requiresPayment ? paymentHoldDeadline() : null,
          notes: appointmentNotes || undefined,
          source: 'online',
          dependentId: dependent?.id ?? null,
          dependentName: dependent?.name ?? null,
          products: productItems.length ? { create: productItems } : undefined,
          extraServices: extraItems.length ? { create: extraItems } : undefined,
        },
        include: {
          client: {
            select: {
              name: true,
              email: true,
            },
          },
          barber: {
            select: {
              name: true,
            },
          },
          service: {
            select: {
              name: true,
              price: true,
              duration: true,
            },
          },
          products: {
            select: { name: true, unitPrice: true, quantity: true },
          },
          extraServices: {
            select: { name: true, price: true, duration: true },
          },
        },
      })
    })

    if (!appointment) {
      return NextResponse.json({ error: 'Horário não está mais disponível.' }, { status: 409 })
    }

    const siteUrl = resolveSiteUrl(request)

    if (requiresPayment) {
      // Horário reservado; a confirmação (e o e-mail) chega pelo webhook do Asaas.
      try {
        const checkout = await createAppointmentCheckout({
          appointmentId: appointment.id,
          items: checkoutItemsFor(appointment),
          siteUrl,
          customer: {
            name: clientName,
            email: clientEmail,
            phone: whatsapp,
            cpf: authUser.cpf,
          },
        })

        await prisma.appointment.update({
          where: { id: appointment.id },
          data: { asaasCheckoutId: checkout.id },
        })

        return NextResponse.json(
          {
            success: true,
            requiresPayment: true,
            amountDue,
            checkoutUrl: checkout.url,
            paymentExpiresAt: appointment.paymentExpiresAt,
            appointment: {
              id: appointment.id,
              date: appointment.date,
              startTime: appointment.startTime,
              endTime: appointment.endTime,
              status: appointment.status,
              service: appointment.service,
              barber: appointment.barber,
              products: appointment.products,
              extraServices: appointment.extraServices,
            },
            message: 'Horário reservado. Conclua o pagamento para confirmar.',
          },
          { status: 201 },
        )
      } catch (checkoutError) {
        // Sem checkout não há como pagar: libera o horário na hora.
        console.error('[appointments] Falha ao criar checkout Asaas:', checkoutError)
        await prisma.appointment.delete({ where: { id: appointment.id } }).catch(() => undefined)
        const detail = checkoutError instanceof AsaasError ? ` (${checkoutError.message})` : ''
        return NextResponse.json(
          { error: `Não foi possível iniciar o pagamento${detail}. Tente novamente em instantes.` },
          { status: 502 },
        )
      }
    }

    // Confirmação por e-mail com o arquivo .ics anexado.
    // Uma falha aqui nunca invalida o agendamento já criado.
    let emailSent = false
    try {
      const result = await sendAppointmentConfirmationEmail({
        id: appointment.id,
        clientName: appointment.clientName,
        clientEmail: appointment.clientEmail,
        dependentName: appointment.dependentName,
        date: appointment.date,
        startTime: appointment.startTime,
        endTime: appointment.endTime,
        status: appointment.status,
        payOnline: appointment.payOnline,
        paymentMethod: appointment.paymentMethod,
        serviceName: servicesSummary(appointment).name,
        servicePrice: servicesSummary(appointment).price,
        serviceDuration: servicesSummary(appointment).duration,
        barberName: appointment.barber?.name,
        products: appointment.products,
        siteUrl,
      })

      emailSent = result.sent

      if (!result.sent) {
        console.warn(
          `[appointments] Confirmação não enviada para ${appointment.id}:`,
          result.skipped || result.error,
        )
      }
    } catch (emailError) {
      console.error('Erro ao enviar e-mail de confirmação:', emailError)
    }

    return NextResponse.json(
      {
        success: true,
        requiresPayment: false,
        emailSent,
        appointment: {
          id: appointment.id,
          date: appointment.date,
          startTime: appointment.startTime,
          endTime: appointment.endTime,
          status: appointment.status,
          payOnline: appointment.payOnline,
          paymentMethod: appointment.paymentMethod,
          dependentName: appointment.dependentName,
          client: appointment.client,
          barber: appointment.barber,
          service: appointment.service,
          products: appointment.products,
          extraServices: appointment.extraServices,
        },
        message: 'Agendamento criado com sucesso!',
      },
      { status: 201 },
    )
  } catch (error) {
    console.error('Erro ao criar agendamento:', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 },
    )
  }
}

