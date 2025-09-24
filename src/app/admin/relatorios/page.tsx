'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { BarChart, ChevronLeft, Download, Calendar, DollarSign, Users, Scissors, TrendingUp, FileText } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface ReportData {
  summary: {
    totalAppointments: number
    totalRevenue: number
    totalClients: number
    totalServices: number
    averageTicket: number
    completionRate: number
  }
  appointmentsByDay: Array<{
    date: string
    count: number
    revenue: number
  }>
  appointmentsByService: Array<{
    serviceName: string
    count: number
    revenue: number
  }>
  appointmentsByBarber: Array<{
    barberName: string
    count: number
    revenue: number
  }>
  appointmentsByStatus: Array<{
    status: string
    count: number
    percentage: number
  }>
  revenueByMonth: Array<{
    month: string
    revenue: number
    appointments: number
  }>
}

export default function AdminReports() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [reportData, setReportData] = useState<ReportData | null>(null)
  const [loading, setLoading] = useState(true)
  const [dateRange, setDateRange] = useState({
    startDate: new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0],
    endDate: new Date().toISOString().split('T')[0]
  })

  useEffect(() => {
    if (status === 'loading') return

    if (!session?.user) {
      router.push('/login')
      return
    }

    const userRole = (session.user as { role?: string }).role
    if (userRole !== 'admin') {
      router.push('/')
      return
    }

    fetchReportData()
  }, [session, status, dateRange])

  const fetchReportData = async () => {
    try {
      const params = new URLSearchParams({
        startDate: dateRange.startDate,
        endDate: dateRange.endDate
      })
      
      const response = await fetch(`/api/admin/reports?${params}`)
      const data = await response.json()
      setReportData(data)
    } catch (error) {
      console.error('Erro ao carregar relatórios:', error)
    } finally {
      setLoading(false)
    }
  }

  const exportReport = async (format: 'csv' | 'pdf') => {
    try {
      const params = new URLSearchParams({
        startDate: dateRange.startDate,
        endDate: dateRange.endDate,
        format
      })
      
      const response = await fetch(`/api/admin/reports/export?${params}`)
      
      if (response.ok) {
        const blob = await response.blob()
        const url = window.URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.style.display = 'none'
        a.href = url
        a.download = `relatorio_${dateRange.startDate}_${dateRange.endDate}.${format}`
        document.body.appendChild(a)
        a.click()
        window.URL.revokeObjectURL(url)
      }
    } catch (error) {
      console.error('Erro ao exportar relatório:', error)
      alert('Erro ao exportar relatório')
    }
  }

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value)
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('pt-BR')
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'text-green-500'
      case 'confirmed': return 'text-blue-500'
      case 'pending': return 'text-yellow-500'
      case 'cancelled': return 'text-red-500'
      default: return 'text-slate-400'
    }
  }

  const getStatusText = (status: string) => {
    switch (status) {
      case 'completed': return 'Concluídos'
      case 'confirmed': return 'Confirmados'
      case 'pending': return 'Pendentes'
      case 'cancelled': return 'Cancelados'
      default: return status
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="text-white">Carregando relatórios...</div>
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
            <h1 className="text-3xl font-bold text-white">Relatórios</h1>
          </div>
          <div className="flex space-x-2">
            <Button 
              variant="outline"
              onClick={() => exportReport('csv')}
              className="border-slate-600 text-white hover:bg-slate-700"
            >
              <Download className="h-4 w-4 mr-2" />
              Exportar CSV
            </Button>
            <Button 
              variant="outline"
              onClick={() => exportReport('pdf')}
              className="border-slate-600 text-white hover:bg-slate-700"
            >
              <Download className="h-4 w-4 mr-2" />
              Exportar PDF
            </Button>
          </div>
        </div>

        {/* Date Range Filter */}
        <div className="bg-slate-800 rounded-lg p-6 mb-6 border border-slate-700">
          <div className="flex flex-col md:flex-row md:items-end gap-4">
            <div className="flex-1">
              <label className="block text-sm font-medium text-slate-300 mb-2">Período do Relatório</label>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs text-slate-400 mb-1">Data Inicial</label>
                  <input
                    type="date"
                    value={dateRange.startDate}
                    onChange={(e) => setDateRange(prev => ({ ...prev, startDate: e.target.value }))}
                    className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                  />
                </div>
                <div>
                  <label className="block text-xs text-slate-400 mb-1">Data Final</label>
                  <input
                    type="date"
                    value={dateRange.endDate}
                    onChange={(e) => setDateRange(prev => ({ ...prev, endDate: e.target.value }))}
                    className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                  />
                </div>
              </div>
            </div>
            <Button 
              onClick={fetchReportData}
              className="bg-amber-600 hover:bg-amber-700"
            >
              <BarChart className="h-4 w-4 mr-2" />
              Atualizar Relatório
            </Button>
          </div>
        </div>

        {reportData ? (
          <>
            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
              <div className="bg-slate-800 rounded-lg p-6 border border-slate-700">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-slate-400">Total de Agendamentos</p>
                    <p className="text-2xl font-bold text-white">{reportData.summary.totalAppointments}</p>
                  </div>
                  <Calendar className="h-8 w-8 text-amber-500" />
                </div>
              </div>

              <div className="bg-slate-800 rounded-lg p-6 border border-slate-700">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-slate-400">Faturamento Total</p>
                    <p className="text-2xl font-bold text-white">{formatCurrency(reportData.summary.totalRevenue)}</p>
                  </div>
                  <DollarSign className="h-8 w-8 text-green-500" />
                </div>
              </div>

              <div className="bg-slate-800 rounded-lg p-6 border border-slate-700">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-slate-400">Clientes Únicos</p>
                    <p className="text-2xl font-bold text-white">{reportData.summary.totalClients}</p>
                  </div>
                  <Users className="h-8 w-8 text-blue-500" />
                </div>
              </div>

              <div className="bg-slate-800 rounded-lg p-6 border border-slate-700">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-slate-400">Ticket Médio</p>
                    <p className="text-2xl font-bold text-white">{formatCurrency(reportData.summary.averageTicket)}</p>
                  </div>
                  <TrendingUp className="h-8 w-8 text-purple-500" />
                </div>
              </div>
            </div>

            <div className="grid lg:grid-cols-2 gap-8 mb-8">
              {/* Appointments by Status */}
              <div className="bg-slate-800 rounded-lg p-6 border border-slate-700">
                <h3 className="text-lg font-semibold text-white mb-4">Status dos Agendamentos</h3>
                <div className="space-y-4">
                  {reportData.appointmentsByStatus.map((item, index) => (
                    <div key={index} className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <div className={`w-3 h-3 rounded-full ${getStatusColor(item.status).replace('text-', 'bg-')}`}></div>
                        <span className="text-slate-300">{getStatusText(item.status)}</span>
                      </div>
                      <div className="text-right">
                        <div className="text-white font-semibold">{item.count}</div>
                        <div className="text-xs text-slate-400">{item.percentage.toFixed(1)}%</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Top Services */}
              <div className="bg-slate-800 rounded-lg p-6 border border-slate-700">
                <h3 className="text-lg font-semibold text-white mb-4">Serviços Mais Procurados</h3>
                <div className="space-y-4">
                  {reportData.appointmentsByService.slice(0, 5).map((service, index) => (
                    <div key={index} className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <Scissors className="h-4 w-4 text-amber-500" />
                        <span className="text-slate-300">{service.serviceName}</span>
                      </div>
                      <div className="text-right">
                        <div className="text-white font-semibold">{service.count}</div>
                        <div className="text-xs text-slate-400">{formatCurrency(service.revenue)}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="grid lg:grid-cols-2 gap-8 mb-8">
              {/* Performance by Barber */}
              <div className="bg-slate-800 rounded-lg p-6 border border-slate-700">
                <h3 className="text-lg font-semibold text-white mb-4">Performance por Barbeiro</h3>
                <div className="space-y-4">
                  {reportData.appointmentsByBarber.map((barber, index) => (
                    <div key={index} className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <div className="w-8 h-8 bg-amber-600 rounded-full flex items-center justify-center">
                          <span className="text-white text-sm font-semibold">
                            {barber.barberName.charAt(0)}
                          </span>
                        </div>
                        <span className="text-slate-300">{barber.barberName}</span>
                      </div>
                      <div className="text-right">
                        <div className="text-white font-semibold">{barber.count} agendamentos</div>
                        <div className="text-xs text-slate-400">{formatCurrency(barber.revenue)}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Daily Appointments */}
              <div className="bg-slate-800 rounded-lg p-6 border border-slate-700">
                <h3 className="text-lg font-semibold text-white mb-4">Agendamentos por Dia</h3>
                <div className="space-y-3 max-h-64 overflow-y-auto">
                  {reportData.appointmentsByDay.map((day, index) => (
                    <div key={index} className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <Calendar className="h-4 w-4 text-blue-500" />
                        <span className="text-slate-300">{formatDate(day.date)}</span>
                      </div>
                      <div className="text-right">
                        <div className="text-white font-semibold">{day.count}</div>
                        <div className="text-xs text-slate-400">{formatCurrency(day.revenue)}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Monthly Revenue Trend */}
            <div className="bg-slate-800 rounded-lg p-6 border border-slate-700">
              <h3 className="text-lg font-semibold text-white mb-4">Tendência de Faturamento Mensal</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4">
                {reportData.revenueByMonth.map((month, index) => (
                  <div key={index} className="text-center">
                    <div className="text-sm text-slate-400 mb-1">{month.month}</div>
                    <div className="text-lg font-semibold text-white">{formatCurrency(month.revenue)}</div>
                    <div className="text-xs text-slate-400">{month.appointments} agendamentos</div>
                  </div>
                ))}
              </div>
            </div>
          </>
        ) : (
          <div className="bg-slate-800 rounded-lg p-12 border border-slate-700 text-center">
            <FileText className="h-16 w-16 mx-auto mb-4 text-slate-600" />
            <h3 className="text-xl font-semibold text-white mb-2">Nenhum dado encontrado</h3>
            <p className="text-slate-400 mb-6">
              Não há dados suficientes para gerar relatórios no período selecionado.
            </p>
            <Button 
              onClick={fetchReportData}
              className="bg-amber-600 hover:bg-amber-700"
            >
              <BarChart className="h-4 w-4 mr-2" />
              Tentar Novamente
            </Button>
          </div>
        )}
      </div>
    </div>
  )
}