'use client'

import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'
import { useSession } from 'next-auth/react'
import { Button } from '@/components/ui/button'
import { formatDateBR } from '@/lib/date'

type BarberOption = {
  id: string
  name: string
}

type ClientOption = {
  clientId?: string | null
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
  proposalUrl?: string | null
  createdAt: string
  barber?: { id: string; name: string } | null
}

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
  const [subscriptions, setSubscriptions] = useState<SubscriptionItem[]>([])
  const [loading, setLoading] = useState(false)
  const [creating, setCreating] = useState(false)

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
        }),
      })

      const data = await response.json()
      if (!response.ok) {
        alert(data?.error || 'Erro ao criar assinatura')
        return
      }

      const subscription: SubscriptionItem = data.subscription
      await loadSubscriptions(selectedBarberId)

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
    if (normalized === 'cancelled') return 'bg-red-500/15 text-red-300 border-red-500/50'
    return 'bg-amber-500/15 text-amber-300 border-amber-500/50'
  }

  return (
    <div className="space-y-6">
      <div className="bg-slate-800 rounded-lg p-4 sm:p-6 border border-slate-700">
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
                  {client.name} {client.whatsapp ? `- ${client.whatsapp}` : ''}
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
              <option value="SEMIANNUAL">Semestral</option>
              <option value="YEARLY">Anual</option>
            </select>
          </div>
        </div>
        <div className="mt-4 flex justify-stretch sm:justify-end">
          <Button onClick={handleCreate} disabled={creating} className="w-full sm:w-auto">
            {creating ? 'Criando...' : 'Enviar proposta'}
          </Button>
        </div>
      </div>

      <div className="bg-slate-900 rounded-lg p-4 sm:p-6 border border-slate-800">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
          <h3 className="text-lg font-semibold text-white">Assinaturas ativas e pendentes</h3>
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
                  <th className="py-2 px-3 border-b border-slate-800">Criado em</th>
                </tr>
              </thead>
              <tbody>
                {subscriptions.map((item) => (
                  <tr key={item.id} className="text-slate-200">
                    <td className="py-2 px-3 border-b border-slate-800">
                      <div className="font-medium">{item.clientName}</div>
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
                      {item.cycle}
                    </td>
                    <td className="py-2 px-3 border-b border-slate-800">
                      <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs ${statusClass(item.status)}`}>
                        {item.status}
                      </span>
                    </td>
                    <td className="py-2 px-3 border-b border-slate-800">
                      {formatDateBR(item.createdAt)}
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
