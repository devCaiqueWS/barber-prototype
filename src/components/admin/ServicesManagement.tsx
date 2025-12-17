'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Scissors, Plus, Edit, Trash2, Clock, DollarSign } from 'lucide-react'

interface Service {
  id: string
  name: string
  price: number
  duration: number
  isActive: boolean
  createdAt: string
}

export default function ServicesManagement() {
  const [services, setServices] = useState<Service[]>([])
  const [loading, setLoading] = useState(true)
  const [showAddModal, setShowAddModal] = useState(false)
  const [editingService, setEditingService] = useState<Service | null>(null)
  const [formData, setFormData] = useState({
    name: '',
    price: '',
    duration: '',
  })

  useEffect(() => {
    fetchServices()
  }, [])

  const fetchServices = async () => {
    try {
      const response = await fetch('/api/admin/services')
      const data = await response.json()
      if (data.success) {
        setServices(data.services as Service[])
      }
    } catch (error) {
      console.error('Erro ao carregar serviços:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    try {
      const url = editingService 
        ? `/api/admin/services/${editingService.id}`
        : '/api/admin/services'
      
      const method = editingService ? 'PUT' : 'POST'
      
      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: formData.name,
          price: parseFloat(formData.price),
          duration: parseInt(formData.duration),
        }),
      })

      const data = await response.json()
      
      if (data.success) {
        await fetchServices()
        setShowAddModal(false)
        setEditingService(null)
        setFormData({ name: '', price: '', duration: '' })
      } else {
        alert('Erro: ' + data.error)
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
      price: service.price.toString(),
      duration: service.duration.toString(),
    })
    setShowAddModal(true)
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Tem certeza que deseja excluir este serviço?')) return

    try {
      const response = await fetch(`/api/admin/services/${id}`, {
        method: 'DELETE',
      })

      const data = await response.json()
      
      if (data.success) {
        await fetchServices()
      } else {
        alert('Erro: ' + data.error)
      }
    } catch (error) {
      console.error('Erro ao excluir serviço:', error)
      alert('Erro ao excluir serviço')
    }
  }

  const toggleActive = async (id: string, isActive: boolean) => {
    try {
      const response = await fetch(`/api/admin/services/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ isActive: !isActive }),
      })

      const data = await response.json()
      
      if (data.success) {
        await fetchServices()
      }
    } catch (error) {
      console.error('Erro ao alterar status:', error)
    }
  }

  if (loading) {
    return <div className="text-white text-center">Carregando serviços...</div>
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div className="flex items-center space-x-2">
          <Scissors className="h-6 w-6 text-amber-500" />
          <h2 className="text-2xl font-bold text-white">Serviços</h2>
        </div>
        <Button
          onClick={() => {
            setEditingService(null)
            setFormData({ name: '', price: '', duration: '' })
            setShowAddModal(true)
          }}
          className="bg-amber-600 hover:bg-amber-700"
        >
          <Plus className="h-4 w-4 mr-2" />
          Adicionar Serviço
        </Button>
      </div>

      {/* Lista de Serviços */}
      <div className="grid gap-4">
        {services.map((service) => (
          <div key={service.id} className="bg-slate-800 rounded-lg p-6 border border-slate-700">
            <div className="flex justify-between items-start">
              <div className="space-y-2">
                <div className="flex items-center space-x-3">
                  <h3 className="text-xl font-semibold text-white">{service.name}</h3>
                  <span className={`px-2 py-1 rounded-full text-xs ${
                    service.isActive 
                      ? 'bg-green-900/20 text-green-400 border border-green-600' 
                      : 'bg-red-900/20 text-red-400 border border-red-600'
                  }`}>
                    {service.isActive ? 'Ativo' : 'Inativo'}
                  </span>
                </div>
                <div className="flex items-center space-x-4 text-slate-400">
                  <div className="flex items-center space-x-1">
                    <DollarSign className="h-4 w-4" />
                    <span>R$ {service.price.toFixed(2)}</span>
                  </div>
                  <div className="flex items-center space-x-1">
                    <Clock className="h-4 w-4" />
                    <span>{service.duration} min</span>
                  </div>
                </div>
                <p className="text-sm text-slate-500">
                  Cadastrado em:{' '}
                  {new Date(service.createdAt).toLocaleDateString('pt-BR', {
                    day: '2-digit',
                    month: '2-digit',
                    year: 'numeric',
                  })}
                </p>
              </div>
              <div className="flex space-x-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => toggleActive(service.id, service.isActive)}
                  className={`text-slate-300 border-slate-600 hover:bg-slate-700 ${
                    service.isActive ? '' : 'opacity-50'
                  }`}
                >
                  {service.isActive ? 'Desativar' : 'Ativar'}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleEdit(service)}
                  className="text-slate-300 border-slate-600 hover:bg-slate-700"
                >
                  <Edit className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleDelete(service.id)}
                  className="text-red-400 border-red-600 hover:bg-red-900/20"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {services.length === 0 && (
        <div className="text-center text-slate-400 py-8">
          Nenhum serviço cadastrado
        </div>
      )}

      {/* Modal de Adicionar/Editar */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-slate-800 rounded-lg p-6 w-full max-w-md border border-slate-700">
            <h3 className="text-lg font-semibold text-white mb-4">
              {editingService ? 'Editar Serviço' : 'Adicionar Serviço'}
            </h3>
            
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-white mb-2">
                  Nome do Serviço
                </label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-white"
                  placeholder="Ex: Corte Masculino"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-white mb-2">
                  Preço (R$)
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  required
                  value={formData.price}
                  onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                  className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-white"
                  placeholder="25.00"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-white mb-2">
                  Duração (minutos)
                </label>
                <input
                  type="number"
                  min="1"
                  required
                  value={formData.duration}
                  onChange={(e) => setFormData({ ...formData, duration: e.target.value })}
                  className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-white"
                  placeholder="30"
                />
              </div>
              
              <div className="flex space-x-3 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setShowAddModal(false)
                    setEditingService(null)
                  }}
                  className="flex-1 border-slate-600 text-slate-300 hover:bg-slate-700"
                >
                  Cancelar
                </Button>
                <Button
                  type="submit"
                  className="flex-1 bg-amber-600 hover:bg-amber-700"
                >
                  {editingService ? 'Atualizar' : 'Adicionar'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
