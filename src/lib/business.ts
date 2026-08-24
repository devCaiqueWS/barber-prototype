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

/**
 * URL pública do site, usada para montar links absolutos em e-mails.
 * Prioriza a variável de ambiente e cai para os headers da requisição.
 */
export const resolveSiteUrl = (request?: { headers: Headers }): string => {
  const fromEnv =
    process.env.NEXT_PUBLIC_SITE_URL ||
    process.env.NEXTAUTH_URL ||
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : '')

  if (fromEnv) return stripTrailingSlash(fromEnv)

  if (request) {
    const host = request.headers.get('x-forwarded-host') || request.headers.get('host')
    if (host) {
      const proto =
        request.headers.get('x-forwarded-proto') ||
        (host.startsWith('localhost') || host.startsWith('127.0.0.1') ? 'http' : 'https')
      return stripTrailingSlash(`${proto}://${host}`)
    }
  }

  return 'http://localhost:3000'
}

export const formatBRL = (value: number | null | undefined): string => {
  if (typeof value !== 'number' || !Number.isFinite(value)) return ''
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value)
}
