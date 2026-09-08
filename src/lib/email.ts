// Envio de e-mails via API HTTP da Resend (sem SDK — apenas fetch).
// Configuração: RESEND_API_KEY (obrigatória), EMAIL_FROM e EMAIL_REPLY_TO (opcionais).

import { BUSINESS } from './business'

const RESEND_ENDPOINT = 'https://api.resend.com/emails'
const REQUEST_TIMEOUT_MS = 10_000

const DEFAULT_FROM = `${BUSINESS.name} <onboarding@resend.dev>`

export type EmailAttachment = {
  filename: string
  /** Conteúdo já codificado em base64 */
  content: string
  contentType?: string
}

export type SendEmailInput = {
  to: string | string[]
  subject: string
  html: string
  text?: string
  replyTo?: string
  attachments?: EmailAttachment[]
}

export type SendEmailResult = {
  sent: boolean
  id?: string
  /** Preenchido quando o envio foi ignorado de propósito (sem chave, e-mail inválido...) */
  skipped?: string
  error?: string
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

/**
 * Endereços sintéticos de atendimento presencial (`walkin+123@local`) e domínios
 * internos não devem receber e-mail.
 */
export const isDeliverableEmail = (email?: string | null): boolean => {
  const value = email?.trim().toLowerCase()
  if (!value || !EMAIL_RE.test(value)) return false
  if (value.startsWith('walkin+')) return false
  if (value.endsWith('@local') || value.endsWith('.local')) return false
  return true
}

export const isEmailConfigured = (): boolean => Boolean(process.env.RESEND_API_KEY)

export const encodeAttachment = (content: string): string =>
  Buffer.from(content, 'utf8').toString('base64')

export async function sendEmail(input: SendEmailInput): Promise<SendEmailResult> {
  const apiKey = process.env.RESEND_API_KEY

  if (!apiKey) {
    console.warn('[email] RESEND_API_KEY não configurada — envio ignorado.')
    return { sent: false, skipped: 'RESEND_API_KEY não configurada' }
  }

  const recipients = (Array.isArray(input.to) ? input.to : [input.to]).filter(isDeliverableEmail)

  if (recipients.length === 0) {
    return { sent: false, skipped: 'Nenhum destinatário válido' }
  }

  const payload: Record<string, unknown> = {
    from: process.env.EMAIL_FROM || DEFAULT_FROM,
    to: recipients,
    subject: input.subject,
    html: input.html,
  }

  if (input.text) payload.text = input.text
  const replyTo = input.replyTo || process.env.EMAIL_REPLY_TO
  if (replyTo && isDeliverableEmail(replyTo)) payload.reply_to = replyTo
  if (input.attachments?.length) {
    payload.attachments = input.attachments.map((attachment) => ({
      filename: attachment.filename,
      content: attachment.content,
      content_type: attachment.contentType,
    }))
  }

  try {
    const response = await fetch(RESEND_ENDPOINT, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    })

    const data = (await response.json().catch(() => null)) as
      | { id?: string; message?: string; name?: string }
      | null

    if (!response.ok) {
      const message = data?.message || `HTTP ${response.status}`
      console.error('[email] Falha no envio:', message)
      return { sent: false, error: message }
    }

    return { sent: true, id: data?.id }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Erro desconhecido'
    console.error('[email] Erro ao chamar a Resend:', message)
    return { sent: false, error: message }
  }
}
