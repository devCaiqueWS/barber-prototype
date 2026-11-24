'use client'

import { useCallback, useEffect, useState } from 'react'
import { RELATIONSHIPS, type Relationship } from '@/lib/dependents'

export interface DependentItem {
  id: string
  name: string
  relationship: Relationship
}

interface DependentsManagerProps {
  /** Chamado sempre que a lista muda (carga inicial, inclusão, edição, remoção). Não usado no modo compacto. */
  onChange?: (list: DependentItem[]) => void
  /** Chamado com o dependente recém-criado */
  onAdded?: (dependent: DependentItem) => void
  /** Modo do agendamento: só o botão/formulário de adicionar, sem a lista */
  compact?: boolean
}

const inputClass = 'w-full rounded-lg border border-slate-600 bg-slate-800 p-3 text-white'
const relationshipOptions = Object.entries(RELATIONSHIPS) as Array<[Relationship, string]>

// Cadastro de dependentes do titular. Usado na Minha Conta e no agendamento.
export default function DependentsManager({ onChange, onAdded, compact = false }: DependentsManagerProps) {
  const [dependents, setDependents] = useState<DependentItem[]>([])
  const [loading, setLoading] = useState(!compact)
  const [formOpen, setFormOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [name, setName] = useState('')
  const [relationship, setRelationship] = useState<Relationship>('filho')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const updateList = useCallback(
    (list: DependentItem[]) => {
      setDependents(list)
      onChange?.(list)
    },
    [onChange],
  )

  const load = useCallback(async () => {
    try {
      const response = await fetch('/api/client/dependents', { cache: 'no-store' })
      const data = await response.json()
      if (response.ok) updateList(data.dependents || [])
    } catch (err) {
      console.error('Erro ao carregar dependentes:', err)
    } finally {
      setLoading(false)
    }
  }, [updateList])

  useEffect(() => {
    if (!compact) void load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [compact])

  const openForm = (dependent?: DependentItem) => {
    setEditingId(dependent?.id ?? null)
    setName(dependent?.name ?? '')
    setRelationship(dependent?.relationship ?? 'filho')
    setError('')
    setFormOpen(true)
  }

  const closeForm = () => {
    setFormOpen(false)
    setEditingId(null)
    setError('')
  }

  const handleSave = async () => {
    setSaving(true)
    setError('')
    try {
      const response = await fetch(editingId ? `/api/client/dependents/${editingId}` : '/api/client/dependents', {
        method: editingId ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, relationship }),
      })
      const data = await response.json()
      if (!response.ok) {
        setError(data.error || 'Não foi possível salvar.')
        return
      }
      const saved = data.dependent as DependentItem
      const next = editingId
        ? dependents.map((d) => (d.id === saved.id ? saved : d))
        : [...dependents, saved].sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'))
      // No modo compacto a lista é de quem usa o componente: só avisa a inclusão
      if (!compact) updateList(next)
      if (!editingId) onAdded?.(saved)
      closeForm()
    } catch {
      setError('Erro de conexão. Tente novamente.')
    } finally {
      setSaving(false)
    }
  }

  const handleRemove = async (dependent: DependentItem) => {
    if (!confirm(`Remover ${dependent.name} dos seus dependentes? Os agendamentos já feitos continuam no histórico.`)) return
    try {
      const response = await fetch(`/api/client/dependents/${dependent.id}`, { method: 'DELETE' })
      const data = await response.json()
      if (!response.ok) {
        alert(data.error || 'Não foi possível remover.')
        return
      }
      updateList(dependents.filter((d) => d.id !== dependent.id))
    } catch {
      alert('Não foi possível remover.')
    }
  }

  // O formulário fica no submit do botão (e não num <form>) porque no agendamento
  // ele aparece dentro do formulário principal, e forms não podem ser aninhados.
  const form = (
    <div className="space-y-3 rounded-lg border border-slate-600 bg-slate-900/60 p-3">
      <div>
        <label className="mb-1 block text-sm font-medium">Nome</label>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => {
            // Dentro do formulário de agendamento, Enter enviaria a reserva: salva o dependente
            if (e.key === 'Enter') {
              e.preventDefault()
              if (!saving) void handleSave()
            }
          }}
          className={inputClass}
          placeholder="Nome de quem vai cortar"
          maxLength={80}
        />
      </div>
      <div>
        <label className="mb-1 block text-sm font-medium">Parentesco</label>
        <select
          value={relationship}
          onChange={(e) => setRelationship(e.target.value as Relationship)}
          className={inputClass}
        >
          {relationshipOptions.map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
      </div>
      {error && <p className="text-sm text-red-300">{error}</p>}
      <div className="flex gap-2">
        <button
          type="button"
          onClick={handleSave}
          disabled={saving}
          className="rounded-lg bg-amber-500 px-4 py-2 text-sm font-bold text-black hover:bg-amber-600 disabled:opacity-60"
        >
          {saving ? 'Salvando...' : editingId ? 'Salvar' : 'Adicionar'}
        </button>
        <button
          type="button"
          onClick={closeForm}
          className="rounded-lg border border-slate-600 px-4 py-2 text-sm text-slate-200 hover:bg-slate-700"
        >
          Cancelar
        </button>
      </div>
    </div>
  )

  if (compact) {
    return formOpen ? (
      form
    ) : (
      <button
        type="button"
        onClick={() => openForm()}
        className="text-sm font-semibold text-amber-300 hover:underline"
      >
        + Adicionar dependente
      </button>
    )
  }

  return (
    <div className="space-y-3">
      {loading ? (
        <p className="text-sm text-slate-400">Carregando...</p>
      ) : dependents.length === 0 && !formOpen ? (
        <p className="text-sm text-slate-400">Nenhum dependente cadastrado.</p>
      ) : (
        <ul className="space-y-2">
          {dependents.map((dependent) => (
            <li
              key={dependent.id}
              className="flex items-center justify-between gap-3 rounded-lg border border-white/10 bg-slate-800/60 px-3 py-2"
            >
              <div>
                <p className="font-medium">{dependent.name}</p>
                <p className="text-xs text-slate-400">{RELATIONSHIPS[dependent.relationship] || dependent.relationship}</p>
              </div>
              <div className="flex gap-3 text-sm">
                <button type="button" onClick={() => openForm(dependent)} className="text-amber-300 hover:underline">
                  Editar
                </button>
                <button type="button" onClick={() => handleRemove(dependent)} className="text-red-300 hover:underline">
                  Remover
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
      {formOpen ? (
        form
      ) : (
        <button
          type="button"
          onClick={() => openForm()}
          className="rounded-lg border border-amber-500/60 px-4 py-2 text-sm font-semibold text-amber-300 hover:bg-amber-500/10"
        >
          Adicionar dependente
        </button>
      )}
    </div>
  )
}
