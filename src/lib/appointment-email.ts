import { appointmentIcsFilename, buildAppointmentIcs } from './ics'
import { encodeAttachment, isDeliverableEmail, sendEmail, type SendEmailResult } from './email'
import {
  buildAppointmentConfirmationHtml,
  buildAppointmentConfirmationSubject,
  buildAppointmentConfirmationText,
  type AppointmentEmailData,
} from './email-templates/appointment-confirmation'

export type AppointmentEmailInput = {
  id: string
  clientName: string
  clientEmail: string
  /** YYYY-MM-DD */
  date: string
  /** HH:mm */
  startTime: string
  endTime?: string | null
  status?: string | null
  payOnline?: boolean
  paymentMethod?: string | null
  serviceName?: string | null
  servicePrice?: number | null
  serviceDuration?: number | null
  barberName?: string | null
  /** URL base absoluta do site, ex.: https://elemento.com.br */
  siteUrl: string
}

/**
 * Envia a confirmação de agendamento com o arquivo .ics anexado e um botão
 * que baixa o mesmo arquivo. Nunca lança — devolve o resultado para log.
 */
export async function sendAppointmentConfirmationEmail(
  appointment: AppointmentEmailInput,
): Promise<SendEmailResult> {
  if (!isDeliverableEmail(appointment.clientEmail)) {
    return { sent: false, skipped: 'E-mail do cliente não é entregável' }
  }

  const icsUrl = `${appointment.siteUrl}/api/appointments/${appointment.id}/ics`

  const data: AppointmentEmailData = {
    id: appointment.id,
    date: appointment.date,
    startTime: appointment.startTime,
    endTime: appointment.endTime,
    status: appointment.status,
    clientName: appointment.clientName,
    serviceName: appointment.serviceName,
    servicePrice: appointment.servicePrice,
    serviceDuration: appointment.serviceDuration,
    barberName: appointment.barberName,
    paymentMethod: appointment.paymentMethod,
    payOnline: appointment.payOnline,
    icsUrl,
  }

  const ics = buildAppointmentIcs({
    id: appointment.id,
    date: appointment.date,
    startTime: appointment.startTime,
    endTime: appointment.endTime,
    serviceName: appointment.serviceName,
    serviceDuration: appointment.serviceDuration,
    barberName: appointment.barberName,
    clientName: appointment.clientName,
    status: appointment.status,
    url: icsUrl,
  })

  return sendEmail({
    to: appointment.clientEmail,
    subject: buildAppointmentConfirmationSubject(data),
    html: buildAppointmentConfirmationHtml(data),
    text: buildAppointmentConfirmationText(data),
    attachments: ics
      ? [
          {
            filename: appointmentIcsFilename(appointment),
            content: encodeAttachment(ics),
            contentType: 'text/calendar; charset=utf-8; method=PUBLISH',
          },
        ]
      : undefined,
  })
}
