'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import Link from 'next/link'
import { Calendar, Clock, User, Phone, CreditCard, ArrowLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface Appointment {
  id: string
  date: string
  status: string
  client: {
    name: string
    email: string
  }
  service: {
    name: string
    price: number
    duration: number
  }
  clientWhatsapp?: string
}

interface Stats {
  today: number
  thisWeek: number
  thisMonth: number
  total: number
}

export default function BarberDashboard() {
  const { data: session, status } = useSession()
  const [appointments, setAppointments] = useState<Appointment[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0])
  const [stats, setStats] = useState<Stats>({
    today: 0,
    thisWeek: 0,
    thisMonth: 0,
    total: 0
  })

  useEffect(() => {
    if (status === 'authenticated' && (session?.user as { role?: string })?.role === 'barber') {
      loadAppointments()
      loadStats()
    }
  }, [status, session, selectedDate])

  const loadAppointments = async () => {
    try {
      setLoading(true)
      const response = await fetch(`/api/barber/appointments?date=${selectedDate}`)
      const data = await response.json()
      if (data.success) {
        setAppointments(data.appointments)
      }
    } catch (error) {
      console.error('Erro ao carregar agendamentos:', error)
    } finally {
      setLoading(false)
    }
  }

  const loadStats = async () => {
    try {
      const response = await fetch('/api/barber/stats')
      const data = await response.json()
      if (data.success) {
        setStats(data.stats)
      }
    } catch (error) {
      console.error('Erro ao carregar estatísticas:', error)
    }
  }

  if (status === 'loading') {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="text-white">Carregando...</div>
      </div>
    )
  }

  if (status === 'unauthenticated' || (session?.user as { role?: string })?.role !== 'barber') {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="text-center text-white">
          <h1 className="text-2xl font-bold mb-4">Acesso Negado</h1>
          <p className="mb-6">Você precisa estar logado como barbeiro para acessar esta página.</p>
          <Link href="/login" className="text-amber-500 hover:text-amber-400">
            Fazer Login
          </Link>
        </div>
      </div>
    )
  }

  const formatTime = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleTimeString('pt-BR', { 
      hour: '2-digit', 
      minute: '2-digit' 
    })
  }



  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value)
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'CONFIRMED': return 'text-green-400'
      case 'PENDING': return 'text-yellow-400'
      case 'CANCELLED': return 'text-red-400'
      default: return 'text-slate-400'
    }
  }

  const getStatusText = (status: string) => {
    switch (status) {
      case 'CONFIRMED': return 'Confirmado'
      case 'PENDING': return 'Pendente'
      case 'CANCELLED': return 'Cancelado'
      default: return status
    }
  }

  return (
    <div className="min-h-screen bg-slate-900 text-white">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <Link href="/" className="text-amber-500 hover:text-amber-400 flex items-center mb-4">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Voltar para Home
          </Link>
          <h1 className="text-3xl font-bold">
            Dashboard do <span className="text-amber-500">Barbeiro</span>
          </h1>
          <p className="text-slate-400 mt-2">
            Bem-vindo, {session?.user?.name}!
          </p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-slate-800 border border-slate-700 rounded-lg p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-slate-400 text-sm">Hoje</p>
                <p className="text-2xl font-bold text-green-400">{stats.today}</p>
              </div>
              <Calendar className="h-8 w-8 text-green-400" />
            </div>
          </div>

          <div className="bg-slate-800 border border-slate-700 rounded-lg p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-slate-400 text-sm">Esta Semana</p>
                <p className="text-2xl font-bold text-blue-400">{stats.thisWeek}</p>
              </div>
              <Clock className="h-8 w-8 text-blue-400" />
            </div>
          </div>

          <div className="bg-slate-800 border border-slate-700 rounded-lg p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-slate-400 text-sm">Este Mês</p>
                <p className="text-2xl font-bold text-amber-400">{stats.thisMonth}</p>
              </div>
              <User className="h-8 w-8 text-amber-400" />
            </div>
          </div>

          <div className="bg-slate-800 border border-slate-700 rounded-lg p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-slate-400 text-sm">Total</p>
                <p className="text-2xl font-bold text-purple-400">{stats.total}</p>
              </div>
              <CreditCard className="h-8 w-8 text-purple-400" />
            </div>
          </div>
        </div>

        {/* Date Filter */}
        <div className="bg-slate-800 border border-slate-700 rounded-lg p-6 mb-6">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold">Agendamentos</h2>
            <div className="flex items-center space-x-4">
              <label className="text-sm text-slate-400">Filtrar por data:</label>
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-white"
              />
            </div>
          </div>
        </div>

        {/* Appointments List */}
        <div className="bg-slate-800 border border-slate-700 rounded-lg">
          {loading ? (
            <div className="p-8 text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-amber-500 mx-auto mb-4"></div>
              <p className="text-slate-400">Carregando agendamentos...</p>
            </div>
          ) : appointments.length === 0 ? (
            <div className="p-8 text-center">
              <Calendar className="h-16 w-16 text-slate-600 mx-auto mb-4" />
              <p className="text-slate-400 text-lg">Nenhum agendamento para esta data</p>
              <p className="text-slate-500 text-sm mt-2">
                Selecione uma data diferente ou aguarde novos agendamentos
              </p>
            </div>
          ) : (
            <div className="divide-y divide-slate-700">
              {appointments.map((appointment) => (
                <div key={appointment.id} className="p-6 hover:bg-slate-750 transition-colors">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-4 mb-2">
                        <div className="flex items-center space-x-2">
                          <Clock className="h-4 w-4 text-amber-500" />
                          <span className="font-semibold">{formatTime(appointment.date)}</span>
                        </div>
                        <div className={`px-2 py-1 rounded-full text-xs ${getStatusColor(appointment.status)}`}>
                          {getStatusText(appointment.status)}
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                        <div>
                          <p className="text-slate-400">Cliente</p>
                          <p className="font-medium">{appointment.client.name}</p>
                          <p className="text-slate-500">{appointment.client.email}</p>
                        </div>
                        
                        <div>
                          <p className="text-slate-400">Serviço</p>
                          <p className="font-medium">{appointment.service.name}</p>
                          <p className="text-amber-400">{formatCurrency(appointment.service.price)}</p>
                        </div>
                        
                        <div>
                          <p className="text-slate-400">Duração</p>
                          <p className="font-medium">{appointment.service.duration} min</p>
                          {appointment.clientWhatsapp && (
                            <p className="text-slate-500 flex items-center mt-1">
                              <Phone className="h-3 w-3 mr-1" />
                              {appointment.clientWhatsapp}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                    
                    <div className="ml-6">
                      <Button 
                        variant="outline" 
                        size="sm"
                        className="border-slate-600 text-slate-300 hover:bg-slate-700"
                      >
                        Detalhes
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}