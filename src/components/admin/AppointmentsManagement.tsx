'use client'

import { useState, useEffect, useMemo, useCallback } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import {
  Calendar,
  Clock,
  Plus,
  Filter,
  Search,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { formatDateBR, formatDateKey } from '@/lib/date'

interface Appointment {
  id: string
  date: string
  startTime: string
  endTime: string
  status: 'pending' | 'confirmed' | 'completed' | 'cancelled'
  client: {
    name: string
    phone: string
    address?: string
  }
  service: {
    name: string
    price: number
    duration: number
  }
  barber?: {
    name: string
  }
  paymentMethod: string
  notes?: string
  createdAt: string
}

export default function AppointmentsManagement() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const toDateKey = (value: Date | string) => formatDateKey(value)

  const startOfDay = (date: Date) => new Date(date.getFullYear(), date.getMonth(), date.getDate())
  const addDays = useCallback((date: Date, days: number) => {
    const d = new Date(date)
    d.setDate(d.getDate() + days)
    return startOfDay(d)
  }, [])
  const today = useMemo(() => startOfDay(new Date()), [])
  const [appointments, setAppointments] = useState<Appointment[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [dateFilter, setDateFilter] = useState('')
  const [calendarStart, setCalendarStart] = useState(() => startOfDay(new Date()))
  const [editingAppointment, setEditingAppointment] = useState<Appointment | null>(null)
  const [editForm, setEditForm] = useState({
    date: '',
    time: '',
    status: 'confirmed',
    notes: '',
    paymentMethod: '',
  })
  const [savingEdit, setSavingEdit] = useState(false)

  const weekDays = useMemo(() => Array.from({ length: 7 }, (_, i) => addDays(calendarStart, i)), [addDays, calendarStart])
  const hours = useMemo(() => Array.from({ length: 13 }, (_, i) => 8 + i), [])
  const isSameDay = (a: Date, b: Date) => toDateKey(a) === toDateKey(b)

  useEffect(() => {
    if (status === 'loading') return
    if (!session?.user) return

    const userRole = ((session.user as { role?: string }).role || '').toString().toUpperCase()
    if (userRole !== 'ADMIN' && userRole !== 'BARBER') return

    void fetchAppointments()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session, status])

  const fetchAppointments = async () => {
    try {
      const userRole = ((session?.user as { role?: string })?.role || '').toString().toUpperCase()
      const endpoint =
        userRole === 'ADMIN' ? '/api/admin/appointments' : '/api/barber/appointments'

      const response = await fetch(endpoint)
      const data = await response.json()
      setAppointments(data.appointments || [])
    } catch (error) {
      console.error('Erro ao carregar agendamentos:', error)
    } finally {
      setLoading(false)
    }
  }

  const openEdit = (appointment: Appointment) => {
    setEditingAppointment(appointment)
    setEditForm({
      date: appointment.date || '',
      time: appointment.startTime || '',
      status: appointment.status || 'confirmed',
      notes: appointment.notes || '',
      paymentMethod: appointment.paymentMethod || '',
    })
  }

  const closeEdit = () => {
    setEditingAppointment(null)
    setEditForm({
      date: '',
      time: '',
      status: 'confirmed',
      notes: '',
      paymentMethod: '',
    })
  }

  const handleSaveEdit = async () => {
    if (!editingAppointment) return
    try {
      setSavingEdit(true)
      const response = await fetch(`/api/admin/appointments/${editingAppointment.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          date: editForm.date,
          time: editForm.time,
          status: editForm.status,
          notes: editForm.notes,
          paymentMethod: editForm.paymentMethod,
        }),
      })
      if (!response.ok) {
        const data = await response.json()
        alert(data?.error || 'Erro ao atualizar agendamento')
        return
      }
      await fetchAppointments()
      closeEdit()
    } catch (error) {
      console.error('Erro ao atualizar agendamento:', error)
      alert('Erro ao atualizar agendamento')
    } finally {
      setSavingEdit(false)
    }
  }

  const handleCancelAppointment = async () => {
    if (!editingAppointment) return
    if (!confirm('Deseja cancelar este agendamento?')) return
    try {
      setSavingEdit(true)
      const response = await fetch(`/api/admin/appointments/${editingAppointment.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'cancelled' }),
      })
      if (!response.ok) {
        const data = await response.json()
        alert(data?.error || 'Erro ao cancelar agendamento')
        return
      }
      await fetchAppointments()
      closeEdit()
    } catch (error) {
      console.error('Erro ao cancelar agendamento:', error)
      alert('Erro ao cancelar agendamento')
    } finally {
      setSavingEdit(false)
    }
  }

  const filteredAppointments = appointments.filter((appointment) => {
    const clientName = appointment.client?.name || ''
    const serviceName = appointment.service?.name || ''
    const barberName = appointment.barber?.name || ''

    const term = searchTerm.toLowerCase()

    const matchesSearch =
      clientName.toLowerCase().includes(term) ||
      serviceName.toLowerCase().includes(term) ||
      barberName.toLowerCase().includes(term)

    const filterDateKey = toDateKey(dateFilter || '')
    const matchesStatus = statusFilter === 'all' || appointment.status === statusFilter
    const matchesDate = !dateFilter || toDateKey(appointment.date) === filterDateKey

    return matchesSearch && matchesStatus && matchesDate
  })

  if (loading) {
    return <div className="text-white text-center">Carregando agendamentos...</div>
  }

  return (
    <div className="space-y-6">
      {/* Header / Ações */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <Calendar className="h-6 w-6 text-amber-500" />
          <h2 className="text-2xl font-bold text-white">Agendamentos</h2>
        </div>
        <Button
          className="bg-amber-600 hover:bg-amber-700"
          onClick={() => router.push('/agendamento')}
        >
          <Plus className="h-4 w-4 mr-2" />
          Novo Agendamento
        </Button>
      </div>

      {/* Filtros */}
      <div className="bg-slate-800 rounded-lg p-4 border border-slate-700">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">Buscar</label>
            <div className="relative">
              <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Cliente, serviço ou barbeiro..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-slate-700 border border-slate-600 rounded-md text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">Status</label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-amber-500"
            >
              <option value="all">Todos</option>
              <option value="pending">Pendente</option>
              <option value="confirmed">Confirmado</option>
              <option value="completed">Concluído</option>
              <option value="cancelled">Cancelado</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">Data</label>
            <input
              type="date"
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value)}
              className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-amber-500"
            />
          </div>

          <div className="flex items-end">
            <Button
              className="w-full bg-slate-700 hover:bg-slate-600 text-white"
              onClick={() => {
                setSearchTerm('')
                setStatusFilter('all')
                setDateFilter('')
              }}
            >
              <Filter className="h-4 w-4 mr-2" />
              Limpar Filtros
            </Button>
          </div>
        </div>
      </div>

      {/* Calendário semanal */}
      <div className="bg-slate-900 rounded-2xl border border-slate-800 p-6 shadow-lg">
        <div className="flex items-center justify-between mb-6">
          <div>
            <div className="flex items-center text-amber-400 text-sm font-semibold">
              <Calendar className="h-4 w-4 mr-2" />
              Agenda de atendimentos
            </div>
            <h3 className="text-2xl font-bold text-white mt-1">Próximos dias</h3>
          </div>
          <div className="flex items-center space-x-2">
            <Button
              variant="outline"
              size="icon"
              onClick={() => setCalendarStart(addDays(calendarStart, -7))}
              className="border-slate-700 text-white bg-slate-800/70 hover:bg-slate-700"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCalendarStart(today)}
              className="border-slate-700 text-white bg-slate-800/70 hover:bg-slate-700"
            >
              Hoje
            </Button>
            <Button
              variant="outline"
              size="icon"
              onClick={() => setCalendarStart(addDays(calendarStart, 7))}
              className="border-slate-700 text-white bg-slate-800/70 hover:bg-slate-700"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <div className="overflow-auto max-h-[70vh]">
          <div className="grid min-w-[1100px]" style={{ gridTemplateColumns: '100px repeat(7, minmax(0, 1fr))' }}>
            <div className="p-3 text-xs font-semibold uppercase text-slate-300 tracking-wide border border-slate-800 bg-slate-950/60 rounded-tl-xl">
              Horário
            </div>
            {weekDays.map((day, idx) => (
              <div
                key={idx}
                className={`p-3 border border-slate-800 text-center text-sm font-semibold text-white bg-slate-950/70 ${
                  isSameDay(day, today) ? 'bg-slate-800/60' : ''
                } ${idx === weekDays.length - 1 ? 'rounded-tr-xl' : ''}`}
              >
                <div className="capitalize">{day.toLocaleDateString('pt-BR', { weekday: 'short' })}</div>
                <div className="text-xs text-slate-400">{formatDateBR(day)}</div>
              </div>
            ))}
            {hours.map((hour) => (
              <div key={`row-${hour}`} className="contents">
                <div className="p-3 text-sm text-slate-400 border border-slate-800 bg-slate-950/60">
                  {hour.toString().padStart(2, '0')}:00
                </div>
                {weekDays.map((day, colIdx) => {
                  const dayStr = toDateKey(day)
                  const items = filteredAppointments.filter(
                    (appt) =>
                      (appt.status || '').toLowerCase() !== 'cancelled' &&
                      toDateKey(appt.date) === dayStr &&
                      (appt.startTime || '').startsWith(hour.toString().padStart(2, '0')),
                  )
                  return (
                    <div
                      key={`cell-${colIdx}-${hour}`}
                      className={`border border-slate-800 bg-slate-950/40 min-h-[96px] p-2 ${
                        isSameDay(day, today) ? 'bg-slate-900/50' : ''
                      }`}
                    >
                        {items.length === 0 ? (
                          <div className="text-center text-xs text-slate-600 mt-6">Sem agendamentos</div>
                        ) : (
                          items.map((appt) => (
                            <button
                              key={appt.id}
                              type="button"
                              onClick={() => openEdit(appt)}
                              className="mb-2 w-full text-left rounded-lg border border-emerald-600/70 bg-emerald-900/60 text-emerald-50 p-3 shadow-sm transition hover:border-emerald-400 hover:bg-emerald-900/80"
                            >
                            <div className="text-sm font-semibold">{appt.client?.name || 'Cliente'}</div>
                            <div className="text-xs text-emerald-100">{appt.service?.name || 'Serviço'}</div>
                            <div className="text-xs text-emerald-200">Barbeiro: {appt.barber?.name || '—'}</div>
                            <div className="text-xs text-emerald-200 flex items-center mt-1">
                              <Clock className="h-3 w-3 mr-1" />
                              {(appt.startTime ?? '').trim() || '--:--'} - {(appt.endTime ?? '').trim() || '--:--'}
                            </div>
                          </button>
                        ))
                      )}
                    </div>
                  )
                })}
              </div>
            ))}
          </div>
        </div>
      </div>
      {editingAppointment && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4 py-6">
          <div className="w-full max-w-lg rounded-xl border border-slate-700 bg-slate-900 p-6 shadow-xl">
            <div className="mb-4">
              <h2 className="text-xl font-semibold text-white">Editar agendamento</h2>
              <p className="text-sm text-slate-400">
                {editingAppointment.client?.name || 'Cliente'} - {editingAppointment.service?.name || 'ServiÇõo'}
              </p>
            </div>
            <div className="grid grid-cols-1 gap-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-slate-400 mb-1">Data</label>
                  <input
                    type="date"
                    value={editForm.date}
                    onChange={(e) => setEditForm((prev) => ({ ...prev, date: e.target.value }))}
                    className="w-full rounded-md border border-slate-700 bg-slate-800 px-3 py-2 text-white"
                  />
                </div>
                <div>
                  <label className="block text-xs text-slate-400 mb-1">Horario</label>
                  <input
                    type="time"
                    step={300}
                    value={editForm.time}
                    onChange={(e) => setEditForm((prev) => ({ ...prev, time: e.target.value }))}
                    className="w-full rounded-md border border-slate-700 bg-slate-800 px-3 py-2 text-white"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-slate-400 mb-1">Status</label>
                  <select
                    value={editForm.status}
                    onChange={(e) => setEditForm((prev) => ({ ...prev, status: e.target.value }))}
                    className="w-full rounded-md border border-slate-700 bg-slate-800 px-3 py-2 text-white"
                  >
                    <option value="pending">Pendente</option>
                    <option value="confirmed">Confirmado</option>
                    <option value="completed">Concluido</option>
                    <option value="cancelled">Cancelado</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-slate-400 mb-1">Pagamento</label>
                  <select
                    value={editForm.paymentMethod}
                    onChange={(e) => setEditForm((prev) => ({ ...prev, paymentMethod: e.target.value }))}
                    className="w-full rounded-md border border-slate-700 bg-slate-800 px-3 py-2 text-white"
                  >
                    <option value="">Nao informado</option>
                    <option value="dinheiro">Dinheiro</option>
                    <option value="cartao_credito">Cartao de Credito</option>
                    <option value="cartao_debito">Cartao de Debito</option>
                    <option value="pix">PIX</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-xs text-slate-400 mb-1">Observacoes</label>
                <textarea
                  rows={3}
                  value={editForm.notes}
                  onChange={(e) => setEditForm((prev) => ({ ...prev, notes: e.target.value }))}
                  className="w-full rounded-md border border-slate-700 bg-slate-800 px-3 py-2 text-white"
                />
              </div>
            </div>
            <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
              <button
                type="button"
                onClick={handleCancelAppointment}
                className="rounded-md border border-red-500/60 bg-red-500/10 px-4 py-2 text-sm text-red-300 hover:bg-red-500/20"
              >
                Cancelar agendamento
              </button>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={closeEdit}
                  className="rounded-md border border-slate-700 bg-slate-800 px-4 py-2 text-sm text-slate-200 hover:bg-slate-700"
                >
                  Fechar
                </button>
                <button
                  type="button"
                  disabled={savingEdit}
                  onClick={handleSaveEdit}
                  className="rounded-md bg-amber-600 px-4 py-2 text-sm font-semibold text-white hover:bg-amber-700 disabled:opacity-60"
                >
                  {savingEdit ? 'Salvando...' : 'Salvar'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
