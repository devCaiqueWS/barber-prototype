'use client'

import { useEffect, useState } from 'react'
import { useSession } from 'next-auth/react'
import { Button } from '@/components/ui/button'
import { Calendar as CalendarIcon, Sun, Sunset, Moon } from 'lucide-react'

type PeriodKey = 'morning' | 'afternoon' | 'evening'

const PERIODS: Record<PeriodKey, { label: string; start: number; end: number }> = {
  morning: { label: 'Manhã (08:00 - 12:00)', start: 8, end: 12 },
  afternoon: { label: 'Tarde (13:00 - 18:00)', start: 13, end: 18 },
  evening: { label: 'Noite (18:00 - 21:00)', start: 18, end: 21 },
}

interface AvailabilityResponse {
  success: boolean
  availability?: {
    isDayBlocked: boolean
    availableSlots: string[]
    blockedSlots: string[]
  } | null
}

interface SessionUserWithId {
  id?: string
}

export default function BarberCalendar() {
  const { data: session } = useSession()
  const barberId = (session?.user as SessionUserWithId | undefined)?.id

  const todayStr = new Date().toISOString().split('T')[0]
  const [selectedDate, setSelectedDate] = useState<string>(todayStr)
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [isDayBlocked, setIsDayBlocked] = useState(false)
  const [periods, setPeriods] = useState<Record<PeriodKey, boolean>>({
    morning: false,
    afternoon: false,
    evening: false,
  })
  const [statusMessage, setStatusMessage] = useState<string | null>(null)

  const generateSlotsForPeriod = (startHour: number, endHour: number): string[] => {
    const slots: string[] = []
    for (let h = startHour; h < endHour; h++) {
      slots.push(`${String(h).padStart(2, '0')}:00`)
      slots.push(`${String(h).padStart(2, '0')}:30`)
    }
    return slots
  }

  const getSelectedSlots = (): string[] => {
    const result = new Set<string>();
    (Object.keys(PERIODS) as PeriodKey[]).forEach((key: PeriodKey) => {
      if (!periods[key]) return
      const { start, end } = PERIODS[key]
      generateSlotsForPeriod(start, end).forEach((slot) => result.add(slot))
    })
    return Array.from(result).sort()
  }

  const loadAvailability = async (date: string) => {
    if (!barberId) return
    try {
      setLoading(true)
      setStatusMessage(null)

      const res = await fetch(
        `/api/barber/availability?barberId=${encodeURIComponent(barberId)}&date=${encodeURIComponent(
          date,
        )}`,
      )
      if (!res.ok) {
        console.error('Falha ao carregar disponibilidade do barbeiro')
        return
      }

      const data: AvailabilityResponse = await res.json()
      const avail = data.availability

      if (!avail) {
        setIsDayBlocked(false)
        setPeriods({ morning: false, afternoon: false, evening: false })
        return
      }

      setIsDayBlocked(avail.isDayBlocked)

      if (avail.isDayBlocked) {
        setPeriods({ morning: false, afternoon: false, evening: false })
        return
      }

      const set = new Set(avail.availableSlots || [])
      const newPeriods: Record<PeriodKey, boolean> = { morning: false, afternoon: false, evening: false }
      ;(Object.keys(PERIODS) as PeriodKey[]).forEach((key) => {
        const { start, end } = PERIODS[key]
        const periodSlots = generateSlotsForPeriod(start, end)
        newPeriods[key] = periodSlots.some((slot) => set.has(slot))
      })
      setPeriods(newPeriods)
    } catch (e) {
      console.error('Erro ao carregar disponibilidade do barbeiro:', e)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (barberId) {
      loadAvailability(selectedDate)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [barberId])

  const handleDateChange = (value: string) => {
    setSelectedDate(value)
    if (barberId) {
      loadAvailability(value)
    }
  }

  const handleSave = async () => {
    if (!barberId || !selectedDate) return

    try {
      setSaving(true)
      setStatusMessage(null)

      if (isDayBlocked || !Object.values(periods).some(Boolean)) {
        // Bloquear dia inteiro
        const res = await fetch('/api/barber/availability', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            barberId,
            date: selectedDate,
            isDayBlocked: true,
            availableSlots: [],
            blockedSlots: [],
          }),
        })
        if (!res.ok) throw new Error('Falha ao salvar disponibilidade')
        setStatusMessage('Dia marcado como sem atendimento.')
        setIsDayBlocked(true)
        setPeriods({ morning: false, afternoon: false, evening: false })
        return
      }

      const availableSlots = getSelectedSlots()

      const res = await fetch('/api/barber/availability', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          barberId,
          date: selectedDate,
          isDayBlocked: false,
          availableSlots,
          blockedSlots: [],
        }),
      })
      if (!res.ok) throw new Error('Falha ao salvar disponibilidade')
      setStatusMessage('Períodos de atendimento salvos com sucesso.')
    } catch (e) {
      console.error('Erro ao salvar disponibilidade do barbeiro:', e)
      setStatusMessage('Erro ao salvar. Tente novamente.')
    } finally {
      setSaving(false)
    }
  }

  if (!barberId) {
    return (
      <div className="bg-[#3D3D3D] rounded-lg p-6 border border-[#1F1F1F]">
        <p className="text-slate-200">
          Apenas barbeiros podem configurar o próprio calendário de atendimento.
        </p>
      </div>
    )
  }

  return (
    <div className="bg-[#3D3D3D] rounded-lg p-6 border border-[#1F1F1F] space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-semibold text-white flex items-center gap-2">
          <CalendarIcon className="h-6 w-6 text-amber-500" />
          Meu Calendário
        </h2>
        <span className="text-sm text-slate-300">
          Defina em quais dias e períodos você irá atender.
        </span>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        {/* Seleção de data */}
        <div className="space-y-3">
          <label className="block text-sm font-medium text-slate-200 mb-1">
            Data
          </label>
          <input
            type="date"
            value={selectedDate}
            min={todayStr}
            onChange={(e) => handleDateChange(e.target.value)}
            className="w-full px-3 py-2 bg-slate-800 border border-slate-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-amber-500"
          />
          <p className="text-xs text-slate-400">
            Escolha o dia para configurar se terá atendimento e em quais períodos.
          </p>
        </div>

        {/* Opções de dia inteiro */}
        <div className="space-y-3">
          <label className="block text-sm font-medium text-slate-200 mb-1">
            Opções do dia
          </label>
          <div className="flex flex-col gap-2">
            <label className="inline-flex items-center gap-2 text-slate-200">
              <input
                type="checkbox"
                checked={isDayBlocked || !Object.values(periods).some(Boolean)}
                onChange={(e) => {
                  const checked = e.target.checked
                  setIsDayBlocked(checked)
                  if (checked) {
                    setPeriods({ morning: false, afternoon: false, evening: false })
                  }
                }}
                className="h-4 w-4 rounded border-slate-600 bg-slate-800"
              />
              Não atender neste dia (bloquear dia inteiro)
            </label>
            <p className="text-xs text-slate-400">
              Se marcado, este dia ficará indisponível para novos agendamentos.
            </p>
          </div>
        </div>
      </div>

      {/* Seleção de períodos */}
      <div className="space-y-3">
        <label className="block text-sm font-medium text-slate-200 mb-2">
          Períodos de atendimento no dia
        </label>
        <div className="grid md:grid-cols-3 gap-3">
          {(Object.keys(PERIODS) as PeriodKey[]).map((key) => {
            const def = PERIODS[key]
            const icon =
              key === 'morning' ? (
                <Sun className="h-4 w-4" />
              ) : key === 'afternoon' ? (
                <Sunset className="h-4 w-4" />
              ) : (
                <Moon className="h-4 w-4" />
              )
            const enabled = periods[key]
            const disabled = isDayBlocked
            return (
              <button
                key={key}
                type="button"
                disabled={disabled}
                onClick={() =>
                  setPeriods((prev) => ({ ...prev, [key]: !prev[key] }))
                }
                className={`flex items-center gap-2 px-3 py-3 rounded-md border text-sm ${
                  enabled
                    ? 'bg-amber-600 border-amber-500 text-white'
                    : 'bg-slate-800 border-slate-600 text-slate-200'
                } ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer hover:border-amber-500'}`}
              >
                {icon}
                <span className="text-left">{def.label}</span>
              </button>
            )
          })}
        </div>
        <p className="text-xs text-slate-400">
          Se nenhum período estiver selecionado, o dia será considerado sem atendimento.
        </p>
      </div>

      <div className="flex items-center justify-between gap-3 pt-2">
        <div className="text-xs text-slate-400">
          {statusMessage && <span>{statusMessage}</span>}
          {loading && <span>Carregando disponibilidade do dia...</span>}
        </div>
        <Button
          onClick={handleSave}
          disabled={saving || loading}
          className="bg-amber-600 hover:bg-amber-700"
        >
          {saving ? 'Salvando...' : 'Salvar alterações'}
        </Button>
      </div>
    </div>
  )
}
