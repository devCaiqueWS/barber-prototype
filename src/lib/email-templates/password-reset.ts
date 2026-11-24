import { BRAND_COLORS, BUSINESS } from '../business'

const escapeHtml = (value: string) =>
  value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')

export type PasswordResetEmailData = {
  name?: string | null
  /** Link absoluto para /redefinir-senha?token=... */
  resetUrl: string
}

export const buildPasswordResetSubject = () => `Redefinir sua senha — ${BUSINESS.name}`

export const buildPasswordResetText = ({ name, resetUrl }: PasswordResetEmailData) =>
  [
    `Olá${name ? `, ${name}` : ''}.`,
    '',
    'Recebemos um pedido para redefinir a senha da sua conta na Elemento.',
    'Para criar uma nova senha, abra o link abaixo (válido por 1 hora):',
    '',
    resetUrl,
    '',
    'Se não foi você, ignore este e-mail: sua senha continua a mesma.',
    '',
    BUSINESS.name,
  ].join('\n')

export const buildPasswordResetHtml = ({ name, resetUrl }: PasswordResetEmailData) => `<!doctype html>
<html lang="pt-BR">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${escapeHtml(buildPasswordResetSubject())}</title></head>
<body style="margin:0;padding:0;background-color:${BRAND_COLORS.coal};">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:${BRAND_COLORS.coal};margin:0;padding:0;">
  <tr>
    <td align="center" style="padding:24px 12px;">
      <table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0" style="width:100%;max-width:600px;background-color:${BRAND_COLORS.onyx};">
        <tr>
          <td style="background-color:${BRAND_COLORS.coal};padding:32px 32px 28px 32px;border-bottom:3px solid ${BRAND_COLORS.red};">
            <div style="font-family:Georgia,'Times New Roman',serif;font-size:30px;font-weight:bold;letter-spacing:4px;text-transform:uppercase;color:${BRAND_COLORS.ivory};">Elemento</div>
            <div style="font-family:Arial,Helvetica,sans-serif;font-size:11px;font-weight:bold;letter-spacing:3px;text-transform:uppercase;color:${BRAND_COLORS.red};padding-top:8px;">Estúdio e Barbearia</div>
          </td>
        </tr>
        <tr>
          <td style="padding:32px;">
            <h1 style="margin:0;font-family:Georgia,'Times New Roman',serif;font-size:28px;line-height:1.2;font-weight:bold;color:${BRAND_COLORS.ivory};">Olá${name ? `, ${escapeHtml(name)}` : ''}.</h1>
            <p style="margin:14px 0 0 0;font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:1.6;color:#c2bebe;">Recebemos um pedido para redefinir a senha da sua conta. Clique no botão para criar uma nova senha.</p>
            <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:28px 0;">
              <tr>
                <td style="background-color:${BRAND_COLORS.red};">
                  <a href="${escapeHtml(resetUrl)}" style="display:inline-block;padding:14px 28px;font-family:Arial,Helvetica,sans-serif;font-size:14px;font-weight:bold;letter-spacing:1px;text-transform:uppercase;color:${BRAND_COLORS.ivory};text-decoration:none;">Criar nova senha</a>
                </td>
              </tr>
            </table>
            <p style="margin:0;font-family:Arial,Helvetica,sans-serif;font-size:13px;line-height:1.6;color:#8a8686;">O link vale por 1 hora e só pode ser usado uma vez. Se não foi você, ignore este e-mail: sua senha continua a mesma.</p>
            <p style="margin:18px 0 0 0;font-family:Arial,Helvetica,sans-serif;font-size:12px;line-height:1.6;color:#8a8686;word-break:break-all;">Se o botão não funcionar, copie este endereço no navegador:<br>${escapeHtml(resetUrl)}</p>
          </td>
        </tr>
      </table>
    </td>
  </tr>
</table>
</body>
</html>`
