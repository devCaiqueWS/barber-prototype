'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import {
  Calendar,
  Clock,
  User,
  Scissors,
  Phone,
  Plus,
  Filter,
  Search,
  Edit,
  Trash2,
} from 'lucide-react'
import { Button } from '@/components/ui/button'

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
  const [appointments, setAppointments] = useState<Appointment[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [dateFilter, setDateFilter] = useState('')

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

  const handleStatusChange = async (appointmentId: string, newStatus: string) => {
    try {
      const response = await fetch(`/api/admin/appointments/${appointmentId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ status: newStatus }),
      })

      if (response.ok) {
        await fetchAppointments()
      }
    } catch (error) {
      console.error('Erro ao atualizar status:', error)
    }
  }

  const handleDeleteAppointment = async (appointmentId: string) => {
    if (!confirm('Tem certeza que deseja excluir este agendamento?')) return

    try {
      const response = await fetch(`/api/admin/appointments/${appointmentId}`, {
        method: 'DELETE',
      })

      if (response.ok) {
        await fetchAppointments()
      }
    } catch (error) {
      console.error('Erro ao excluir agendamento:', error)
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

    const matchesStatus = statusFilter === 'all' || appointment.status === statusFilter
    const matchesDate = !dateFilter || appointment.date === dateFilter

    return matchesSearch && matchesStatus && matchesDate
  })

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'confirmed':
        return 'bg-green-600 text-white'
      case 'pending':
        return 'bg-yellow-600 text-white'
      case 'completed':
        return 'bg-blue-600 text-white'
      case 'cancelled':
        return 'bg-red-600 text-white'
      default:
        return 'bg-gray-600 text-white'
    }
  }

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

      {/* Tabela */}
      <div className="bg-slate-800 rounded-lg border border-slate-700 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-700">
            <thead className="bg-slate-900/60">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-300 uppercase tracking-wider">
                  Cliente
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-300 uppercase tracking-wider">
                  Serviço
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-300 uppercase tracking-wider">
                  Barbeiro
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-300 uppercase tracking-wider">
                  Data/Hora
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-300 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-300 uppercase tracking-wider">
                  Ações
                </th>
              </tr>
            </thead>
            <tbody className="bg-slate-800 divide-y divide-slate-700">
              {filteredAppointments.map((appointment) => (
                <tr key={appointment.id} className="hover:bg-slate-700/50">
                  <td className="px-6 py-4">
                    <div className="flex items-center">
                      <User className="h-5 w-5 text-slate-400 mr-3" />
                      <div>
                        <div className="text-sm font-medium text-white">
                          {appointment.client?.name || '-'}
                        </div>
                        <div className="text-sm text-slate-400 flex items-center">
                          <Phone className="h-3 w-3 mr-1" />
                          <span>{appointment.client?.phone || '-'}</span>
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center">
                      <Scissors className="h-4 w-4 text-amber-500 mr-2" />
                      <div>
                        <div className="text-sm font-medium text-white">
                      {appointment.service?.name || '-'}
                        </div>
                        <div className="text-sm text-slate-400 flex items-center">
                          <Clock className="h-3 w-3 mr-1" />
                          <span>{appointment.service.duration} min</span>
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-sm text-white">
                      {appointment.barber?.name || 'N/A'}
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm text-slate-200">
                    <div className="flex flex-col">
                      <span className="flex items-center">
                        <Calendar className="h-3 w-3 mr-1" />
                        {appointment.date}
                      </span>
                      <span className="flex items-center text-slate-400">
                        <Clock className="h-3 w-3 mr-1" />
                        {appointment.startTime} - {appointment.endTime}
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span
                      className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusColor(
                        appointment.status,
                      )}`}
                    >
                      {appointment.status === 'confirmed'
                        ? 'Confirmado'
                        : appointment.status === 'pending'
                        ? 'Pendente'
                        : appointment.status === 'completed'
                        ? 'Concluído'
                        : 'Cancelado'}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right text-sm font-medium space-x-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="text-slate-300 border-slate-600 hover:bg-slate-700"
                      onClick={() =>
                        handleStatusChange(
                          appointment.id,
                          appointment.status === 'confirmed' ? 'completed' : 'confirmed',
                        )
                      }
                    >
                      <Edit className="h-4 w-4 mr-1" />
                      {appointment.status === 'confirmed' ? 'Concluir' : 'Confirmar'}
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="text-red-400 border-red-600 hover:bg-red-900/20"
                      onClick={() => handleDeleteAppointment(appointment.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </td>
                </tr>
              ))}

              {filteredAppointments.length === 0 && (
                <tr>
                  <td
                    colSpan={6}
                    className="px-6 py-8 text-center text-slate-400 text-sm"
                  >
                    Nenhum agendamento encontrado com os filtros atuais.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
