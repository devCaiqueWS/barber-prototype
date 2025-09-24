'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { Scissors, ChevronLeft, Plus, Edit, Trash2, Search, Clock, DollarSign } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface Service {
  id: string
  name: string
  description?: string
  price: number
  duration: number
  category?: string
  isActive: boolean
  createdAt: string
  _count?: {
    appointments: number
  }
}

export default function AdminServices() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [services, setServices] = useState<Service[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('all')
  const [showForm, setShowForm] = useState(false)
  const [editingService, setEditingService] = useState<Service | null>(null)
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    price: '',
    duration: '',
    category: '',
    isActive: true
  })

  const categories = [
    'Corte de Cabelo',
    'Barba',
    'Bigode',
    'Sobrancelha',
    'Tratamentos',
    'Combo',
    'Outros'
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

    fetchServices()
  }, [session, status, router])

  const fetchServices = async () => {
    try {
      const response = await fetch('/api/admin/services')
      const data = await response.json()
      setServices(data.services || [])
    } catch (error) {
      console.error('Erro ao carregar serviços:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    try {
      const payload = {
        ...formData,
        price: parseFloat(formData.price),
        duration: parseInt(formData.duration)
      }

      const url = editingService ? `/api/admin/services/${editingService.id}` : '/api/admin/services'
      const method = editingService ? 'PUT' : 'POST'

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      })

      if (response.ok) {
        await fetchServices()
        resetForm()
      } else {
        const error = await response.json()
        alert(error.error || 'Erro ao salvar serviço')
      }
    } catch (error) {
      console.error('Erro ao salvar serviço:', error)
      alert('Erro ao salvar serviço')
    }
  }

  const handleEdit = (service: Service) => {
    setEditingService(service)
    setFormData({
      name: service.name,
      description: service.description || '',
      price: service.price.toString(),
      duration: service.duration.toString(),
      category: service.category || '',
      isActive: service.isActive
    })
    setShowForm(true)
  }

  const handleDelete = async (serviceId: string) => {
    if (!confirm('Tem certeza que deseja excluir este serviço?')) return

    try {
      const response = await fetch(`/api/admin/services/${serviceId}`, {
        method: 'DELETE',
      })

      if (response.ok) {
        await fetchServices()
      } else {
        const error = await response.json()
        alert(error.error || 'Erro ao excluir serviço')
      }
    } catch (error) {
      console.error('Erro ao excluir serviço:', error)
      alert('Erro ao excluir serviço')
    }
  }

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      price: '',
      duration: '',
      category: '',
      isActive: true
    })
    setEditingService(null)
    setShowForm(false)
  }

  const filteredServices = services.filter(service => {
    const matchesSearch = service.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         (service.description || '').toLowerCase().includes(searchTerm.toLowerCase())
    
    const matchesCategory = categoryFilter === 'all' || service.category === categoryFilter

    return matchesSearch && matchesCategory
  })

  const formatDuration = (minutes: number) => {
    if (minutes < 60) return `${minutes}min`
    const hours = Math.floor(minutes / 60)
    const remainingMinutes = minutes % 60
    return remainingMinutes > 0 ? `${hours}h ${remainingMinutes}min` : `${hours}h`
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="text-white">Carregando serviços...</div>
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
            <h1 className="text-3xl font-bold text-white">Gerenciar Serviços</h1>
          </div>
          <Button 
            className="bg-amber-600 hover:bg-amber-700"
            onClick={() => setShowForm(true)}
          >
            <Plus className="h-4 w-4 mr-2" />
            Novo Serviço
          </Button>
        </div>

        {/* Filters */}
        <div className="bg-slate-800 rounded-lg p-6 mb-6 border border-slate-700">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">Buscar</label>
              <div className="relative">
                <Search className="h-4 w-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Nome ou descrição do serviço..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 bg-slate-700 border border-slate-600 rounded-md text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">Categoria</label>
              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-amber-500"
              >
                <option value="all">Todas as categorias</option>
                {categories.map(category => (
                  <option key={category} value={category}>{category}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Form Modal */}
        {showForm && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-slate-800 rounded-lg border border-slate-700 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
              <div className="p-6">
                <h2 className="text-xl font-semibold text-white mb-6">
                  {editingService ? 'Editar Serviço' : 'Novo Serviço'}
                </h2>
                
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">Nome do Serviço *</label>
                    <input
                      type="text"
                      required
                      value={formData.name}
                      onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                      className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                      placeholder="Ex: Corte Masculino"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">Descrição</label>
                    <textarea
                      value={formData.description}
                      onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                      rows={3}
                      className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                      placeholder="Descrição detalhada do serviço..."
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-300 mb-2">Preço (R$) *</label>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        required
                        value={formData.price}
                        onChange={(e) => setFormData(prev => ({ ...prev, price: e.target.value }))}
                        className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                        placeholder="25.00"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-slate-300 mb-2">Duração (min) *</label>
                      <input
                        type="number"
                        min="5"
                        step="5"
                        required
                        value={formData.duration}
                        onChange={(e) => setFormData(prev => ({ ...prev, duration: e.target.value }))}
                        className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                        placeholder="30"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-slate-300 mb-2">Categoria</label>
                      <select
                        value={formData.category}
                        onChange={(e) => setFormData(prev => ({ ...prev, category: e.target.value }))}
                        className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                      >
                        <option value="">Selecione uma categoria</option>
                        {categories.map(category => (
                          <option key={category} value={category}>{category}</option>
                        ))}
                      </select>
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
                      Serviço ativo (disponível para agendamento)
                    </label>
                  </div>

                  <div className="flex justify-end space-x-4 pt-4">
                    <Button type="button" variant="outline" onClick={resetForm} className="border-slate-600 text-white hover:bg-slate-700">
                      Cancelar
                    </Button>
                    <Button type="submit" className="bg-amber-600 hover:bg-amber-700">
                      {editingService ? 'Atualizar' : 'Criar'} Serviço
                    </Button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        )}

        {/* Services List */}
        <div className="bg-slate-800 rounded-lg border border-slate-700">
          {filteredServices.length === 0 ? (
            <div className="p-12 text-center">
              <Scissors className="h-16 w-16 mx-auto mb-4 text-slate-600" />
              <h3 className="text-xl font-semibold text-white mb-2">Nenhum serviço encontrado</h3>
              <p className="text-slate-400 mb-6">
                {services.length === 0 
                  ? 'Ainda não há serviços cadastrados no sistema.'
                  : 'Nenhum serviço corresponde aos filtros aplicados.'
                }
              </p>
              <Button 
                className="bg-amber-600 hover:bg-amber-700"
                onClick={() => setShowForm(true)}
              >
                <Plus className="h-4 w-4 mr-2" />
                Cadastrar Primeiro Serviço
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 p-6">
              {filteredServices.map((service) => (
                <div key={service.id} className="bg-slate-700 rounded-lg p-6 border border-slate-600 hover:border-slate-500 transition-colors">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center space-x-3">
                      <div className="w-12 h-12 bg-amber-600 rounded-full flex items-center justify-center">
                        <Scissors className="h-6 w-6 text-white" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-white">{service.name}</h3>
                        <span className={`inline-block px-2 py-1 rounded-full text-xs font-medium ${
                          service.isActive ? 'bg-green-600 text-white' : 'bg-red-600 text-white'
                        }`}>
                          {service.isActive ? 'Ativo' : 'Inativo'}
                        </span>
                      </div>
                    </div>
                    <div className="flex space-x-2">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleEdit(service)}
                        className="text-amber-500 hover:text-amber-400 hover:bg-slate-600"
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleDelete(service.id)}
                        className="text-red-500 hover:text-red-400 hover:bg-slate-600"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>

                  {service.description && (
                    <p className="text-slate-300 text-sm mb-4 line-clamp-2">{service.description}</p>
                  )}

                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center text-slate-300">
                        <DollarSign className="h-4 w-4 mr-2" />
                        <span className="text-lg font-semibold text-white">R$ {service.price.toFixed(2)}</span>
                      </div>
                      <div className="flex items-center text-slate-300">
                        <Clock className="h-4 w-4 mr-2" />
                        <span>{formatDuration(service.duration)}</span>
                      </div>
                    </div>

                    {service.category && (
                      <div className="flex items-center">
                        <span className="px-2 py-1 bg-slate-600 text-slate-300 rounded-md text-xs">
                          {service.category}
                        </span>
                      </div>
                    )}

                    {service._count && (
                      <div className="pt-2 border-t border-slate-600">
                        <p className="text-xs text-slate-400">
                          {service._count.appointments} agendamentos realizados
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Summary */}
        {filteredServices.length > 0 && (
          <div className="mt-6 bg-slate-800 rounded-lg p-6 border border-slate-700">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-center">
              <div>
                <div className="text-2xl font-bold text-white">{filteredServices.length}</div>
                <div className="text-sm text-slate-400">Total de Serviços</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-green-500">
                  {filteredServices.filter(s => s.isActive).length}
                </div>
                <div className="text-sm text-slate-400">Ativos</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-amber-500">
                  R$ {filteredServices
                    .filter(s => s.isActive)
                    .reduce((sum, s) => sum + s.price, 0)
                    .toFixed(2)}
                </div>
                <div className="text-sm text-slate-400">Valor Médio</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-blue-500">
                  {Math.round(filteredServices
                    .filter(s => s.isActive)
                    .reduce((sum, s) => sum + s.duration, 0) / 
                    Math.max(filteredServices.filter(s => s.isActive).length, 1))}min
                </div>
                <div className="text-sm text-slate-400">Duração Média</div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}