'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'

interface Product {
  id: string
  name: string
  description?: string | null
  price: number
  category?: string | null
  isActive: boolean
  createdAt: string
  _count?: { appointmentItems: number }
}

const CATEGORIES = ['Cabelo', 'Barba', 'Pele', 'Acessórios', 'Outros']

const EMPTY_FORM = { name: '', description: '', price: '', category: '' }

export default function ProductsManagement({ canEdit = true }: { canEdit?: boolean }) {
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editingProduct, setEditingProduct] = useState<Product | null>(null)
  const [formData, setFormData] = useState(EMPTY_FORM)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    fetchProducts()
  }, [])

  const fetchProducts = async () => {
    try {
      const response = await fetch('/api/admin/products')
      const data = await response.json()
      if (data.success) {
        setProducts(data.products as Product[])
      }
    } catch (error) {
      console.error('Erro ao carregar produtos:', error)
    } finally {
      setLoading(false)
    }
  }

  const closeModal = () => {
    setShowModal(false)
    setEditingProduct(null)
    setFormData(EMPTY_FORM)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)

    try {
      const url = editingProduct ? `/api/admin/products/${editingProduct.id}` : '/api/admin/products'
      const response = await fetch(url, {
        method: editingProduct ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formData.name,
          description: formData.description,
          price: parseFloat(formData.price),
          category: formData.category,
        }),
      })

      const data = await response.json()

      if (data.success) {
        await fetchProducts()
        closeModal()
      } else {
        alert('Erro: ' + (data.error || 'não foi possível salvar o produto'))
      }
    } catch (error) {
      console.error('Erro ao salvar produto:', error)
      alert('Erro ao salvar produto')
    } finally {
      setSaving(false)
    }
  }

  const handleEdit = (product: Product) => {
    setEditingProduct(product)
    setFormData({
      name: product.name,
      description: product.description || '',
      price: product.price.toString(),
      category: product.category || '',
    })
    setShowModal(true)
  }

  const handleDelete = async (product: Product) => {
    const sold = product._count?.appointmentItems || 0
    const question = sold > 0
      ? 'Este produto já foi incluído em agendamentos, então será apenas desativado. Continuar?'
      : 'Tem certeza que deseja excluir este produto?'
    if (!confirm(question)) return

    try {
      const response = await fetch(`/api/admin/products/${product.id}`, { method: 'DELETE' })
      const data = await response.json()

      if (data.success) {
        await fetchProducts()
      } else {
        alert('Erro: ' + (data.error || 'não foi possível excluir o produto'))
      }
    } catch (error) {
      console.error('Erro ao excluir produto:', error)
      alert('Erro ao excluir produto')
    }
  }

  const toggleActive = async (product: Product) => {
    try {
      const response = await fetch(`/api/admin/products/${product.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: !product.isActive }),
      })
      const data = await response.json()

      if (data.success) {
        await fetchProducts()
      } else {
        alert('Erro: ' + (data.error || 'não foi possível alterar o status'))
      }
    } catch (error) {
      console.error('Erro ao alterar status:', error)
    }
  }

  if (loading) {
    return <div className="text-white text-center">Carregando produtos...</div>
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-2xl font-bold text-white">Produtos</h2>
          <p className="text-sm text-slate-400">
            Produtos ativos aparecem para o cliente no agendamento, depois da escolha do serviço.
          </p>
        </div>
        {canEdit && (
          <Button
            onClick={() => {
              setEditingProduct(null)
              setFormData(EMPTY_FORM)
              setShowModal(true)
            }}
            className="w-full sm:w-auto bg-amber-600 hover:bg-amber-700"
          >
            Adicionar Produto
          </Button>
        )}
      </div>

      <div className="grid gap-4">
        {products.map((product) => (
          <div key={product.id} className="bg-slate-800 rounded-lg p-6 border border-slate-700">
            <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
              <div className="space-y-2">
                <div className="flex flex-wrap items-center gap-3">
                  <h3 className="text-xl font-semibold text-white">{product.name}</h3>
                  <span className={`px-2 py-1 rounded-full text-xs ${
                    product.isActive
                      ? 'bg-green-900/20 text-green-400 border border-green-600'
                      : 'bg-red-900/20 text-red-400 border border-red-600'
                  }`}>
                    {product.isActive ? 'Ativo' : 'Inativo'}
                  </span>
                  {product.category && (
                    <span className="px-2 py-1 rounded-md text-xs bg-slate-700 text-slate-300">{product.category}</span>
                  )}
                </div>
                {product.description && <p className="text-sm text-slate-300">{product.description}</p>}
                <div className="flex flex-wrap items-center gap-4 text-slate-400">
                  <span>R$ {product.price.toFixed(2)}</span>
                  <span>{product._count?.appointmentItems || 0} venda(s) em agendamentos</span>
                </div>
              </div>
              {canEdit && (
                <div className="flex flex-wrap gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => toggleActive(product)}
                    className={`text-slate-300 border-slate-600 hover:bg-slate-700 ${product.isActive ? '' : 'opacity-50'}`}
                  >
                    {product.isActive ? 'Desativar' : 'Ativar'}
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleEdit(product)}
                    className="text-slate-300 border-slate-600 hover:bg-slate-700"
                  >
                    Editar
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleDelete(product)}
                    className="text-red-400 border-red-600 hover:bg-red-900/20"
                  >
                    Excluir
                  </Button>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {products.length === 0 && (
        <div className="text-center text-slate-400 py-8">Nenhum produto cadastrado</div>
      )}

      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-slate-800 rounded-lg p-4 sm:p-6 w-full max-w-md max-h-[90vh] overflow-y-auto border border-slate-700">
            <h3 className="text-lg font-semibold text-white mb-4">
              {editingProduct ? 'Editar Produto' : 'Adicionar Produto'}
            </h3>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-white mb-2">Nome do Produto</label>
                <input
                  type="text"
                  required
                  maxLength={80}
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-white"
                  placeholder="Ex: Pomada modeladora"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-white mb-2">Descrição</label>
                <textarea
                  rows={3}
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-white"
                  placeholder="O que o cliente precisa saber sobre o produto"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-white mb-2">Preço (R$)</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0.01"
                    required
                    value={formData.price}
                    onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                    className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-white"
                    placeholder="45.00"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-white mb-2">Categoria</label>
                  <select
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-white"
                  >
                    <option value="">Sem categoria</option>
                    {CATEGORIES.map((category) => (
                      <option key={category} value={category}>{category}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row gap-3 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={closeModal}
                  className="flex-1 border-slate-600 text-slate-300 hover:bg-slate-700"
                >
                  Cancelar
                </Button>
                <Button type="submit" disabled={saving} className="flex-1 bg-amber-600 hover:bg-amber-700">
                  {saving ? 'Salvando...' : editingProduct ? 'Atualizar' : 'Adicionar'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
