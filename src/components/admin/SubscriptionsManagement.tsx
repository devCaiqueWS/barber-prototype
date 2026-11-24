'use client'

import Link from 'next/link'
import { useEffect, useMemo, useRef, useState } from 'react'
import { useSession } from 'next-auth/react'
import { Button } from '@/components/ui/button'
import { formatDateBR } from '@/lib/date'

type BarberOption = {
  id: string
  name: string
}

type ClientOption = {
  clientId?: string | null
  clientCode?: number | null
  hasCpf?: boolean
  name: string
  email?: string | null
  whatsapp?: string | null
}

type SubscriptionItem = {
  id: string
  clientName: string
  clientEmail?: string | null
  clientWhatsapp?: string | null
  amount: number
  cycle: string
  status: string
  provider?: string
  lastPaymentAt?: string | null
  proposalUrl?: string | null
  createdAt: string
  barber?: { id: string; name: string } | null
  client?: { id: string; clientCode?: number | null } | null
}

type InterestItem = {
  id: string
  createdAt: string
  client: {
    id: string
    name: string | null
    email: string
    whatsapp: string | null
    phone: string | null
    clientCode: number
  }
}

const STATUS_LABELS: Record<string, string> = {
  pending: 'Aguardando 1º pagamento',
  active: 'Ativa',
  overdue: 'Em atraso',
  cancelled: 'Cancelada',
}

const CYCLE_LABELS: Record<string, string> = {
  MONTHLY: 'Mensal',
  QUARTERLY: 'Trimestral',
  SEMIANNUALLY: 'Semestral',
  YEARLY: 'Anual',
}

const formatClientCode = (code?: number | null) => (code ? `#${String(code).padStart(6, '0')}` : '')

const toWhatsappUrl = (whatsapp: string, message: string) => {
  const digits = whatsapp.replace(/\D/g, '')
  if (!digits) return ''
  const normalized = digits.startsWith('55') ? digits : `55${digits}`
  return `https://wa.me/${normalized}?text=${encodeURIComponent(message)}`
}

const buildSubscriptionProposalMessage = ({
  clientName,
  amountNumber,
  proposalUrl,
  termsUrl,
}: {
  clientName: string
  amountNumber: number
  proposalUrl?: string | null
  termsUrl: string
}) => {
  const valueText = amountNumber.toFixed(2).replace('.', ',')
  const paymentLinkText = proposalUrl ? `Link de pagamento: ${proposalUrl}` : ''

  return [
    `Ola ${clientName}, segue a proposta de assinatura mensal da Elemento Estudio e Barbearia.`,
    `Valor: R$ ${valueText}.`,
    paymentLinkText,
    '',
    'Termos e condicoes do Plano Mensal Basico:',
    '1. Uso pessoal: o plano e individual e intransferivel.',
    '2. Validade: 30 dias corridos a partir da confirmacao do pagamento.',
    '3. Renovacao: nao acumulativo; servicos nao usados nao passam para o mes seguinte; renovacao manual via PIX ou automatica no debito recorrente.',
    '4. Atendimento sem renovacao: plano vencido no dia do atendimento sera cobrado no valor avulso vigente.',
    '5. Agendamento obrigatorio: www.jmbarbearia.online, sujeito a disponibilidade de agenda.',
    '6. Alteracoes no plano: a Elemento Estudio e Barbearia pode atualizar precos, termos ou condicoes com 30 dias de antecedencia.',
    '',
    `Termos completos: ${termsUrl}`,
  ]
    .filter(Boolean)
    .join('\n')
}

export default function SubscriptionsManagement() {
  const { data: session } = useSession()
  const role = ((session?.user as { role?: string })?.role || '').toString().toUpperCase()
  const barberIdFromSession = (session?.user as { id?: string })?.id || ''

  const [barbers, setBarbers] = useState<BarberOption[]>([])
  const [selectedBarberId, setSelectedBarberId] = useState('')
  const [clients, setClients] = useState<ClientOption[]>([])
  const [selectedClientId, setSelectedClientId] = useState('')
  const [customClientName, setCustomClientName] = useState('')
  const [customClientWhatsapp, setCustomClientWhatsapp] = useState('')
  const [customClientEmail, setCustomClientEmail] = useState('')
  const [amount, setAmount] = useState('0')
  const [cycle, setCycle] = useState('MONTHLY')
  const [cpf, setCpf] = useState('')
  const [provider, setProvider] = useState<'asaas' | 'manual'>('asaas')
  const [updatingId, setUpdatingId] = useState('')
  const [subscriptions, setSubscriptions] = useState<SubscriptionItem[]>([])
  const [loading, setLoading] = useState(false)
  const [creating, setCreating] = useState(false)
  const [interests, setInterests] = useState<InterestItem[]>([])
  // Cliente da fila escolhido em "Criar assinatura": selecionado quando a lista de clientes carregar
  const [pendingClientId, setPendingClientId] = useState('')
  const formRef = useRef<HTMLDivElement>(null)

  const canChooseBarber = role === 'ADMIN'

  const selectedClient = useMemo(() => {
    if (selectedClientId === 'custom') {
      return {
        name: customClientName.trim(),
        whatsapp: customClientWhatsapp.trim(),
        email: customClientEmail.trim(),
      }
    }
    const found = clients.find((client, index) => `${index}` === selectedClientId)
    return found || null
  }, [clients, selectedClientId, customClientEmail, customClientName, customClientWhatsapp])

  const loadBarbers = async () => {
    try {
      const response = await fetch('/api/barbers')
      const data = await response.json()
      if (data.success) {
        setBarbers(data.barbers || [])
      }
    } catch (error) {
      console.error('Erro ao carregar barbeiros:', error)
    }
  }

  const loadClients = async (barberId: string) => {
    if (!barberId) {
      setClients([])
      return
    }
    try {
      const response = await fetch(`/api/admin/subscriptions/clients?barberId=${barberId}`)
      const data = await response.json()
      if (data.success) {
        setClients(data.clients || [])
      } else {
        setClients([])
      }
    } catch (error) {
      console.error('Erro ao carregar clientes:', error)
      setClients([])
    }
  }

  const loadSubscriptions = async (barberId?: string) => {
    try {
      setLoading(true)
      const params = new URLSearchParams()
      if (barberId) params.set('barberId', barberId)
      const response = await fetch(`/api/admin/subscriptions?${params.toString()}`)
      const data = await response.json()
      if (data.success) {
        setSubscriptions(data.subscriptions || [])
      } else {
        setSubscriptions([])
      }
    } catch (error) {
      console.error('Erro ao carregar assinaturas:', error)
      setSubscriptions([])
    } finally {
      setLoading(false)
    }
  }

  const loadInterests = async () => {
    try {
      const response = await fetch('/api/admin/subscription-interests', { cache: 'no-store' })
      const data = await response.json()
      setInterests(data.success ? data.interests || [] : [])
    } catch (error) {
      console.error('Erro ao carregar fila de interessados:', error)
    }
  }

  useEffect(() => {
    void loadInterests()
  }, [])

  // Seleciona no formulário o cliente vindo da fila assim que ele aparecer na lista
  useEffect(() => {
    if (!pendingClientId) return
    const index = clients.findIndex((client) => client.clientId === pendingClientId)
    if (index >= 0) {
      setSelectedClientId(`${index}`)
      setPendingClientId('')
      formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }
  }, [clients, pendingClientId])

  const handleStartFromQueue = (interest: InterestItem) => {
    if (!selectedBarberId) {
      if (canChooseBarber && barbers.length === 1) {
        setSelectedBarberId(barbers[0].id)
      } else {
        alert('Selecione o barbeiro no formulário antes de criar a assinatura.')
        formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
        return
      }
    }
    setPendingClientId(interest.client.id)
  }

  const handleDismissInterest = async (interest: InterestItem) => {
    if (!confirm(`Tirar ${interest.client.name || 'este cliente'} da fila de interessados?`)) return
    try {
      const response = await fetch(`/api/admin/subscription-interests/${interest.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'dismissed' }),
      })
      const data = await response.json()
      if (!response.ok) alert(data?.error || 'Erro ao atualizar a fila')
      await loadInterests()
    } catch (error) {
      console.error('Erro ao atualizar a fila:', error)
      alert('Erro ao atualizar a fila')
    }
  }

  useEffect(() => {
    if (canChooseBarber) {
      void loadBarbers()
    } else if (barberIdFromSession) {
      setSelectedBarberId(barberIdFromSession)
    }
  }, [canChooseBarber, barberIdFromSession])

  useEffect(() => {
    if (selectedBarberId) {
      void loadClients(selectedBarberId)
      void loadSubscriptions(selectedBarberId)
    } else if (canChooseBarber) {
      void loadSubscriptions()
    }
  }, [selectedBarberId, canChooseBarber])

  const handleCreate = async () => {
    if (!selectedBarberId) {
      alert('Selecione um barbeiro')
      return
    }
    if (!selectedClient || !selectedClient.name) {
      alert('Selecione um cliente')
      return
    }
    const amountNumber = Number(amount.replace(',', '.'))
    if (!Number.isFinite(amountNumber) || amountNumber <= 0) {
      alert('Informe um valor valido')
      return
    }
    if (!selectedClient.whatsapp || selectedClient.whatsapp.trim().length < 8) {
      alert('Cliente sem WhatsApp valido')
      return
    }
    const clientHasCpf = selectedClientId !== 'custom' && Boolean((selectedClient as ClientOption).hasCpf)
    const cpfDigits = cpf.replace(/\D/g, '')
    if (provider === 'asaas' && !clientHasCpf && cpfDigits.length !== 11 && cpfDigits.length !== 14) {
      alert('Informe o CPF do cliente (o Asaas exige para cobrar a assinatura)')
      return
    }

    try {
      setCreating(true)
      const response = await fetch('/api/admin/subscriptions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          barberId: selectedBarberId,
          clientId: selectedClientId !== 'custom' ? selectedClient?.clientId : null,
          clientName: selectedClient.name,
          clientEmail: selectedClient.email,
          clientWhatsapp: selectedClient.whatsapp,
          amount: amountNumber,
          cycle,
          cpf: cpfDigits || undefined,
          provider,
        }),
      })

      const data = await response.json()
      if (!response.ok) {
        alert(data?.error || 'Erro ao criar assinatura')
        return
      }

      const subscription: SubscriptionItem = data.subscription
      await loadSubscriptions(selectedBarberId)
      void loadInterests()
      setCpf('')

      // Assinatura manual já nasce ativa: não há proposta de pagamento para enviar
      if (provider === 'manual') {
        alert('Assinatura manual ativada.')
        return
      }

      const origin = typeof window !== 'undefined' ? window.location.origin : ''
      const termsUrl = origin
        ? `${origin}/assinaturas/termos-e-condicoes`
        : 'https://www.jmbarbearia.online/assinaturas/termos-e-condicoes'
      const message = buildSubscriptionProposalMessage({
        clientName: subscription.clientName,
        amountNumber,
        proposalUrl: subscription.proposalUrl,
        termsUrl,
      })
      const whatsappUrl = toWhatsappUrl(selectedClient.whatsapp || '', message)
      if (whatsappUrl) {
        window.open(whatsappUrl, '_blank')
      }
    } catch (error) {
      console.error('Erro ao criar assinatura:', error)
      alert('Erro ao criar assinatura')
    } finally {
      setCreating(false)
    }
  }

  const statusClass = (status: string) => {
    const normalized = status.toLowerCase()
    if (normalized === 'active') return 'bg-emerald-500/15 text-emerald-300 border-emerald-500/50'
    if (normalized === 'cancelled' || normalized === 'overdue') return 'bg-red-500/15 text-red-300 border-red-500/50'
    return 'bg-amber-500/15 text-amber-300 border-amber-500/50'
  }

  const handleSubscriptionAction = async (item: SubscriptionItem, action: 'activate' | 'cancel') => {
    const question =
      action === 'activate'
        ? `Ativar manualmente a assinatura de ${item.clientName}? Use quando o pagamento foi feito fora do Asaas.`
        : `Cancelar a assinatura de ${item.clientName}?${item.provider === 'asaas' ? ' A cobrança recorrente no Asaas também será cancelada.' : ''}`
    if (!confirm(question)) return

    try {
      setUpdatingId(item.id)
      const response = await fetch(`/api/admin/subscriptions/${item.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action }),
      })
      const data = await response.json()
      if (!response.ok) {
        alert(data?.error || 'Erro ao atualizar assinatura')
        return
      }
      await loadSubscriptions(selectedBarberId)
    } catch (error) {
      console.error('Erro ao atualizar assinatura:', error)
      alert('Erro ao atualizar assinatura')
    } finally {
      setUpdatingId('')
    }
  }

  return (
    <div className="space-y-6">
      {interests.length > 0 && (
        <div className="bg-slate-800 rounded-lg p-4 sm:p-6 border border-amber-500/40">
          <div className="mb-4">
            <h2 className="text-xl font-semibold text-white">Fila de interessados ({interests.length})</h2>
            <p className="text-sm text-slate-400">
              Clientes que clicaram em &quot;Quero assinar&quot; na Minha Conta, em ordem de chegada.
            </p>
          </div>
          <ol className="space-y-2">
            {interests.map((interest, index) => {
              const whatsapp = interest.client.whatsapp || interest.client.phone || ''
              const whatsappUrl = whatsapp
                ? toWhatsappUrl(whatsapp, `Olá ${interest.client.name || ''}! Vi que você quer conhecer a assinatura da Elemento.`)
                : ''
              return (
                <li
                  key={interest.id}
                  className="flex flex-col gap-3 rounded-md border border-slate-700 bg-slate-900 p-3 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="flex items-start gap-3">
                    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-amber-500/20 text-sm font-bold text-amber-300">
                      {index + 1}
                    </span>
                    <div>
                      <div className="font-semibold text-white">
                        {interest.client.name || interest.client.email}{' '}
                        <span className="text-xs font-normal text-slate-400">{formatClientCode(interest.client.clientCode)}</span>
                      </div>
                      <div className="text-xs text-slate-400">
                        {whatsappUrl ? (
                          <a href={whatsappUrl} target="_blank" rel="noopener noreferrer" className="text-emerald-300 hover:underline">
                            {whatsapp}
                          </a>
                        ) : (
                          'Sem WhatsApp'
                        )}
                        {' · '}desde {formatDateBR(new Date(interest.createdAt))}
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" onClick={() => handleStartFromQueue(interest)} className="flex-1 sm:flex-none">
                      Criar assinatura
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleDismissInterest(interest)}
                      className="flex-1 border-slate-600 text-slate-100 hover:bg-slate-700 sm:flex-none"
                    >
                      Descartar
                    </Button>
                  </div>
                </li>
              )
            })}
          </ol>
        </div>
      )}

      <div ref={formRef} className="bg-slate-800 rounded-lg p-4 sm:p-6 border border-slate-700">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
          <div>
            <h2 className="text-xl font-semibold text-white">Assinaturas</h2>
            <p className="text-sm text-slate-400">
              Escolha clientes atendidos e envie propostas de assinatura recorrente.
            </p>
          </div>
          <Button
            variant="outline"
            asChild
            className="w-full sm:w-auto border-slate-600 text-slate-100 hover:bg-slate-700"
          >
            <Link href="/assinaturas/termos-e-condicoes">Termos e condicoes</Link>
          </Button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {canChooseBarber && (
            <div>
              <label className="block text-xs text-slate-400 mb-1">Barbeiro</label>
              <select
                value={selectedBarberId}
                onChange={(e) => setSelectedBarberId(e.target.value)}
                className="w-full rounded-md border border-slate-700 bg-slate-900 px-3 py-2 text-white"
              >
                <option value="">Selecione</option>
                {barbers.map((barber) => (
                  <option key={barber.id} value={barber.id}>
                    {barber.name}
                  </option>
                ))}
              </select>
            </div>
          )}
          <div>
            <label className="block text-xs text-slate-400 mb-1">Cliente</label>
            <select
              value={selectedClientId}
              onChange={(e) => setSelectedClientId(e.target.value)}
              className="w-full rounded-md border border-slate-700 bg-slate-900 px-3 py-2 text-white"
            >
              <option value="">Selecione</option>
              {clients.map((client, index) => (
                <option key={`${client.clientId || client.email || index}`} value={`${index}`}>
                  {client.clientCode ? `${formatClientCode(client.clientCode)} · ` : ''}{client.name} {client.whatsapp ? `- ${client.whatsapp}` : ''}
                </option>
              ))}
              <option value="custom">Outro cliente</option>
            </select>
          </div>
          {selectedClientId === 'custom' && (
            <>
              <div>
                <label className="block text-xs text-slate-400 mb-1">Nome</label>
                <input
                  value={customClientName}
                  onChange={(e) => setCustomClientName(e.target.value)}
                  className="w-full rounded-md border border-slate-700 bg-slate-900 px-3 py-2 text-white"
                />
              </div>
              <div>
                <label className="block text-xs text-slate-400 mb-1">WhatsApp</label>
                <input
                  value={customClientWhatsapp}
                  onChange={(e) => setCustomClientWhatsapp(e.target.value)}
                  className="w-full rounded-md border border-slate-700 bg-slate-900 px-3 py-2 text-white"
                />
              </div>
              <div className="md:col-span-2">
                <label className="block text-xs text-slate-400 mb-1">Email (opcional)</label>
                <input
                  value={customClientEmail}
                  onChange={(e) => setCustomClientEmail(e.target.value)}
                  className="w-full rounded-md border border-slate-700 bg-slate-900 px-3 py-2 text-white"
                />
              </div>
            </>
          )}
          <div>
            <label className="block text-xs text-slate-400 mb-1">Valor mensal</label>
            <input
              type="number"
              min="1"
              step="0.01"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="w-full rounded-md border border-slate-700 bg-slate-900 px-3 py-2 text-white"
            />
          </div>
          <div>
            <label className="block text-xs text-slate-400 mb-1">Ciclo</label>
            <select
              value={cycle}
              onChange={(e) => setCycle(e.target.value)}
              className="w-full rounded-md border border-slate-700 bg-slate-900 px-3 py-2 text-white"
            >
              <option value="MONTHLY">Mensal</option>
              <option value="QUARTERLY">Trimestral</option>
              <option value="SEMIANNUALLY">Semestral</option>
              <option value="YEARLY">Anual</option>
            </select>
          </div>
          <div>
            <label className="block text-xs text-slate-400 mb-1">Cobrança</label>
            <select
              value={provider}
              onChange={(e) => setProvider(e.target.value === 'manual' ? 'manual' : 'asaas')}
              className="w-full rounded-md border border-slate-700 bg-slate-900 px-3 py-2 text-white"
            >
              <option value="asaas">Recorrente pelo Asaas (PIX/cartão/boleto)</option>
              <option value="manual">Manual (paga no balcão, já ativa)</option>
            </select>
          </div>
          {provider === 'asaas' && (
            <div>
              <label className="block text-xs text-slate-400 mb-1">
                CPF do cliente{' '}
                {selectedClientId !== 'custom' && (selectedClient as ClientOption | null)?.hasCpf
                  ? '(já cadastrado, opcional)'
                  : '(obrigatório no Asaas)'}
              </label>
              <input
                value={cpf}
                onChange={(e) => setCpf(e.target.value)}
                inputMode="numeric"
                placeholder="000.000.000-00"
                className="w-full rounded-md border border-slate-700 bg-slate-900 px-3 py-2 text-white"
              />
            </div>
          )}
        </div>
        <div className="mt-4 flex justify-stretch sm:justify-end">
          <Button onClick={handleCreate} disabled={creating} className="w-full sm:w-auto">
            {creating ? 'Criando...' : provider === 'manual' ? 'Ativar assinatura' : 'Enviar proposta'}
          </Button>
        </div>
      </div>

      <div className="bg-slate-900 rounded-lg p-4 sm:p-6 border border-slate-800">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
          <h3 className="text-lg font-semibold text-white">Assinaturas</h3>
          <Button variant="outline" onClick={() => loadSubscriptions(selectedBarberId)} className="w-full sm:w-auto">
            Atualizar
          </Button>
        </div>
        {loading ? (
          <p className="text-sm text-slate-400">Carregando...</p>
        ) : subscriptions.length === 0 ? (
          <p className="text-sm text-slate-400">Nenhuma assinatura encontrada.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-[720px] w-full text-sm">
              <thead>
                <tr className="text-left text-slate-400">
                  <th className="py-2 px-3 border-b border-slate-800">Cliente</th>
                  <th className="py-2 px-3 border-b border-slate-800">Barbeiro</th>
                  <th className="py-2 px-3 border-b border-slate-800">Valor</th>
                  <th className="py-2 px-3 border-b border-slate-800">Ciclo</th>
                  <th className="py-2 px-3 border-b border-slate-800">Status</th>
                  <th className="py-2 px-3 border-b border-slate-800">Último pagamento</th>
                  <th className="py-2 px-3 border-b border-slate-800">Ações</th>
                </tr>
              </thead>
              <tbody>
                {subscriptions.map((item) => (
                  <tr key={item.id} className="text-slate-200">
                    <td className="py-2 px-3 border-b border-slate-800">
                      <div className="font-medium">
                        {item.client?.clientCode ? `${formatClientCode(item.client.clientCode)} · ` : ''}
                        {item.clientName}
                      </div>
                      {!item.client && (
                        <div className="text-xs text-amber-400">Sem conta vinculada (vincula quando o cliente se cadastrar com o mesmo e-mail)</div>
                      )}
                      {item.clientWhatsapp && (
                        <div className="text-xs text-slate-400">{item.clientWhatsapp}</div>
                      )}
                    </td>
                    <td className="py-2 px-3 border-b border-slate-800">
                      {item.barber?.name || '-'}
                    </td>
                    <td className="py-2 px-3 border-b border-slate-800">
                      R$ {Number(item.amount).toFixed(2).replace('.', ',')}
                    </td>
                    <td className="py-2 px-3 border-b border-slate-800">
                      {CYCLE_LABELS[item.cycle] || item.cycle}
                      <div className="text-xs text-slate-500">{item.provider === 'manual' ? 'Manual' : 'Asaas'}</div>
                    </td>
                    <td className="py-2 px-3 border-b border-slate-800">
                      <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs ${statusClass(item.status)}`}>
                        {STATUS_LABELS[item.status] || item.status}
                      </span>
                    </td>
                    <td className="py-2 px-3 border-b border-slate-800">
                      {item.lastPaymentAt ? formatDateBR(item.lastPaymentAt) : '-'}
                      <div className="text-xs text-slate-500">Criada em {formatDateBR(item.createdAt)}</div>
                    </td>
                    <td className="py-2 px-3 border-b border-slate-800">
                      <div className="flex flex-wrap gap-2">
                        {item.status !== 'active' && item.status !== 'cancelled' && (
                          <button
                            type="button"
                            disabled={updatingId === item.id}
                            onClick={() => handleSubscriptionAction(item, 'activate')}
                            className="rounded-md border border-emerald-500/50 px-2 py-1 text-xs text-emerald-300 hover:bg-emerald-500/10 disabled:opacity-50"
                          >
                            Ativar
                          </button>
                        )}
                        {item.status !== 'cancelled' && (
                          <button
                            type="button"
                            disabled={updatingId === item.id}
                            onClick={() => handleSubscriptionAction(item, 'cancel')}
                            className="rounded-md border border-red-500/50 px-2 py-1 text-xs text-red-300 hover:bg-red-500/10 disabled:opacity-50"
                          >
                            Cancelar
                          </button>
                        )}
                        {item.proposalUrl && item.status === 'pending' && (
                          <a
                            href={item.proposalUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="rounded-md border border-slate-600 px-2 py-1 text-xs text-slate-200 hover:bg-slate-700"
                          >
                            Link de pagamento
                          </a>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
