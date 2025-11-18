'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Mail, Plus, Users, Edit, Trash2 } from 'lucide-react'

interface Barber {
  id: string
  name: string
  email: string
  role: string
  createdAt: string
}

export default function BarbersManagement() {
  const [barbers, setBarbers] = useState<Barber[]>([])
  const [loading, setLoading] = useState(true)
  const [showAddModal, setShowAddModal] = useState(false)
  const [editingBarber, setEditingBarber] = useState<Barber | null>(null)
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
  })

  useEffect(() => {
    fetchBarbers()
  }, [])

  const fetchBarbers = async () => {
    try {
      const response = await fetch('/api/admin/barbers')
      const data = await response.json()
      const list = Array.isArray(data) ? data : (Array.isArray((data as any)?.barbers) ? (data as any).barbers : [])
      setBarbers(list as Barber[])
    } catch (error) {
      console.error('Erro ao carregar barbeiros:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    try {
      const url = editingBarber 
        ? `/api/admin/barbers/${editingBarber.id}`
        : '/api/admin/barbers'
      
      const method = editingBarber ? 'PUT' : 'POST'
      
      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      })

      if (response.ok) {
        await fetchBarbers()
        setShowAddModal(false)
        setEditingBarber(null)
        setFormData({ name: '', email: '', password: '' })
      } else {
        const err = await response.json().catch(() => ({} as any))
        alert('Erro ao salvar barbeiro' + (err?.error ? `: ${err.error}` : ''))
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
      password: '',
    })
    setShowAddModal(true)
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Tem certeza que deseja excluir este barbeiro?')) return

    try {
      const response = await fetch(`/api/admin/barbers/${id}`, {
        method: 'DELETE',
      })

      if (response.ok) {
        await fetchBarbers()
      } else {
        const err = await response.json().catch(() => ({} as any))
        alert('Erro ao excluir barbeiro' + (err?.error ? `: ${err.error}` : ''))
      }
    } catch (error) {
      console.error('Erro ao excluir barbeiro:', error)
      alert('Erro ao excluir barbeiro')
    }
  }

  if (loading) {
    return <div className="text-white text-center">Carregando barbeiros...</div>
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div className="flex items-center space-x-2">
          <Users className="h-6 w-6 text-primary" />
          <h2 className="text-2xl font-bold text-white">Barbeiros</h2>
        </div>
        <Button
          onClick={() => {
            setEditingBarber(null)
            setFormData({ name: '', email: '', password: '' })
            setShowAddModal(true)
          }}
          className="bg-amber-600 hover:bg-amber-700"
        >
          <Plus className="h-4 w-4 mr-2" />
          Adicionar Barbeiro
        </Button>
      </div>

      {/* Lista de Barbeiros */}
      <div className="grid gap-4">
        {barbers.map((barber) => (
          <div key={barber.id} className="bg-slate-800 rounded-lg p-6 border border-slate-700">
            <div className="flex justify-between items-start">
              <div className="space-y-2">
                <h3 className="text-xl font-semibold text-white">{barber.name}</h3>
                <div className="flex items-center space-x-4 text-slate-400">
                  <div className="flex items-center space-x-1">
                    <Mail className="h-4 w-4" />
                    <span>{barber.email}</span>
                  </div>
                </div>
                <p className="text-sm text-slate-500">
                  Cadastrado em: {new Date(barber.createdAt).toLocaleDateString()}
                </p>
              </div>
              <div className="flex space-x-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleEdit(barber)}
                  className="text-slate-300 border-slate-600 hover:bg-slate-700"
                >
                  <Edit className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleDelete(barber.id)}
                  className="text-red-400 border-red-600 hover:bg-red-900/20"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {barbers.length === 0 && (
        <div className="text-center text-slate-400 py-8">
          Nenhum barbeiro cadastrado
        </div>
      )}

      {/* Modal de Adicionar/Editar */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-slate-800 rounded-lg p-6 w-full max-w-md border border-slate-700">
            <h3 className="text-lg font-semibold text-white mb-4">
              {editingBarber ? 'Editar Barbeiro' : 'Adicionar Barbeiro'}
            </h3>
            
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-white mb-2">
                  Nome
                </label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-white"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-white mb-2">
                  Email
                </label>
                <input
                  type="email"
                  required
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-white"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-white mb-2">
                  {editingBarber ? 'Nova Senha (deixe vazio para manter)' : 'Senha'}
                </label>
                <input
                  type="password"
                  required={!editingBarber}
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-white"
                />
              </div>
              
              <div className="flex space-x-3 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setShowAddModal(false)
                    setEditingBarber(null)
                  }}
                  className="flex-1 border-slate-600 text-slate-300 hover:bg-slate-700"
                >
                  Cancelar
                </Button>
                <Button
                  type="submit"
                  className="flex-1 bg-amber-600 hover:bg-amber-700"
                >
                  {editingBarber ? 'Atualizar' : 'Adicionar'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
