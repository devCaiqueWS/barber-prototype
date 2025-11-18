'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { Users, ChevronLeft, Plus, Edit, Trash2, Search, Mail, Phone, Calendar, Scissors } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface Barber {
  id: string
  name: string
  email: string
  phone?: string
  specialties?: string[]
  workDays?: string[]
  workStartTime?: string
  workEndTime?: string
  isActive: boolean
  createdAt: string
  _count?: {
    appointments: number
  }
}

export default function AdminBarbers() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [barbers, setBarbers] = useState<Barber[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [editingBarber, setEditingBarber] = useState<Barber | null>(null)
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    specialties: '',
    workDays: [] as string[],
    workStartTime: '09:00',
    workEndTime: '18:00',
    isActive: true
  })

  const weekDays = [
    { id: 'monday', label: 'Segunda' },
    { id: 'tuesday', label: 'Terça' },
    { id: 'wednesday', label: 'Quarta' },
    { id: 'thursday', label: 'Quinta' },
    { id: 'friday', label: 'Sexta' },
    { id: 'saturday', label: 'Sábado' },
    { id: 'sunday', label: 'Domingo' }
  ]

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

    fetchBarbers()
  }, [session, status, router])

  const fetchBarbers = async () => {
    try {
      const response = await fetch('/api/admin/barbers')
      const data = await response.json()
      setBarbers(data.barbers || [])
    } catch (error) {
      console.error('Erro ao carregar barbeiros:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    try {
      const payload = {
        ...formData,
        specialties: formData.specialties.split(',').map(s => s.trim()).filter(s => s)
      }

      const url = editingBarber ? `/api/admin/barbers/${editingBarber.id}` : '/api/admin/barbers'
      const method = editingBarber ? 'PUT' : 'POST'

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      })

      if (response.ok) {
        await fetchBarbers()
        resetForm()
      } else {
        const error = await response.json()
        alert(error.error || 'Erro ao salvar barbeiro')
      }
    } catch (error) {
      console.error('Erro ao salvar barbeiro:', error)
      alert('Erro ao salvar barbeiro')
    }
  }

  const handleEdit = (barber: Barber) => {
    setEditingBarber(barber)
    setFormData({
      name: barber.name,
      email: barber.email,
      phone: barber.phone || '',
      specialties: barber.specialties?.join(', ') || '',
      workDays: barber.workDays || [],
      workStartTime: barber.workStartTime || '09:00',
      workEndTime: barber.workEndTime || '18:00',
      isActive: barber.isActive
    })
    setShowForm(true)
  }

  const handleDelete = async (barberId: string) => {
    if (!confirm('Tem certeza que deseja excluir este barbeiro?')) return

    try {
      const response = await fetch(`/api/admin/barbers/${barberId}`, {
        method: 'DELETE',
      })

      if (response.ok) {
        await fetchBarbers()
      } else {
        const error = await response.json()
        alert(error.error || 'Erro ao excluir barbeiro')
      }
    } catch (error) {
      console.error('Erro ao excluir barbeiro:', error)
      alert('Erro ao excluir barbeiro')
    }
  }

  const resetForm = () => {
    setFormData({
      name: '',
      email: '',
      phone: '',
      specialties: '',
      workDays: [],
      workStartTime: '09:00',
      workEndTime: '18:00',
      isActive: true
    })
    setEditingBarber(null)
    setShowForm(false)
  }

  const handleWorkDayToggle = (dayId: string) => {
    setFormData(prev => ({
      ...prev,
      workDays: prev.workDays.includes(dayId)
        ? prev.workDays.filter(d => d !== dayId)
        : [...prev.workDays, dayId]
    }))
  }

  const filteredBarbers = barbers.filter(barber =>
    barber.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    barber.email.toLowerCase().includes(searchTerm.toLowerCase())
  )

  if (loading) {
    return (
      <div className="min-h-screen bg-[#1F1F1F] flex items-center justify-center">
        <div className="text-white">Carregando barbeiros...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#1F1F1F] p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center space-x-4">
            <Button variant="ghost" onClick={() => router.back()} className="text-white hover:bg-slate-700">
              <ChevronLeft className="h-4 w-4 mr-2" />
              Voltar
            </Button>
            <h1 className="text-3xl font-bold text-white">Gerenciar Barbeiros</h1>
          </div>
          <Button 
            className="bg-amber-600 hover:bg-amber-700"
            onClick={() => setShowForm(true)}
          >
            <Plus className="h-4 w-4 mr-2" />
            Novo Barbeiro
          </Button>
        </div>

        {/* Search */}
        <div className="mb-6">
          <div className="relative max-w-md">
            <Search className="h-4 w-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Buscar barbeiros..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-slate-800 border border-slate-600 rounded-md text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-500"
            />
          </div>
        </div>

        {/* Form Modal */}
        {showForm && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-slate-800 rounded-lg border border-slate-700 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
              <div className="p-6">
                <h2 className="text-xl font-semibold text-white mb-6">
                  {editingBarber ? 'Editar Barbeiro' : 'Novo Barbeiro'}
                </h2>
                
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-300 mb-2">Nome *</label>
                      <input
                        type="text"
                        required
                        value={formData.name}
                        onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                        className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-slate-300 mb-2">Email *</label>
                      <input
                        type="email"
                        required
                        value={formData.email}
                        onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                        className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-300 mb-2">Telefone</label>
                      <input
                        type="tel"
                        value={formData.phone}
                        onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                        className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-slate-300 mb-2">Especialidades</label>
                      <input
                        type="text"
                        placeholder="Ex: Corte, Barba, Bigode (separados por vírgula)"
                        value={formData.specialties}
                        onChange={(e) => setFormData(prev => ({ ...prev, specialties: e.target.value }))}
                        className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">Dias de Trabalho</label>
                    <div className="grid grid-cols-4 md:grid-cols-7 gap-2">
                      {weekDays.map(day => (
                        <button
                          key={day.id}
                          type="button"
                          onClick={() => handleWorkDayToggle(day.id)}
                          className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                            formData.workDays.includes(day.id)
                              ? 'bg-amber-600 text-white'
                              : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                          }`}
                        >
                          {day.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-300 mb-2">Horário de Início</label>
                      <input
                        type="time"
                        value={formData.workStartTime}
                        onChange={(e) => setFormData(prev => ({ ...prev, workStartTime: e.target.value }))}
                        className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-slate-300 mb-2">Horário de Fim</label>
                      <input
                        type="time"
                        value={formData.workEndTime}
                        onChange={(e) => setFormData(prev => ({ ...prev, workEndTime: e.target.value }))}
                        className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                      />
                    </div>
                  </div>

                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      id="isActive"
                      checked={formData.isActive}
                      onChange={(e) => setFormData(prev => ({ ...prev, isActive: e.target.checked }))}
                      className="w-4 h-4 text-amber-600 bg-slate-700 border-slate-600 rounded focus:ring-amber-500"
                    />
                    <label htmlFor="isActive" className="ml-2 text-sm text-slate-300">
                      Barbeiro ativo (pode receber agendamentos)
                    </label>
                  </div>

                  <div className="flex justify-end space-x-4 pt-4">
                    <Button type="button" variant="outline" onClick={resetForm} className="border-slate-600 text-white hover:bg-slate-700">
                      Cancelar
                    </Button>
                    <Button type="submit" className="bg-amber-600 hover:bg-amber-700">
                      {editingBarber ? 'Atualizar' : 'Criar'} Barbeiro
                    </Button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        )}

        {/* Barbers List */}
        <div className="bg-slate-800 rounded-lg border border-slate-700">
          {filteredBarbers.length === 0 ? (
            <div className="p-12 text-center">
              <Users className="h-16 w-16 mx-auto mb-4 text-slate-600" />
              <h3 className="text-xl font-semibold text-white mb-2">Nenhum barbeiro encontrado</h3>
              <p className="text-slate-400 mb-6">
                {barbers.length === 0 
                  ? 'Ainda não há barbeiros cadastrados no sistema.'
                  : 'Nenhum barbeiro corresponde à busca realizada.'
                }
              </p>
              <Button 
                className="bg-amber-600 hover:bg-amber-700"
                onClick={() => setShowForm(true)}
              >
                <Plus className="h-4 w-4 mr-2" />
                Cadastrar Primeiro Barbeiro
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 p-6">
              {filteredBarbers.map((barber) => (
                <div key={barber.id} className="bg-slate-700 rounded-lg p-6 border border-slate-600 hover:border-slate-500 transition-colors">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center space-x-3">
                      <div className="w-12 h-12 bg-amber-600 rounded-full flex items-center justify-center">
                        <Scissors className="h-6 w-6 text-white" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-white">{barber.name}</h3>
                        <span className={`inline-block px-2 py-1 rounded-full text-xs font-medium ${
                          barber.isActive ? 'bg-green-600 text-white' : 'bg-red-600 text-white'
                        }`}>
                          {barber.isActive ? 'Ativo' : 'Inativo'}
                        </span>
                      </div>
                    </div>
                    <div className="flex space-x-2">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleEdit(barber)}
                        className="text-amber-500 hover:text-amber-400 hover:bg-slate-600"
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleDelete(barber.id)}
                        className="text-red-500 hover:text-red-400 hover:bg-slate-600"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>

                  <div className="space-y-2 text-sm">
                    <div className="flex items-center text-slate-300">
                      <Mail className="h-4 w-4 mr-2" />
                      {barber.email}
                    </div>
                    {barber.phone && (
                      <div className="flex items-center text-slate-300">
                        <Phone className="h-4 w-4 mr-2" />
                        {barber.phone}
                      </div>
                    )}
                    {barber._count && (
                      <div className="flex items-center text-slate-300">
                        <Calendar className="h-4 w-4 mr-2" />
                        {barber._count.appointments} agendamentos
                      </div>
                    )}
                  </div>

                  {barber.specialties && barber.specialties.length > 0 && (
                    <div className="mt-4">
                      <p className="text-xs text-slate-400 mb-2">Especialidades:</p>
                      <div className="flex flex-wrap gap-1">
                        {barber.specialties.map((specialty, index) => (
                          <span
                            key={index}
                            className="px-2 py-1 bg-slate-600 text-slate-300 rounded-md text-xs"
                          >
                            {specialty}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {barber.workDays && barber.workDays.length > 0 && (
                    <div className="mt-4">
                      <p className="text-xs text-slate-400 mb-2">Horário de trabalho:</p>
                      <p className="text-xs text-slate-300">
                        {barber.workStartTime} - {barber.workEndTime}
                      </p>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {barber.workDays.map((day, index) => (
                          <span
                            key={index}
                            className="px-1 py-0.5 bg-amber-600 text-white rounded text-xs"
                          >
                            {weekDays.find(wd => wd.id === day)?.label}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Summary */}
        {filteredBarbers.length > 0 && (
          <div className="mt-6 bg-slate-800 rounded-lg p-6 border border-slate-700">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-center">
              <div>
                <div className="text-2xl font-bold text-white">{filteredBarbers.length}</div>
                <div className="text-sm text-slate-400">Total de Barbeiros</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-green-500">
                  {filteredBarbers.filter(b => b.isActive).length}
                </div>
                <div className="text-sm text-slate-400">Ativos</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-red-500">
                  {filteredBarbers.filter(b => !b.isActive).length}
                </div>
                <div className="text-sm text-slate-400">Inativos</div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
