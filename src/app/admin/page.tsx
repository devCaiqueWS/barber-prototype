'use client'

import { useState, useEffect } from "react"
import { useSession, signOut } from "next-auth/react"
import { useRouter } from "next/navigation"
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Scissors, ArrowLeft, Users, Calendar, DollarSign, Settings, BarChart, Clock, FileText } from "lucide-react";
import BarbersManagement from "@/components/admin/BarbersManagement";
import ServicesManagement from "@/components/admin/ServicesManagement";

interface Stats {
  todayAppointments: number
  totalClients: number
  monthlyRevenue: number
  activeBarbers: number
  appointmentsByStatus: Record<string, number>
  todayRevenue: number
}

interface SessionUser {
  id?: string
  name?: string
  email?: string
  role?: string
}



interface Appointment {
  id: string
  client: {
    name: string
  }
  service: {
    name: string
  }
  barber: {
    name: string
  } | null
  startTime: string
  status: string
}

export default function AdminPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [stats] = useState<Stats | null>(null)
  const [recentAppointments] = useState<Appointment[]>([])
  const [loading] = useState(true)
  const [activeTab, setActiveTab] = useState('dashboard')

  useEffect(() => {
    console.log('Admin useEffect:', { session, status })
    
    if (status === 'loading') return

    if (!session?.user) {
      console.log('No user, redirecting to login')
      router.push('/login')
      return
    }

    const userRole = (session.user as SessionUser).role
    if (userRole !== 'admin' && userRole !== 'barber') {
      console.log('User role not allowed:', userRole)
      router.push('/')
      return
    }

  }, [session, status, router])

  const handleSignOut = async () => {
    await signOut({ callbackUrl: '/' })
  }

  if (status === 'loading' || loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center">
        <div className="text-white">Carregando...</div>
      </div>
    )
  }

  if (!session?.user || !stats) {
    return null
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-900 via-slate-800 to-slate-900">
      {/* Header */}
      <header className="border-b border-slate-700 bg-slate-900/80 backdrop-blur-sm">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <div className="flex items-center space-x-4">
            <Button variant="ghost" size="icon" asChild className="text-slate-300 hover:text-amber-500">
              <Link href="/">
                <ArrowLeft className="h-5 w-5" />
              </Link>
            </Button>
            <div className="flex items-center space-x-2">
              <Scissors className="h-8 w-8 text-amber-500" />
              <span className="text-2xl font-bold text-white">
                {(session?.user as SessionUser)?.role === 'barber' ? 'Painel do Barbeiro' : 'Admin Panel'}
              </span>
            </div>
          </div>
          <div className="flex items-center space-x-4">
            <span className="text-slate-300">Bem-vindo, {session.user.name}</span>
            <Button variant="outline" className="border-slate-600 text-white hover:bg-slate-800" onClick={handleSignOut}>
              Sair
            </Button>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8">
        {/* Page Title */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-white mb-4">
            Painel <span className="text-amber-500">Administrativo</span>
          </h1>
          <p className="text-xl text-slate-300">
            Gerencie sua barbearia de forma eficiente e profissional.
          </p>
        </div>

        {/* Navigation Tabs */}
        <div className="mb-8">
          <div className="border-b border-slate-700">
            <nav className="-mb-px flex space-x-8">
              {[
                { id: 'dashboard', label: 'Dashboard', icon: BarChart },
                { id: 'appointments', label: 'Agendamentos', icon: Calendar },
                ...(
                  (session?.user as SessionUser)?.role === 'admin' ? [
                    { id: 'barbers', label: 'Barbeiros', icon: Users },
                    { id: 'services', label: 'Serviços', icon: Scissors },
                    { id: 'reports', label: 'Relatórios', icon: FileText },
                    { id: 'settings', label: 'Configurações', icon: Settings }
                  ] : []
                )
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`group inline-flex items-center py-4 px-1 border-b-2 font-medium text-sm ${
                    activeTab === tab.id
                      ? 'border-amber-500 text-amber-500'
                      : 'border-transparent text-slate-400 hover:text-slate-300 hover:border-slate-300'
                  }`}
                >
                  <tab.icon className="mr-2 h-5 w-5" />
                  {tab.label}
                </button>
              ))}
            </nav>
          </div>
        </div>

        {/* Tab Content */}
        {activeTab === 'dashboard' && (
          <>
            {/* Stats Cards */}
            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-slate-800 rounded-lg p-6 border border-slate-700">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-slate-400 text-sm">Agendamentos Hoje</p>
                <p className="text-2xl font-bold text-white">{stats.todayAppointments}</p>
              </div>
              <Calendar className="h-8 w-8 text-amber-500" />
            </div>
          </div>
          
          <div className="bg-slate-800 rounded-lg p-6 border border-slate-700">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-slate-400 text-sm">
                  {(session?.user as SessionUser)?.role === 'barber' ? 'Meus Clientes' : 'Total de Clientes'}
                </p>
                <p className="text-2xl font-bold text-white">{stats.totalClients}</p>
              </div>
              <Users className="h-8 w-8 text-amber-500" />
            </div>
          </div>
          
          <div className="bg-slate-800 rounded-lg p-6 border border-slate-700">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-slate-400 text-sm">
                  {(session?.user as SessionUser)?.role === 'barber' ? 'Meu Faturamento' : 'Faturamento Mensal'}
                </p>
                <p className="text-2xl font-bold text-white">R$ {stats.monthlyRevenue.toLocaleString()}</p>
              </div>
              <DollarSign className="h-8 w-8 text-amber-500" />
            </div>
          </div>
          
          <div className="bg-slate-800 rounded-lg p-6 border border-slate-700">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-slate-400 text-sm">
                  {(session?.user as SessionUser)?.role === 'barber' ? 'Status' : 'Barbeiros Ativos'}
                </p>
                <p className="text-2xl font-bold text-white">
                  {(session?.user as SessionUser)?.role === 'barber' ? 'Ativo' : stats.activeBarbers}
                </p>
              </div>
              <Users className="h-8 w-8 text-amber-500" />
            </div>
          </div>
        </div>

        {/* Main Content Grid */}
        <div className="grid lg:grid-cols-3 gap-8">
          {/* Left Column - Quick Actions */}
          <div className="lg:col-span-1 space-y-6">
            <div className="bg-slate-800 rounded-lg p-6 border border-slate-700">
              <h2 className="text-xl font-semibold text-white mb-4">Ações Rápidas</h2>
              <div className="space-y-3">
                <Button className="text-white w-full bg-amber-600 hover:bg-amber-700" asChild>
                  <Link href="/admin/agendamentos">
                    <Calendar className="text-white mr-2 h-4 w-4" />
                    Gerenciar Agendamentos
                  </Link>
                </Button>
                <Button variant="outline" className="w-full border-slate-600 text-white hover:bg-slate-700" asChild>
                  <Link href="/admin/servicos">
                    <Scissors className="mr-2 h-4 w-4" />
                    Gerenciar Serviços
                  </Link>
                </Button>
                <Button variant="outline" className="w-full border-slate-600 text-white hover:bg-slate-700" asChild>
                  <Link href="/admin/barbeiros">
                    <Users className="mr-2 h-4 w-4" />
                    Gerenciar Barbeiros
                  </Link>
                </Button>
                <Button variant="outline" className="w-full border-slate-600 text-white hover:bg-slate-700" asChild>
                  <Link href="/admin/relatorios">
                    <BarChart className="mr-2 h-4 w-4" />
                    Relatórios
                  </Link>
                </Button>
                <Button variant="outline" className="w-full border-slate-600 text-white hover:bg-slate-700" asChild>
                  <Link href="/admin/configuracoes">
                    <Settings className="mr-2 h-4 w-4" />
                    Configurações
                  </Link>
                </Button>
              </div>
            </div>

            {/* Performance Overview */}
            <div className="bg-slate-800 rounded-lg p-6 border border-slate-700">
              <h3 className="text-lg font-semibold text-white mb-4">Performance Hoje</h3>
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-slate-300">Agendamentos</span>
                  <span className="text-white font-bold">{stats.todayAppointments || 0}/12</span>
                </div>
                <div className="w-full bg-slate-700 rounded-full h-2">
                  <div className="bg-amber-600 h-2 rounded-full" style={{ width: `${Math.min((stats.todayAppointments || 0) / 12 * 100, 100)}%` }}></div>
                </div>
                
                <div className="flex justify-between items-center">
                  <span className="text-slate-300">Faturamento</span>
                  <span className="text-white font-bold">R$ {stats.todayRevenue || 0}</span>
                </div>
                <div className="w-full bg-slate-700 rounded-full h-2">
                  <div className="bg-green-500 h-2 rounded-full" style={{ width: `${Math.min((stats.todayRevenue || 0) / 500 * 100, 100)}%` }}></div>
                </div>
                
                <div className="flex justify-between items-center">
                  <span className="text-slate-300">Ocupação</span>
                  <span className="text-white font-bold">{Math.round((stats.todayAppointments || 0) / 12 * 100)}%</span>
                </div>
                <div className="w-full bg-slate-700 rounded-full h-2">
                  <div className="bg-blue-500 h-2 rounded-full" style={{ width: `${Math.min((stats.todayAppointments || 0) / 12 * 100, 100)}%` }}></div>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column - Recent Appointments */}
          <div className="lg:col-span-2">
            <div className="bg-slate-800 rounded-lg p-6 border border-slate-700">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-semibold text-white">Agendamentos Recentes</h2>
                <Button variant="outline" size="sm" className="border-slate-600 text-white hover:bg-slate-700" asChild>
                  <Link href="/admin/agendamentos">Ver Todos</Link>
                </Button>
              </div>
              
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-slate-700">
                      <th className="text-left py-3 px-4 text-slate-300 font-medium">Cliente</th>
                      <th className="text-left py-3 px-4 text-slate-300 font-medium">Serviço</th>
                      <th className="text-left py-3 px-4 text-slate-300 font-medium">Barbeiro</th>
                      <th className="text-left py-3 px-4 text-slate-300 font-medium">Horário</th>
                      <th className="text-left py-3 px-4 text-slate-300 font-medium">Status</th>
                      <th className="text-left py-3 px-4 text-slate-300 font-medium">Ações</th>
                    </tr>
                  </thead>
                  <tbody>
                    {recentAppointments.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="py-8 text-center text-slate-400">
                          <Calendar className="h-12 w-12 mx-auto mb-4 text-slate-600" />
                          <p>Nenhum agendamento encontrado</p>
                          <p className="text-sm mt-1">Os agendamentos aparecerão aqui quando forem criados</p>
                        </td>
                      </tr>
                    ) : (
                      recentAppointments.map((appointment) => (
                        <tr key={appointment.id} className="border-b border-slate-700 hover:bg-slate-700/50">
                          <td className="py-3 px-4 text-white">{appointment.client.name}</td>
                          <td className="py-3 px-4 text-slate-300">{appointment.service.name}</td>
                          <td className="py-3 px-4 text-slate-300">{appointment.barber?.name || 'Qualquer barbeiro'}</td>
                          <td className="py-3 px-4 text-slate-300">
                            <div className="flex items-center">
                              <Clock className="h-4 w-4 mr-1" />
                              {appointment.startTime}
                            </div>
                          </td>
                          <td className="py-3 px-4">
                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                              appointment.status === 'confirmed' 
                                ? 'bg-green-600 text-white' 
                                : appointment.status === 'pending'
                                ? 'bg-amber-600 text-white'
                                : 'bg-blue-600 text-white'
                            }`}>
                              {appointment.status === 'confirmed' ? 'Confirmado' 
                               : appointment.status === 'pending' ? 'Pendente'
                               : 'Concluído'}
                            </span>
                          </td>
                          <td className="py-3 px-4">
                            <Button size="sm" variant="ghost" className="text-amber-500 hover:text-amber-400 hover:bg-slate-700">
                              Editar
                            </Button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
        </>
        )}

        {/* Barbers Tab */}
        {activeTab === 'barbers' && (
          <BarbersManagement />
        )}

        {/* Services Tab */}
        {activeTab === 'services' && (
          <ServicesManagement />
        )}

        {/* Reports Tab */}
        {activeTab === 'reports' && (
          <div className="space-y-6">
            <h2 className="text-2xl font-bold text-white">Relatórios</h2>
            
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              <div className="bg-slate-800 rounded-lg p-6 border border-slate-700">
                <h3 className="text-lg font-semibold text-white mb-4">Relatório de Agendamentos</h3>
                <p className="text-slate-300 mb-4">Visualize todos os agendamentos por período</p>
                <Button className="w-full bg-amber-600 hover:bg-amber-700 text-white">
                  Gerar Relatório
                </Button>
              </div>
              
              <div className="bg-slate-800 rounded-lg p-6 border border-slate-700">
                <h3 className="text-lg font-semibold text-white mb-4">Relatório de Faturamento</h3>
                <p className="text-slate-300 mb-4">Analise a receita por período e barbeiro</p>
                <Button className="w-full bg-amber-600 hover:bg-amber-700 text-white">
                  Gerar Relatório
                </Button>
              </div>
              
              <div className="bg-slate-800 rounded-lg p-6 border border-slate-700">
                <h3 className="text-lg font-semibold text-white mb-4">Relatório de Barbeiros</h3>
                <p className="text-slate-300 mb-4">Performance e estatísticas dos barbeiros</p>
                <Button className="w-full bg-amber-600 hover:bg-amber-700 text-white">
                  Gerar Relatório
                </Button>
              </div>
              
              <div className="bg-slate-800 rounded-lg p-6 border border-slate-700">
                <h3 className="text-lg font-semibold text-white mb-4">Relatório de Serviços</h3>
                <p className="text-slate-300 mb-4">Serviços mais populares e rentáveis</p>
                <Button className="w-full bg-amber-600 hover:bg-amber-700 text-white">
                  Gerar Relatório
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Settings Tab */}
        {activeTab === 'settings' && (
          <div className="space-y-6">
            <h2 className="text-2xl font-bold text-white">Configurações</h2>
            <div className="bg-slate-800 rounded-lg p-6 border border-slate-700">
              <p className="text-slate-300">Configurações do sistema em desenvolvimento...</p>
            </div>
          </div>
        )}

        {/* Appointments Tab */}
        {activeTab === 'appointments' && (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-2xl font-bold text-white">
                {(session?.user as SessionUser)?.role === 'barber' ? 'Meus Agendamentos' : 'Agendamentos'}
              </h2>
              <div className="flex space-x-2">
                <Button variant="outline" className="border-slate-600 text-white hover:bg-slate-800">
                  Filtrar
                </Button>
                {(session?.user as SessionUser)?.role !== 'barber' && (
                  <Button className="bg-amber-600 hover:bg-amber-700 text-white">
                    Novo Agendamento
                  </Button>
                )}
              </div>
            </div>
            
            <div className="bg-slate-800 rounded-lg border border-slate-700 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-slate-700">
                    <tr>
                      <th className="text-left py-3 px-4 text-slate-300">Cliente</th>
                      <th className="text-left py-3 px-4 text-slate-300">Serviço</th>
                      <th className="text-left py-3 px-4 text-slate-300">Barbeiro</th>
                      <th className="text-left py-3 px-4 text-slate-300">Data/Hora</th>
                      <th className="text-left py-3 px-4 text-slate-300">Status</th>
                      <th className="text-left py-3 px-4 text-slate-300">Ações</th>
                    </tr>
                  </thead>
                  <tbody className="text-slate-300">
                    {recentAppointments.map((appointment) => (
                      <tr key={appointment.id} className="border-t border-slate-700">
                        <td className="py-3 px-4">{appointment.client.name}</td>
                        <td className="py-3 px-4">{appointment.service.name}</td>
                        <td className="py-3 px-4">{appointment.barber?.name || 'N/A'}</td>
                        <td className="py-3 px-4">{appointment.startTime}</td>
                        <td className="py-3 px-4">
                          <span className={`inline-flex px-2 py-1 rounded-full text-xs ${
                            appointment.status === 'confirmed' ? 'bg-green-100 text-green-800'
                            : appointment.status === 'cancelled' ? 'bg-red-100 text-red-800'
                            : appointment.status === 'pending' ? 'bg-yellow-100 text-yellow-800'
                            : 'bg-blue-100 text-blue-800'
                          }`}>
                            {appointment.status === 'confirmed' ? 'Confirmado'
                             : appointment.status === 'cancelled' ? 'Cancelado'
                             : appointment.status === 'pending' ? 'Pendente'
                             : 'Concluído'}
                          </span>
                        </td>
                        <td className="py-3 px-4">
                          <Button size="sm" variant="ghost" className="text-amber-500 hover:text-amber-400 hover:bg-slate-700">
                            Editar
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
