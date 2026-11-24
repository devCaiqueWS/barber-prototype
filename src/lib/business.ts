// Dados institucionais usados em e-mails, arquivos de calendário e páginas públicas.
export const BUSINESS = {
  name: 'Elemento Estúdio e Barbearia',
  shortName: 'Elemento',
  tagline: 'Barbearia premium, clássica e profissional',
  address: 'R. Angelo Jane, 160 - Bussocaba, Osasco - SP',
  phone: '(11) 94149-2683',
  whatsapp: '5511941492683',
  instagram: '@ogabrieldocorte',
  instagramUrl: 'https://instagram.com/ogabrieldocorte',
  timeZone: 'America/Sao_Paulo',
} as const

// Paleta da marca em hexadecimal (e-mail não suporta CSS variables)
export const BRAND_COLORS = {
  red: '#EB1515',
  burgundy: '#4E0909',
  onyx: '#151414',
  ivory: '#FFFFFF',
  smoke: '#F5F5F5',
  coal: '#0D0B0B',
  graphite: '#211F1F',
} as const

export const whatsappLink = (message?: string) => {
  const base = `https://wa.me/${BUSINESS.whatsapp}`
  return message ? `${base}?text=${encodeURIComponent(message)}` : base
}

const stripTrailingSlash = (value: string) => value.replace(/\/+$/, '')

const isProduction = () => process.env.NODE_ENV === 'production'

// localhost, 127.x, 0.0.0.0, ::1 e domínios .local nunca valem em produção
const LOCAL_HOSTNAME_RE = /^(localhost|127(\.\d{1,3}){3}|0\.0\.0\.0|\[::1\]|::1)$|\.local$/i

/** URL com https:// (quando falta o esquema) e sem barra final; null se inválida. */
const normalizeUrl = (value: string): string | null => {
  const trimmed = value.trim()
  if (!trimmed) return null
  const withScheme = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`
  try {
    new URL(withScheme)
    return stripTrailingSlash(withScheme)
  } catch {
    return null
  }
}

export const isLocalUrl = (value: string): boolean => {
  try {
    return LOCAL_HOSTNAME_RE.test(new URL(value).hostname)
  } catch {
    return true
  }
}

/**
 * Primeira URL configurada no servidor, em ordem de preferência. Em produção,
 * URLs locais são ignoradas (ex.: NEXTAUTH_URL=http://localhost copiado do .env).
 */
const configuredSiteUrl = (): string | null => {
  const candidates = [
    process.env.NEXT_PUBLIC_SITE_URL,
    process.env.NEXTAUTH_URL,
    process.env.NETLIFY ? process.env.URL : undefined,
    process.env.VERCEL_PROJECT_PRODUCTION_URL,
    process.env.VERCEL_URL,
  ]
  for (const candidate of candidates) {
    const url = candidate ? normalizeUrl(candidate) : null
    if (!url) continue
    if (isProduction() && isLocalUrl(url)) continue
    return url
  }
  return null
}

/**
 * URL pública do site, usada para montar links absolutos em e-mails.
 * Prioriza a configuração do servidor e cai para os headers da requisição.
 * Em produção nunca devolve localhost: sem URL pública, devolve '' e registra erro.
 */
export const resolveSiteUrl = (request?: { headers: Headers }): string => {
  const configured = configuredSiteUrl()
  if (configured) return configured

  if (request) {
    const host = request.headers.get('x-forwarded-host') || request.headers.get('host')
    if (host) {
      const proto =
        request.headers.get('x-forwarded-proto') ||
        (host.startsWith('localhost') || host.startsWith('127.0.0.1') ? 'http' : 'https')
      const url = normalizeUrl(`${proto}://${host}`)
      if (url && (!isProduction() || !isLocalUrl(url))) return url
    }
  }

  if (isProduction()) {
    console.error('[site-url] Sem URL pública: configure NEXT_PUBLIC_SITE_URL com o domínio do site.')
    return ''
  }
  return 'http://localhost:3000'
}

/**
 * URL do site só a partir de configuração do servidor, nunca de headers da requisição.
 * Use para links com segredo (ex.: redefinir senha): um Host forjado não pode
 * desviar o link. Sem URL pública configurada em produção, devolve null.
 */
export const trustedSiteUrl = (): string | null => {
  const configured = configuredSiteUrl()
  if (configured) return configured
  return isProduction() ? null : 'http://localhost:3000'
}

export const formatBRL = (value: number | null | undefined): string => {
  if (typeof value !== 'number' || !Number.isFinite(value)) return ''
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value)
}
