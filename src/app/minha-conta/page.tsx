'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { formatDateBR } from '@/lib/date'
import ClientAuthForm, { ClientUser } from '@/components/client/ClientAuthForm'

interface ClientAppointment {
  id: string
  date: string
  startTime: string
  endTime: string
  status: string
  paymentMethod: string
  service: { name: string; price: number; duration: number } | null
  barber: { name: string } | null
}

interface Overview {
  user: { id: string; name: string; email: string; whatsapp: string }
  subscription: { id: string; amount: number; cycle: string; status: string } | null
  upcoming: ClientAppointment[]
  past: ClientAppointment[]
}

const STATUS_LABELS: Record<string, { label: string; className: string }> = {
  pending: { label: 'Pendente', className: 'bg-amber-500/20 text-amber-300 border-amber-500/40' },
  confirmed: { label: 'Confirmado', className: 'bg-green-500/20 text-green-300 border-green-500/40' },
  completed: { label: 'Concluído', className: 'bg-blue-500/20 text-blue-300 border-blue-500/40' },
  cancelled: { label: 'Cancelado', className: 'bg-red-500/20 text-red-300 border-red-500/40' },
  no_show: { label: 'Não compareceu', className: 'bg-red-500/20 text-red-300 border-red-500/40' },
}

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

function AppointmentCard({ appointment }: { appointment: ClientAppointment }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-white/10 bg-slate-800/60 p-4">
      <div>
        <p className="font-semibold text-white">{appointment.service?.name || 'Serviço'}</p>
        <p className="text-sm text-slate-400">
          {formatDateBR(appointment.date)} às {appointment.startTime}
          {appointment.barber?.name ? ` · ${appointment.barber.name}` : ''}
        </p>
      </div>
      <div className="flex items-center gap-3">
        {appointment.service?.price != null && (
          <span className="text-sm font-semibold text-green-400">
            R$ {appointment.service.price}
          </span>
        )}
        <StatusBadge status={appointment.status} />
      </div>
    </div>
  )
}

export default function MinhaContaPage() {
  const [loading, setLoading] = useState(true)
  const [loggedIn, setLoggedIn] = useState(false)
  const [overview, setOverview] = useState<Overview | null>(null)

  const loadOverview = useCallback(async () => {
    try {
      const response = await fetch('/api/client/overview')
      if (response.status === 401) {
        setLoggedIn(false)
        setOverview(null)
        return
      }
      const data = await response.json()
      if (data.success) {
        setOverview(data as Overview)
        setLoggedIn(true)
      }
    } catch (error) {
      console.error('Erro ao carregar conta:', error)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void loadOverview()
  }, [loadOverview])

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
              {/* Dados da conta */}
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-2xl font-bold">{overview.user.name}</p>
                  <p className="text-sm text-slate-400">{overview.user.email}</p>
                  {overview.user.whatsapp && (
                    <p className="text-sm text-slate-400">{overview.user.whatsapp}</p>
                  )}
                </div>
                <div className="flex items-center gap-3">
                  {overview.subscription ? (
                    <span className="inline-flex rounded-full border border-amber-500/50 bg-amber-500/15 px-3 py-1 text-xs font-semibold text-amber-300">
                      Assinante ativo
                    </span>
                  ) : null}
                  <button
                    type="button"
                    onClick={handleLogout}
                    className="rounded-md border border-red-500/60 bg-red-500/10 px-4 py-2 text-sm text-red-300 hover:bg-red-500/20"
                  >
                    Sair
                  </button>
                </div>
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
                      <AppointmentCard key={appointment.id} appointment={appointment} />
                    ))}
                  </div>
                )}
                <p className="mt-3 text-xs text-slate-500">
                  Para alterar ou cancelar um agendamento, fale com a gente pelo WhatsApp.
                </p>
              </div>

              {/* Histórico */}
              <div>
                <h2 className="mb-4 text-xl font-semibold">Histórico</h2>
                {overview.past.length === 0 ? (
                  <p className="text-sm text-slate-400">Nenhum atendimento anterior.</p>
                ) : (
                  <div className="space-y-3">
                    {overview.past.slice(0, 20).map((appointment) => (
                      <AppointmentCard key={appointment.id} appointment={appointment} />
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
