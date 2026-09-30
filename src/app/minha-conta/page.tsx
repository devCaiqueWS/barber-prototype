'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { formatDateBR, formatDateKey } from '@/lib/date'
import { whatsappLink } from '@/lib/business'
import { formatClientCode } from '@/lib/client-hub'
import ClientAuthForm, { ClientUser } from '@/components/client/ClientAuthForm'

interface ClientAppointment {
  id: string
  date: string
  startTime: string
  endTime: string
  status: string
  paymentMethod: string
  payOnline: boolean
  paidAt: string | null
  paymentExpiresAt: string | null
  canCancel: boolean
  service: { name: string; price: number; duration: number } | null
  barber: { name: string } | null
}

interface Overview {
  user: {
    id: string
    clientCode: number
    name: string
    email: string
    whatsapp: string
    hasCpf: boolean
    cpfMasked: string
  }
  stats: { completed: number }
  subscription: {
    id: string
    amount: number
    cycle: string
    status: string
    provider: string
    lastPaymentAt: string | null
  } | null
  upcoming: ClientAppointment[]
  past: ClientAppointment[]
}

const STATUS_LABELS: Record<string, { label: string; className: string }> = {
  awaiting_payment: { label: 'Aguardando pagamento', className: 'bg-amber-500/20 text-amber-300 border-amber-500/40' },
  pending: { label: 'Pendente', className: 'bg-amber-500/20 text-amber-300 border-amber-500/40' },
  confirmed: { label: 'Confirmado', className: 'bg-green-500/20 text-green-300 border-green-500/40' },
  completed: { label: 'Concluído', className: 'bg-blue-500/20 text-blue-300 border-blue-500/40' },
  cancelled: { label: 'Cancelado', className: 'bg-red-500/20 text-red-300 border-red-500/40' },
  no_show: { label: 'Não compareceu', className: 'bg-red-500/20 text-red-300 border-red-500/40' },
  expired: { label: 'Reserva expirada', className: 'bg-slate-500/20 text-slate-300 border-slate-500/40' },
  payment_conflict: { label: 'Pago sem horário', className: 'bg-red-500/20 text-red-300 border-red-500/40' },
}

const SUBSCRIPTION_LABELS: Record<string, string> = {
  pending: 'Aguardando 1º pagamento',
  active: 'Ativa',
  overdue: 'Pagamento em atraso',
}

const CYCLE_LABELS: Record<string, string> = {
  MONTHLY: 'mês',
  QUARTERLY: 'trimestre',
  SEMIANNUALLY: 'semestre',
  YEARLY: 'ano',
}

const PAYMENT_RETURN_MESSAGES: Record<string, { text: string; className: string }> = {
  sucesso: {
    text: 'Pagamento recebido! Assim que o Asaas confirmar, seu agendamento aparece como confirmado e você recebe o e-mail.',
    className: 'border-green-500/40 bg-green-500/10 text-green-200',
  },
  cancelado: {
    text: 'Pagamento não concluído. Seu horário continua reservado por alguns minutos: use "Pagar agora" para tentar de novo.',
    className: 'border-amber-500/40 bg-amber-500/10 text-amber-200',
  },
  expirado: {
    text: 'O tempo para pagamento acabou. Se o horário ainda estiver livre, você pode tentar pagar de novo.',
    className: 'border-red-500/40 bg-red-500/10 text-red-200',
  },
}

const formatBRL = (value?: number | null) =>
  typeof value === 'number'
    ? new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value)
    : ''

function StatusBadge({ status }: { status: string }) {
  const info = STATUS_LABELS[status] || {
    label: status,
    className: 'bg-slate-500/20 text-slate-300 border-slate-500/40',
  }
  return (
    <span className={`inline-flex rounded-full border px-2 py-1 text-xs font-medium ${info.className}`}>
      {info.label}
    </span>
  )
}

// Minutos:segundos restantes da reserva; atualiza a cada segundo
function useCountdown(deadline: string | null) {
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    if (!deadline) return
    const timer = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(timer)
  }, [deadline])
  if (!deadline) return null
  const remaining = Math.max(0, new Date(deadline).getTime() - now)
  const minutes = Math.floor(remaining / 60000)
  const seconds = Math.floor((remaining % 60000) / 1000)
  return { remaining, label: `${minutes}:${seconds.toString().padStart(2, '0')}` }
}

function AppointmentCard({
  appointment,
  onPay,
  onCancel,
  busy,
}: {
  appointment: ClientAppointment
  onPay?: (appointment: ClientAppointment) => void
  onCancel?: (appointment: ClientAppointment) => void
  busy?: boolean
}) {
  const countdown = useCountdown(appointment.paymentExpiresAt)
  const awaitingPayment = appointment.status === 'awaiting_payment' && !appointment.paidAt
  const holdActive = awaitingPayment && countdown != null && countdown.remaining > 0
  const canPay = Boolean(onPay) && (awaitingPayment || appointment.status === 'expired')

  return (
    <div className="rounded-xl border border-white/10 bg-slate-800/60 p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="font-semibold text-white">{appointment.service?.name || 'Serviço'}</p>
          <p className="text-sm text-slate-400">
            {formatDateBR(appointment.date)} às {appointment.startTime}
            {appointment.barber?.name ? ` · ${appointment.barber.name}` : ''}
          </p>
          {appointment.paymentMethod === 'assinatura' && (
            <p className="text-xs text-amber-300">Incluído na assinatura</p>
          )}
          {appointment.paidAt && <p className="text-xs text-green-400">Pago online</p>}
        </div>
        <div className="flex items-center gap-3">
          {appointment.service?.price != null && appointment.paymentMethod !== 'assinatura' && (
            <span className="text-sm font-semibold text-green-400">{formatBRL(appointment.service.price)}</span>
          )}
          <StatusBadge status={appointment.status} />
        </div>
      </div>

      {(canPay || (appointment.canCancel && onCancel)) && (
        <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-white/5 pt-3">
          {canPay && onPay && (
            <button
              type="button"
              disabled={busy}
              onClick={() => onPay(appointment)}
              className="rounded-lg bg-green-600 px-4 py-2 text-sm font-bold text-white hover:bg-green-700 disabled:opacity-60"
            >
              {busy ? 'Abrindo...' : holdActive ? 'Pagar agora' : 'Tentar pagar de novo'}
            </button>
          )}
          {holdActive && (
            <span className="text-xs text-amber-300">Horário reservado por mais {countdown?.label}</span>
          )}
          {appointment.canCancel && onCancel && (
            <button
              type="button"
              disabled={busy}
              onClick={() => onCancel(appointment)}
              className="ml-auto rounded-lg border border-red-500/50 px-3 py-2 text-xs text-red-300 hover:bg-red-500/10 disabled:opacity-60"
            >
              Cancelar
            </button>
          )}
        </div>
      )}
    </div>
  )
}

function ProfileForm({ overview, onSaved }: { overview: Overview; onSaved: () => void }) {
  const [name, setName] = useState(overview.user.name || '')
  const [whatsapp, setWhatsapp] = useState(overview.user.whatsapp || '')
  const [cpf, setCpf] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()
    setSaving(true)
    setError('')
    try {
      const response = await fetch('/api/client/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, whatsapp, ...(cpf ? { cpf } : {}) }),
      })
      const data = await response.json()
      if (!response.ok) {
        setError(data.error || 'Não foi possível salvar.')
        return
      }
      onSaved()
    } catch {
      setError('Não foi possível salvar.')
    } finally {
      setSaving(false)
    }
  }

  const inputClass = 'w-full rounded-lg border border-slate-600 bg-slate-800 p-3 text-white'

  return (
    <form onSubmit={handleSubmit} className="grid grid-cols-1 gap-3 rounded-xl border border-white/10 bg-slate-900/60 p-4 sm:grid-cols-3">
      <div>
        <label className="mb-1 block text-xs text-slate-400">Nome</label>
        <input value={name} onChange={(e) => setName(e.target.value)} className={inputClass} />
      </div>
      <div>
        <label className="mb-1 block text-xs text-slate-400">WhatsApp</label>
        <input value={whatsapp} onChange={(e) => setWhatsapp(e.target.value)} className={inputClass} />
      </div>
      <div>
        <label className="mb-1 block text-xs text-slate-400">
          CPF {overview.user.hasCpf ? `(atual ${overview.user.cpfMasked})` : '(opcional)'}
        </label>
        <input
          value={cpf}
          onChange={(e) => setCpf(e.target.value)}
          inputMode="numeric"
          placeholder="000.000.000-00"
          className={inputClass}
        />
      </div>
      <p className="text-xs text-slate-500 sm:col-span-2">
        O CPF agiliza o pagamento online e é usado se você fizer uma assinatura.
      </p>
      <div className="flex items-center justify-end gap-3 sm:col-span-1">
        {error && <span className="text-xs text-red-300">{error}</span>}
        <button
          type="submit"
          disabled={saving}
          className="rounded-lg bg-amber-500 px-4 py-2 text-sm font-bold text-black hover:bg-amber-600 disabled:opacity-60"
        >
          {saving ? 'Salvando...' : 'Salvar'}
        </button>
      </div>
    </form>
  )
}

export default function MinhaContaPage() {
  const [loading, setLoading] = useState(true)
  const [loggedIn, setLoggedIn] = useState(false)
  const [overview, setOverview] = useState<Overview | null>(null)
  const [editingProfile, setEditingProfile] = useState(false)
  const [busyId, setBusyId] = useState('')
  const [paymentReturn, setPaymentReturn] = useState<{ result: string; appointmentId: string } | null>(null)

  const loadOverview = useCallback(async () => {
    try {
      const response = await fetch('/api/client/overview', { cache: 'no-store' })
      if (response.status === 401) {
        setLoggedIn(false)
        setOverview(null)
        return null
      }
      const data = await response.json()
      if (data.success) {
        setOverview(data as Overview)
        setLoggedIn(true)
        return data as Overview
      }
    } catch (error) {
      console.error('Erro ao carregar conta:', error)
    } finally {
      setLoading(false)
    }
    return null
  }, [])

  useEffect(() => {
    // Retorno do checkout do Asaas: /minha-conta?pagamento=sucesso&agendamento=<id>
    const params = new URLSearchParams(window.location.search)
    const result = params.get('pagamento')
    if (result && PAYMENT_RETURN_MESSAGES[result]) {
      setPaymentReturn({ result, appointmentId: params.get('agendamento') || '' })
      window.history.replaceState(null, '', window.location.pathname)
    }
    void loadOverview()
  }, [loadOverview])

  // Depois de pagar, o webhook pode levar alguns segundos: recarrega até confirmar
  useEffect(() => {
    if (paymentReturn?.result !== 'sucesso' || !paymentReturn.appointmentId) return
    let attempts = 0
    const timer = setInterval(async () => {
      attempts += 1
      const data = await loadOverview()
      const appointment = data?.upcoming.find((a) => a.id === paymentReturn.appointmentId)
      if (!appointment || appointment.status !== 'awaiting_payment' || attempts >= 10) {
        clearInterval(timer)
      }
    }, 3000)
    return () => clearInterval(timer)
  }, [paymentReturn, loadOverview])

  const handleAuthSuccess = (user: ClientUser) => {
    if (user.role !== 'CLIENT') {
      window.location.href = '/admin'
      return
    }
    setLoading(true)
    void loadOverview()
  }

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' })
    } catch (error) {
      console.error('Erro ao sair:', error)
    }
    setLoggedIn(false)
    setOverview(null)
  }

  const handlePay = async (appointment: ClientAppointment) => {
    setBusyId(appointment.id)
    try {
      const response = await fetch('/api/payments/asaas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ appointmentId: appointment.id }),
      })
      const data = await response.json()
      if (response.ok && data.checkoutUrl) {
        window.location.href = data.checkoutUrl
        return
      }
      alert(data.error || 'Não foi possível abrir o pagamento.')
      await loadOverview()
    } catch {
      alert('Não foi possível abrir o pagamento.')
    } finally {
      setBusyId('')
    }
  }

  const handleCancel = async (appointment: ClientAppointment) => {
    if (!confirm(`Cancelar ${appointment.service?.name || 'o agendamento'} de ${formatDateBR(appointment.date)} às ${appointment.startTime}?`)) {
      return
    }
    setBusyId(appointment.id)
    try {
      const response = await fetch(`/api/client/appointments/${appointment.id}/cancel`, { method: 'POST' })
      const data = await response.json()
      if (!response.ok) alert(data.error || 'Não foi possível cancelar.')
      await loadOverview()
    } catch {
      alert('Não foi possível cancelar.')
    } finally {
      setBusyId('')
    }
  }

  const returnMessage = paymentReturn ? PAYMENT_RETURN_MESSAGES[paymentReturn.result] : null
  const subscription = overview?.subscription

  return (
    <div className="premium-shell min-h-screen text-white">
      <div className="container mx-auto px-4 py-8">
        <div className="mb-6">
          <Link
            href="/"
            aria-label="Voltar"
            className="inline-flex h-10 w-10 items-center justify-center text-primary hover:text-red-300"
          >
            <ArrowLeft className="h-5 w-5" />
          </Link>
        </div>

        <div className="mb-8 text-center">
          <div className="brand-kicker mb-3">Área do cliente</div>
          <h1 className="text-4xl font-bold md:text-5xl">
            Minha <span className="text-amber-500">Conta</span>
          </h1>
        </div>

        <div className="premium-card mx-auto max-w-3xl rounded-[2rem] p-5 sm:p-8">
          {loading ? (
            <p className="text-center text-slate-400">Carregando...</p>
          ) : !loggedIn || !overview ? (
            <>
              <p className="mb-8 text-center text-slate-400">
                Entre na sua conta para ver seus agendamentos e histórico.
              </p>
              <ClientAuthForm onSuccess={handleAuthSuccess} initialMode="login" />
            </>
          ) : (
            <div className="space-y-8">
              {returnMessage && (
                <div className={`rounded-xl border p-4 text-sm ${returnMessage.className}`}>{returnMessage.text}</div>
              )}

              {/* Dados da conta */}
              <div className="space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-2xl font-bold">{overview.user.name}</p>
                      <span
                        title="Seu código de cliente"
                        className="rounded-full border border-white/15 px-2 py-0.5 font-mono text-xs text-slate-300"
                      >
                        {formatClientCode(overview.user.clientCode)}
                      </span>
                    </div>
                    <p className="text-sm text-slate-400">{overview.user.email}</p>
                    {overview.user.whatsapp && <p className="text-sm text-slate-400">{overview.user.whatsapp}</p>}
                    <p className="mt-1 text-xs text-slate-500">
                      {overview.stats.completed} {overview.stats.completed === 1 ? 'atendimento concluído' : 'atendimentos concluídos'}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setEditingProfile((value) => !value)}
                      className="rounded-md border border-white/15 px-4 py-2 text-sm text-slate-200 hover:bg-white/5"
                    >
                      {editingProfile ? 'Fechar' : 'Editar dados'}
                    </button>
                    <button
                      type="button"
                      onClick={handleLogout}
                      className="rounded-md border border-red-500/60 bg-red-500/10 px-4 py-2 text-sm text-red-300 hover:bg-red-500/20"
                    >
                      Sair
                    </button>
                  </div>
                </div>
                {editingProfile && (
                  <ProfileForm
                    overview={overview}
                    onSaved={() => {
                      setEditingProfile(false)
                      void loadOverview()
                    }}
                  />
                )}
              </div>

              {/* Assinatura */}
              <div className="rounded-xl border border-white/10 bg-slate-900/50 p-4">
                {subscription ? (
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <p className="text-sm text-slate-400">Assinatura</p>
                      <p className="text-lg font-semibold">
                        {formatBRL(subscription.amount)}
                        <span className="text-sm font-normal text-slate-400">
                          {' '}/ {CYCLE_LABELS[subscription.cycle] || subscription.cycle.toLowerCase()}
                        </span>
                      </p>
                      {subscription.lastPaymentAt && (
                        <p className="text-xs text-slate-500">Último pagamento: {formatDateBR(subscription.lastPaymentAt)}</p>
                      )}
                    </div>
                    <span
                      className={`inline-flex rounded-full border px-3 py-1 text-xs font-semibold ${
                        subscription.status === 'active'
                          ? 'border-amber-500/50 bg-amber-500/15 text-amber-300'
                          : 'border-red-500/40 bg-red-500/10 text-red-300'
                      }`}
                    >
                      {SUBSCRIPTION_LABELS[subscription.status] || subscription.status}
                    </span>
                    {subscription.status === 'active' ? (
                      <p className="w-full text-xs text-slate-400">Seus agendamentos são confirmados sem cobrança.</p>
                    ) : (
                      <p className="w-full text-xs text-slate-400">
                        Enquanto a assinatura não estiver em dia, os agendamentos pelo site pedem pagamento online.
                      </p>
                    )}
                  </div>
                ) : (
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <p className="font-semibold">Seja assinante</p>
                      <p className="text-sm text-slate-400">Agende sem pagar a cada visita. Fale com a gente para conhecer os planos.</p>
                    </div>
                    <a
                      href={whatsappLink(`Olá! Quero saber sobre a assinatura. Meu código de cliente é ${formatClientCode(overview.user.clientCode)}.`)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="rounded-lg border border-amber-500/60 px-4 py-2 text-sm font-semibold text-amber-300 hover:bg-amber-500/10"
                    >
                      Quero assinar
                    </a>
                  </div>
                )}
              </div>

              {/* Próximos agendamentos */}
              <div>
                <div className="mb-4 flex items-center justify-between">
                  <h2 className="text-xl font-semibold">Próximos agendamentos</h2>
                  <Link
                    href="/agendamento"
                    className="rounded-lg bg-amber-500 px-4 py-2 text-sm font-bold text-black transition-colors hover:bg-amber-600"
                  >
                    Novo agendamento
                  </Link>
                </div>
                {overview.upcoming.length === 0 ? (
                  <p className="text-sm text-slate-400">Você não tem agendamentos futuros.</p>
                ) : (
                  <div className="space-y-3">
                    {overview.upcoming.map((appointment) => (
                      <AppointmentCard
                        key={appointment.id}
                        appointment={appointment}
                        onPay={handlePay}
                        onCancel={handleCancel}
                        busy={busyId === appointment.id}
                      />
                    ))}
                  </div>
                )}
                <p className="mt-3 text-xs text-slate-500">
                  Agendamentos pagos online são alterados ou cancelados pelo{' '}
                  <a href={whatsappLink()} target="_blank" rel="noopener noreferrer" className="underline hover:text-slate-300">
                    WhatsApp
                  </a>
                  .
                </p>
              </div>

              {/* Histórico */}
              <div>
                <h2 className="mb-4 text-xl font-semibold">Histórico</h2>
                {overview.past.length === 0 ? (
                  <p className="text-sm text-slate-400">Nenhum atendimento anterior.</p>
                ) : (
                  <div className="space-y-3">
                    {overview.past.map((appointment) => (
                      <AppointmentCard
                        key={appointment.id}
                        appointment={appointment}
                        onPay={appointment.status === 'expired' && appointment.date >= formatDateKey(new Date()) ? handlePay : undefined}
                        busy={busyId === appointment.id}
                      />
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
