'use client'

import { useEffect, useMemo, useState } from 'react'
import { formatDateBR } from '@/lib/date'

interface AdminClient {
  id: string
  clientCode: number
  name: string | null
  email: string
  whatsapp: string
  isRegistered: boolean
  registeredAt: string | null
  createdAt: string
  hasActiveSubscription: boolean
  isNew: boolean
  totalAppointments: number
  completedAppointments: number
  cancelledAppointments: number
  noShows: number
  lastVisit: string | null
  nextAppointment: string | null
}

interface ClientsSummary {
  totalClients: number
  registeredClients: number
  newClients: number
  activeSubscribers: number
  noShowsThisMonth: number
  clientsWithNoShows: number
}

type ClientFilter = 'all' | 'subscribers' | 'new' | 'no_shows' | 'legacy'

const FILTERS: Array<{ id: ClientFilter; label: string }> = [
  { id: 'all', label: 'Todos' },
  { id: 'subscribers', label: 'Assinantes' },
  { id: 'new', label: 'Novos' },
  { id: 'no_shows', label: 'Com faltas' },
  { id: 'legacy', label: 'Conta antiga' },
]

export default function ClientsManagement() {
  const [clients, setClients] = useState<AdminClient[]>([])
  const [summary, setSummary] = useState<ClientsSummary | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [searchTerm, setSearchTerm] = useState('')
  const [filter, setFilter] = useState<ClientFilter>('all')

  useEffect(() => {
    const fetchClients = async () => {
      try {
        const response = await fetch('/api/admin/clients')
        const data = await response.json()
        if (!response.ok) {
          setError(data?.error || 'Erro ao carregar clientes')
          return
        }
        setClients(data.clients || [])
        setSummary(data.summary || null)
      } catch (err) {
        console.error('Erro ao carregar clientes:', err)
        setError('Erro ao carregar clientes')
      } finally {
        setLoading(false)
      }
    }
    void fetchClients()
  }, [])

  const filteredClients = useMemo(() => {
    const term = searchTerm.trim().toLowerCase()
    return clients.filter((client) => {
      const matchesSearch =
        term.length === 0 ||
        (client.name || '').toLowerCase().includes(term) ||
        client.email.toLowerCase().includes(term) ||
        client.whatsapp.toLowerCase().includes(term) ||
        (/^#?d+$/.test(term) && String(client.clientCode) === term.replace(/^#0*/, ''))

      const matchesFilter =
        filter === 'all' ||
        (filter === 'subscribers' && client.hasActiveSubscription) ||
        (filter === 'new' && client.isNew) ||
        (filter === 'no_shows' && client.noShows > 0) ||
        (filter === 'legacy' && !client.isRegistered)

      return matchesSearch && matchesFilter
    })
  }, [clients, searchTerm, filter])

  if (loading) {
    return <div className="text-white text-center">Carregando clientes...</div>
  }

  if (error) {
    return <div className="text-red-300 text-center">{error}</div>
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <h2 className="text-2xl font-bold text-white">Clientes</h2>
        <p className="text-sm text-slate-400">
          Contas de clientes, assinaturas, faltas e novos clientes em um só lugar.
        </p>
      </div>

      {/* Cards de resumo */}
      {summary && (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          <div className="bg-slate-800 rounded-lg p-4 border border-slate-700">
            <p className="text-slate-400 text-xs">Total de Clientes</p>
            <p className="text-2xl font-bold text-white">{summary.totalClients}</p>
          </div>
          <div className="bg-slate-800 rounded-lg p-4 border border-slate-700">
            <p className="text-slate-400 text-xs">Com Conta Ativa</p>
            <p className="text-2xl font-bold text-green-400">{summary.registeredClients}</p>
          </div>
          <div className="bg-slate-800 rounded-lg p-4 border border-slate-700">
            <p className="text-slate-400 text-xs">Novos (30 dias)</p>
            <p className="text-2xl font-bold text-blue-400">{summary.newClients}</p>
          </div>
          <div className="bg-slate-800 rounded-lg p-4 border border-slate-700">
            <p className="text-slate-400 text-xs">Assinantes Ativos</p>
            <p className="text-2xl font-bold text-amber-400">{summary.activeSubscribers}</p>
          </div>
          <div className="bg-slate-800 rounded-lg p-4 border border-slate-700">
            <p className="text-slate-400 text-xs">Faltas no Mês</p>
            <p className="text-2xl font-bold text-red-400">{summary.noShowsThisMonth}</p>
          </div>
          <div className="bg-slate-800 rounded-lg p-4 border border-slate-700">
            <p className="text-slate-400 text-xs">Clientes c/ Faltas</p>
            <p className="text-2xl font-bold text-red-300">{summary.clientsWithNoShows}</p>
          </div>
        </div>
      )}

      {/* Busca e filtros */}
      <div className="bg-slate-800 rounded-lg p-4 border border-slate-700">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">Buscar</label>
            <input
              type="text"
              placeholder="Nome, e-mail, WhatsApp ou código (#123)..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-md text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">Filtro</label>
            <div className="flex flex-wrap gap-2">
              {FILTERS.map((f) => (
                <button
                  key={f.id}
                  type="button"
                  onClick={() => setFilter(f.id)}
                  className={`rounded-full px-4 py-2 text-sm font-medium transition-colors ${
                    filter === f.id
                      ? 'bg-amber-600 text-white'
                      : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Tabela de clientes */}
      <div className="bg-slate-800 rounded-lg border border-slate-700 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-[960px] w-full">
            <thead className="bg-slate-700">
              <tr>
                <th className="text-left py-3 px-4 text-slate-300 font-medium">Cliente</th>
                <th className="text-left py-3 px-4 text-slate-300 font-medium">Situação</th>
                <th className="text-center py-3 px-4 text-slate-300 font-medium">Atendimentos</th>
                <th className="text-center py-3 px-4 text-slate-300 font-medium">Faltas</th>
                <th className="text-center py-3 px-4 text-slate-300 font-medium">Cancelados</th>
                <th className="text-left py-3 px-4 text-slate-300 font-medium">Última Visita</th>
                <th className="text-left py-3 px-4 text-slate-300 font-medium">Próximo</th>
              </tr>
            </thead>
            <tbody className="text-slate-300">
              {filteredClients.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-slate-400">
                    Nenhum cliente encontrado
                  </td>
                </tr>
              ) : (
                filteredClients.map((client) => (
                  <tr key={client.id} className="border-t border-slate-700 hover:bg-slate-700/50">
                    <td className="py-3 px-4">
                      <p className="font-medium text-white">
                        {client.name || 'Sem nome'}{' '}
                        <span className="font-mono text-xs text-slate-500">#{String(client.clientCode).padStart(6, '0')}</span>
                      </p>
                      <p className="text-xs text-slate-400">{client.email}</p>
                      {client.whatsapp && (
                        <p className="text-xs text-slate-500">{client.whatsapp}</p>
                      )}
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex flex-wrap gap-1.5">
                        {client.hasActiveSubscription && (
                          <span className="inline-flex rounded-full bg-amber-500/20 border border-amber-500/40 px-2 py-0.5 text-xs font-medium text-amber-300">
                            Assinante
                          </span>
                        )}
                        {client.isNew && (
                          <span className="inline-flex rounded-full bg-blue-500/20 border border-blue-500/40 px-2 py-0.5 text-xs font-medium text-blue-300">
                            Novo
                          </span>
                        )}
                        {!client.isRegistered && (
                          <span className="inline-flex rounded-full bg-slate-500/20 border border-slate-500/40 px-2 py-0.5 text-xs font-medium text-slate-300">
                            Conta antiga
                          </span>
                        )}
                        {client.noShows >= 2 && (
                          <span className="inline-flex rounded-full bg-red-500/20 border border-red-500/40 px-2 py-0.5 text-xs font-medium text-red-300">
                            Atenção: faltas
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span className="font-semibold text-white">{client.completedAppointments}</span>
                      <span className="text-xs text-slate-500"> / {client.totalAppointments}</span>
                    </td>
                    <td className={`py-3 px-4 text-center font-semibold ${client.noShows > 0 ? 'text-red-400' : 'text-slate-500'}`}>
                      {client.noShows}
                    </td>
                    <td className={`py-3 px-4 text-center ${client.cancelledAppointments > 0 ? 'text-slate-300' : 'text-slate-500'}`}>
                      {client.cancelledAppointments}
                    </td>
                    <td className="py-3 px-4 text-sm">
                      {client.lastVisit ? formatDateBR(client.lastVisit) : '—'}
                    </td>
                    <td className="py-3 px-4 text-sm">
                      {client.nextAppointment ? (
                        <span className="text-green-400">{formatDateBR(client.nextAppointment)}</span>
                      ) : (
                        '—'
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
