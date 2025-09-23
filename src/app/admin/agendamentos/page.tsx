'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { Calendar, Clock, User, Scissors, Phone, MapPin, CreditCard, ChevronLeft, Plus, Filter, Search, Edit, Trash2 } from 'lucide-react'
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

export default function AdminAppointments() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [appointments, setAppointments] = useState<Appointment[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [dateFilter, setDateFilter] = useState('')

  useEffect(() => {
    if (status === 'loading') return

    if (!session?.user) {
      router.push('/login')
      return
    }

    const userRole = (session.user as any).role
    if (userRole !== 'admin' && userRole !== 'barber') {
      router.push('/')
      return
    }

    fetchAppointments()
  }, [session, status])

  const fetchAppointments = async () => {
    try {
      const endpoint = (session?.user as any)?.role === 'admin' 
        ? '/api/admin/appointments'
        : '/api/barber/appointments'
      
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

  const filteredAppointments = appointments.filter(appointment => {
    const matchesSearch = appointment.client.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         appointment.service.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         (appointment.barber?.name || '').toLowerCase().includes(searchTerm.toLowerCase())
    
    const matchesStatus = statusFilter === 'all' || appointment.status === statusFilter
    const matchesDate = !dateFilter || appointment.date === dateFilter

    return matchesSearch && matchesStatus && matchesDate
  })

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'confirmed': return 'bg-green-600 text-white'
      case 'pending': return 'bg-yellow-600 text-white'
      case 'completed': return 'bg-blue-600 text-white'
      case 'cancelled': return 'bg-red-600 text-white'
      default: return 'bg-gray-600 text-white'
    }
  }

  const getStatusText = (status: string) => {
    switch (status) {
      case 'confirmed': return 'Confirmado'
      case 'pending': return 'Pendente'
      case 'completed': return 'Concluído'
      case 'cancelled': return 'Cancelado'
      default: return status
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="text-white">Carregando agendamentos...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-900 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center space-x-4">
            <Button variant="ghost" onClick={() => router.back()} className="text-white hover:bg-slate-700">
              <ChevronLeft className="h-4 w-4 mr-2" />
              Voltar
            </Button>
            <h1 className="text-3xl font-bold text-white">Gerenciar Agendamentos</h1>
          </div>
          <Button className="bg-amber-600 hover:bg-amber-700" onClick={() => router.push('/agendamento')}>
            <Plus className="h-4 w-4 mr-2" />
            Novo Agendamento
          </Button>
        </div>

        {/* Filters */}
        <div className="bg-slate-800 rounded-lg p-6 mb-6 border border-slate-700">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">Buscar</label>
              <div className="relative">
                <Search className="h-4 w-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400" />
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
                variant="outline"
                onClick={() => {
                  setSearchTerm('')
                  setStatusFilter('all')
                  setDateFilter('')
                }}
                className="w-full border-slate-600 text-white hover:bg-slate-700"
              >
                <Filter className="h-4 w-4 mr-2" />
                Limpar Filtros
              </Button>
            </div>
          </div>
        </div>

        {/* Appointments List */}
        <div className="bg-slate-800 rounded-lg border border-slate-700 overflow-hidden">
          {filteredAppointments.length === 0 ? (
            <div className="p-12 text-center">
              <Calendar className="h-16 w-16 mx-auto mb-4 text-slate-600" />
              <h3 className="text-xl font-semibold text-white mb-2">Nenhum agendamento encontrado</h3>
              <p className="text-slate-400 mb-6">
                {appointments.length === 0 
                  ? 'Ainda não há agendamentos cadastrados no sistema.'
                  : 'Nenhum agendamento corresponde aos filtros aplicados.'
                }
              </p>
              <Button className="bg-amber-600 hover:bg-amber-700" onClick={() => router.push('/agendamento')}>
                <Plus className="h-4 w-4 mr-2" />
                Criar Primeiro Agendamento
              </Button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-slate-700">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-300 uppercase tracking-wider">Cliente</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-300 uppercase tracking-wider">Serviço</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-300 uppercase tracking-wider">Barbeiro</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-300 uppercase tracking-wider">Data/Hora</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-300 uppercase tracking-wider">Status</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-300 uppercase tracking-wider">Pagamento</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-300 uppercase tracking-wider">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-700">
                  {filteredAppointments.map((appointment) => (
                    <tr key={appointment.id} className="hover:bg-slate-700/50">
                      <td className="px-6 py-4">
                        <div className="flex items-center">
                          <User className="h-5 w-5 text-slate-400 mr-3" />
                          <div>
                            <div className="text-sm font-medium text-white">{appointment.client.name}</div>
                            <div className="text-sm text-slate-400 flex items-center mt-1">
                              <Phone className="h-3 w-3 mr-1" />
                              {appointment.client.phone}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center">
                          <Scissors className="h-5 w-5 text-slate-400 mr-3" />
                          <div>
                            <div className="text-sm font-medium text-white">{appointment.service.name}</div>
                            <div className="text-sm text-slate-400">R$ {appointment.service.price.toFixed(2)}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm text-white">{appointment.barber?.name || 'Qualquer barbeiro'}</div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center">
                          <Calendar className="h-4 w-4 text-slate-400 mr-2" />
                          <div>
                            <div className="text-sm text-white">{new Date(appointment.date).toLocaleDateString('pt-BR')}</div>
                            <div className="text-sm text-slate-400 flex items-center mt-1">
                              <Clock className="h-3 w-3 mr-1" />
                              {appointment.startTime} - {appointment.endTime}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <select
                          value={appointment.status}
                          onChange={(e) => handleStatusChange(appointment.id, e.target.value)}
                          className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(appointment.status)} bg-opacity-90 border-0 focus:outline-none focus:ring-2 focus:ring-amber-500`}
                        >
                          <option value="pending">Pendente</option>
                          <option value="confirmed">Confirmado</option>
                          <option value="completed">Concluído</option>
                          <option value="cancelled">Cancelado</option>
                        </select>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center">
                          <CreditCard className="h-4 w-4 text-slate-400 mr-2" />
                          <span className="text-sm text-white capitalize">{appointment.paymentMethod}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center space-x-2">
                          <Button
                            size="sm"
                            variant="ghost"
                            className="text-amber-500 hover:text-amber-400 hover:bg-slate-700"
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleDeleteAppointment(appointment.id)}
                            className="text-red-500 hover:text-red-400 hover:bg-slate-700"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Summary */}
        {filteredAppointments.length > 0 && (
          <div className="mt-6 bg-slate-800 rounded-lg p-6 border border-slate-700">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-center">
              <div>
                <div className="text-2xl font-bold text-white">{filteredAppointments.length}</div>
                <div className="text-sm text-slate-400">Total de Agendamentos</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-yellow-500">
                  {filteredAppointments.filter(a => a.status === 'pending').length}
                </div>
                <div className="text-sm text-slate-400">Pendentes</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-green-500">
                  {filteredAppointments.filter(a => a.status === 'confirmed').length}
                </div>
                <div className="text-sm text-slate-400">Confirmados</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-blue-500">
                  {filteredAppointments.filter(a => a.status === 'completed').length}
                </div>
                <div className="text-sm text-slate-400">Concluídos</div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}