import { BRAND_COLORS, BUSINESS, formatBRL, whatsappLink } from '../business'
import { formatDateBR, parseDateOnly } from '../date'

export type AppointmentEmailData = {
  id: string
  /** YYYY-MM-DD */
  date: string
  /** HH:mm */
  startTime: string
  endTime?: string | null
  status?: string | null
  clientName: string
  serviceName?: string | null
  servicePrice?: number | null
  serviceDuration?: number | null
  barberName?: string | null
  paymentMethod?: string | null
  payOnline?: boolean
  /** Link absoluto para baixar o arquivo .ics */
  icsUrl: string
}

const PAYMENT_LABELS: Record<string, string> = {
  dinheiro: 'Dinheiro',
  pix: 'PIX',
  cartao_credito: 'Cartão de crédito',
  cartao_debito: 'Cartão de débito',
  credito: 'Cartão de crédito',
  debito: 'Cartão de débito',
}

const formatPaymentMethod = (value?: string | null): string => {
  if (!value) return 'A combinar'
  return PAYMENT_LABELS[value.trim().toLowerCase()] || value
}

const formatWeekday = (date: string): string => {
  const parsed = parseDateOnly(date)
  if (!parsed) return ''
  const weekday = parsed.toLocaleDateString('pt-BR', { weekday: 'long' })
  return weekday.charAt(0).toUpperCase() + weekday.slice(1)
}

const escapeHtml = (value: string) =>
  value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')

type Row = { label: string; value: string }

const buildRows = (data: AppointmentEmailData): Row[] => {
  const weekday = formatWeekday(data.date)
  const dateLabel = weekday ? `${weekday}, ${formatDateBR(data.date)}` : formatDateBR(data.date)
  const timeLabel = data.endTime ? `${data.startTime} às ${data.endTime}` : data.startTime
  const price = formatBRL(data.servicePrice ?? null)

  return [
    { label: 'Serviço', value: data.serviceName || 'Atendimento' },
    { label: 'Profissional', value: data.barberName || 'A definir' },
    { label: 'Data', value: dateLabel },
    {
      label: 'Horário',
      value: data.serviceDuration ? `${timeLabel} (${data.serviceDuration} min)` : timeLabel,
    },
    ...(price ? [{ label: 'Valor', value: price }] : []),
    {
      label: 'Pagamento',
      value: data.payOnline
        ? `${formatPaymentMethod(data.paymentMethod)} — online`
        : `${formatPaymentMethod(data.paymentMethod)} — no local`,
    },
    { label: 'Endereço', value: BUSINESS.address },
  ]
}

export const buildAppointmentConfirmationSubject = (data: AppointmentEmailData): string => {
  const prefix = data.status === 'pending' ? 'Agendamento recebido' : 'Agendamento confirmado'
  return `${prefix} — ${formatDateBR(data.date)} às ${data.startTime} | ${BUSINESS.name}`
}

export const buildAppointmentConfirmationText = (data: AppointmentEmailData): string => {
  const isPending = data.status === 'pending'
  const rows = buildRows(data)

  return [
    `Olá, ${data.clientName}!`,
    '',
    isPending
      ? 'Recebemos seu agendamento. Ele será confirmado assim que o pagamento online for identificado.'
      : 'Seu agendamento está confirmado. Te esperamos!',
    '',
    ...rows.map((row) => `${row.label}: ${row.value}`),
    '',
    'Salve na agenda do seu celular:',
    data.icsUrl,
    '(o arquivo .ics também está anexado a este e-mail)',
    '',
    `Precisa remarcar ou cancelar? Fale com a gente no WhatsApp ${BUSINESS.phone}.`,
    '',
    BUSINESS.name,
    BUSINESS.address,
  ].join('\n')
}

export const buildAppointmentConfirmationHtml = (data: AppointmentEmailData): string => {
  const isPending = data.status === 'pending'
  const rows = buildRows(data)

  const headline = isPending ? 'Agendamento recebido' : 'Agendamento confirmado'
  const intro = isPending
    ? 'Recebemos seu agendamento. Assim que o pagamento online for identificado ele será confirmado automaticamente.'
    : 'Está tudo certo. Guardamos seu horário e te esperamos no estúdio.'

  const rowsHtml = rows
    .map(
      (row, index) => `
              <tr>
                <td style="padding:14px 0;border-top:${index === 0 ? 'none' : `1px solid ${BRAND_COLORS.graphite}`};font-family:Arial,Helvetica,sans-serif;font-size:12px;letter-spacing:1px;text-transform:uppercase;color:#8a8686;width:40%;vertical-align:top;">${escapeHtml(row.label)}</td>
                <td style="padding:14px 0;border-top:${index === 0 ? 'none' : `1px solid ${BRAND_COLORS.graphite}`};font-family:Arial,Helvetica,sans-serif;font-size:15px;color:${BRAND_COLORS.ivory};font-weight:bold;vertical-align:top;">${escapeHtml(row.value)}</td>
              </tr>`,
    )
    .join('')

  const whatsappHref = whatsappLink(
    `Olá! Preciso falar sobre meu agendamento do dia ${formatDateBR(data.date)} às ${data.startTime}.`,
  )

  return `<!-- ${escapeHtml(headline)} -->
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:${BRAND_COLORS.coal};margin:0;padding:0;">
  <tr>
    <td align="center" style="padding:32px 16px;">
      <table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0" style="width:100%;max-width:600px;background-color:${BRAND_COLORS.onyx};">

        <!-- Cabeçalho -->
        <tr>
          <td style="background-color:${BRAND_COLORS.coal};padding:32px 32px 28px 32px;border-bottom:3px solid ${BRAND_COLORS.red};">
            <div style="font-family:Georgia,'Times New Roman',serif;font-size:30px;font-weight:bold;letter-spacing:4px;text-transform:uppercase;color:${BRAND_COLORS.ivory};">Elemento</div>
            <div style="font-family:Arial,Helvetica,sans-serif;font-size:11px;font-weight:bold;letter-spacing:3px;text-transform:uppercase;color:${BRAND_COLORS.red};padding-top:8px;">Estúdio e Barbearia</div>
          </td>
        </tr>

        <!-- Título -->
        <tr>
          <td style="padding:36px 32px 0 32px;">
            <div style="display:inline-block;background-color:${BRAND_COLORS.red};color:${BRAND_COLORS.ivory};font-family:Arial,Helvetica,sans-serif;font-size:11px;font-weight:bold;letter-spacing:2px;text-transform:uppercase;padding:7px 14px;">${escapeHtml(headline)}</div>
            <h1 style="margin:22px 0 0 0;font-family:Georgia,'Times New Roman',serif;font-size:30px;line-height:1.2;font-weight:bold;color:${BRAND_COLORS.ivory};">Olá, ${escapeHtml(data.clientName)}.</h1>
            <p style="margin:14px 0 0 0;font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:1.6;color:#c2bebe;">${escapeHtml(intro)}</p>
          </td>
        </tr>

        <!-- Detalhes -->
        <tr>
          <td style="padding:28px 32px 0 32px;">
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:${BRAND_COLORS.coal};">
              <tr>
                <td style="padding:8px 22px 18px 22px;">
                  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">${rowsHtml}
                  </table>
                </td>
              </tr>
            </table>
          </td>
        </tr>

        <!-- Botão agenda -->
        <tr>
          <td style="padding:28px 32px 0 32px;">
            <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
              <tr>
                <td align="center" bgcolor="${BRAND_COLORS.red}" style="background-color:${BRAND_COLORS.red};">
                  <a href="${escapeHtml(data.icsUrl)}" style="display:block;padding:17px 24px;font-family:Arial,Helvetica,sans-serif;font-size:14px;font-weight:bold;letter-spacing:2px;text-transform:uppercase;color:${BRAND_COLORS.ivory};text-decoration:none;">Salvar na agenda do celular</a>
                </td>
              </tr>
            </table>
            <p style="margin:12px 0 0 0;font-family:Arial,Helvetica,sans-serif;font-size:12px;line-height:1.6;color:#8a8686;">
              Toque no botão para baixar o arquivo do evento e abri-lo no app de calendário do seu celular. O mesmo arquivo (.ics) está anexado a este e-mail.
            </p>
          </td>
        </tr>

        <!-- Contato -->
        <tr>
          <td style="padding:28px 32px 32px 32px;">
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="border-top:1px solid ${BRAND_COLORS.graphite};">
              <tr>
                <td style="padding-top:22px;font-family:Arial,Helvetica,sans-serif;font-size:14px;line-height:1.7;color:#c2bebe;">
                  Precisa remarcar ou cancelar?<br />
                  <a href="${escapeHtml(whatsappHref)}" style="color:${BRAND_COLORS.red};font-weight:bold;text-decoration:none;">Fale com a gente no WhatsApp ${escapeHtml(BUSINESS.phone)}</a>
                </td>
              </tr>
            </table>
          </td>
        </tr>

        <!-- Rodapé -->
        <tr>
          <td style="background-color:${BRAND_COLORS.coal};padding:24px 32px;border-top:1px solid ${BRAND_COLORS.graphite};">
            <div style="font-family:Arial,Helvetica,sans-serif;font-size:12px;line-height:1.7;color:#8a8686;">
              <strong style="color:${BRAND_COLORS.ivory};">${escapeHtml(BUSINESS.name)}</strong><br />
              ${escapeHtml(BUSINESS.address)}<br />
              ${escapeHtml(BUSINESS.phone)} · <a href="${escapeHtml(BUSINESS.instagramUrl)}" style="color:#8a8686;text-decoration:none;">${escapeHtml(BUSINESS.instagram)}</a>
            </div>
          </td>
        </tr>

      </table>
    </td>
  </tr>
</table>`
}
