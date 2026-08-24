'use client'

import { useState } from 'react'

export interface ClientUser {
  id: string
  name: string
  email: string
  role: string
  whatsapp?: string
}

interface ClientAuthFormProps {
  onSuccess: (user: ClientUser) => void
  initialMode?: 'login' | 'register'
}

// Formulário de login/cadastro do cliente.
// Usado no fluxo de agendamento e na página Minha Conta.
export default function ClientAuthForm({ onSuccess, initialMode = 'login' }: ClientAuthFormProps) {
  const [mode, setMode] = useState<'login' | 'register'>(initialMode)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [form, setForm] = useState({
    name: '',
    email: '',
    password: '',
    whatsapp: '',
  })

  const setField = (field: keyof typeof form, value: string) =>
    setForm((prev) => ({ ...prev, [field]: value }))

  const handleWhatsappChange = (value: string) => {
    const digits = value.replace(/\D/g, '')
    const formatted = digits.replace(/(\d{2})(\d{5})(\d{4})/, '($1) $2-$3')
    setField('whatsapp', formatted)
  }

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()
    setLoading(true)
    setError('')

    try {
      const endpoint = mode === 'login' ? '/api/auth/login' : '/api/auth/register'
      const payload =
        mode === 'login'
          ? { email: form.email, password: form.password }
          : {
              name: form.name,
              email: form.email,
              password: form.password,
              whatsapp: form.whatsapp,
            }

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      const data = await response.json()

      if (response.ok && data.success) {
        onSuccess(data.user as ClientUser)
        return
      }

      if (data.needsRegistration) {
        setMode('register')
        setError(data.error || 'Crie sua conta para continuar.')
        return
      }

      setError(data.error || 'Não foi possível continuar. Tente novamente.')
    } catch (err) {
      console.error('Erro na autenticação do cliente:', err)
      setError('Erro de conexão. Tente novamente.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="mx-auto w-full max-w-md">
      {/* Alternância login/cadastro */}
      <div className="mb-6 grid grid-cols-2 overflow-hidden rounded-xl border border-white/10">
        <button
          type="button"
          onClick={() => {
            setMode('login')
            setError('')
          }}
          className={`py-3 text-sm font-semibold transition-colors ${
            mode === 'login' ? 'bg-amber-500 text-black' : 'bg-transparent text-slate-300 hover:text-white'
          }`}
        >
          Já tenho conta
        </button>
        <button
          type="button"
          onClick={() => {
            setMode('register')
            setError('')
          }}
          className={`py-3 text-sm font-semibold transition-colors ${
            mode === 'register' ? 'bg-amber-500 text-black' : 'bg-transparent text-slate-300 hover:text-white'
          }`}
        >
          Criar conta
        </button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {mode === 'register' && (
          <div>
            <label className="mb-2 block text-sm font-medium">Nome completo</label>
            <input
              type="text"
              required
              value={form.name}
              onChange={(e) => setField('name', e.target.value)}
              className="w-full rounded-lg border border-slate-600 bg-slate-800 p-3 text-white"
              placeholder="Seu nome"
              maxLength={80}
            />
          </div>
        )}

        <div>
          <label className="mb-2 block text-sm font-medium">E-mail</label>
          <input
            type="email"
            required
            value={form.email}
            onChange={(e) => setField('email', e.target.value)}
            className="w-full rounded-lg border border-slate-600 bg-slate-800 p-3 text-white"
            placeholder="seu@email.com"
          />
        </div>

        {mode === 'register' && (
          <div>
            <label className="mb-2 block text-sm font-medium">WhatsApp</label>
            <input
              type="tel"
              required
              value={form.whatsapp}
              onChange={(e) => handleWhatsappChange(e.target.value)}
              className="w-full rounded-lg border border-slate-600 bg-slate-800 p-3 text-white"
              placeholder="(11) 99999-9999"
              maxLength={15}
            />
          </div>
        )}

        <div>
          <label className="mb-2 block text-sm font-medium">Senha</label>
          <input
            type="password"
            required
            minLength={6}
            value={form.password}
            onChange={(e) => setField('password', e.target.value)}
            className="w-full rounded-lg border border-slate-600 bg-slate-800 p-3 text-white"
            placeholder={mode === 'register' ? 'Mínimo de 6 caracteres' : '••••••••'}
          />
        </div>

        {mode === 'register' && (
          <p className="text-xs text-slate-400">
            Se você já agendou conosco antes, use o mesmo e-mail: seu histórico será mantido.
          </p>
        )}

        {error && (
          <div className="rounded-lg border border-red-500/40 bg-red-950/40 px-4 py-3 text-sm text-red-100">
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-lg bg-amber-500 py-3 px-6 font-bold text-black transition-colors hover:bg-amber-600 disabled:bg-slate-600 disabled:text-white"
        >
          {loading
            ? 'Aguarde...'
            : mode === 'login'
              ? 'Entrar'
              : 'Criar conta'}
        </button>
      </form>
    </div>
  )
}
