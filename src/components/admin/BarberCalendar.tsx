'use client'

import { useEffect, useState } from 'react'
import { useSession } from 'next-auth/react'
import { Button } from '@/components/ui/button'
import { Calendar as CalendarIcon, Clock } from 'lucide-react'
import { SimpleDatePicker } from '@/components/ui/simple-date-picker'

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

const SLOT_INTERVAL_MINUTES = 30
const MINUTES_PER_DAY = 24 * 60
const SLOTS_PER_DAY = MINUTES_PER_DAY / SLOT_INTERVAL_MINUTES
const MAX_SLOT_INDEX = SLOTS_PER_DAY - 1

const timeStringToIndex = (time: string): number => {
  const [hourStr, minuteStr] = time.split(':')
  const hour = Number.parseInt(hourStr, 10)
  const minute = Number.parseInt(minuteStr ?? '0', 10)

  if (Number.isNaN(hour) || Number.isNaN(minute)) {
    return 0
  }

  const totalMinutes = hour * 60 + minute
  const clampedMinutes = Math.min(
    Math.max(totalMinutes, 0),
    MINUTES_PER_DAY - SLOT_INTERVAL_MINUTES,
  )

  return Math.floor(clampedMinutes / SLOT_INTERVAL_MINUTES)
}

const indexToTimeString = (index: number): string => {
  const clampedIndex = Math.min(Math.max(index, 0), MAX_SLOT_INDEX)
  const totalMinutes = clampedIndex * SLOT_INTERVAL_MINUTES
  const hour = Math.floor(totalMinutes / 60)
  const minute = totalMinutes % 60
  return `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`
}

const generateSlotsFromIndexes = (startIndex: number, endIndex: number): string[] => {
  const start = Math.min(Math.max(startIndex, 0), MAX_SLOT_INDEX)
  const end = Math.min(Math.max(endIndex, start), MAX_SLOT_INDEX)
  const slots: string[] = []
  for (let idx = start; idx <= end; idx += 1) {
    slots.push(indexToTimeString(idx))
  }
  return slots
}

const DEFAULT_START_INDEX = timeStringToIndex('08:00')
const DEFAULT_END_INDEX = timeStringToIndex('18:00')

const getWeekdayLabel = (date: string): string => {
  if (!date) return ''
  const parsed = new Date(`${date}T00:00:00`)
  if (Number.isNaN(parsed.getTime())) return ''
  const formatter = new Intl.DateTimeFormat('pt-BR', { weekday: 'long' })
  const label = formatter.format(parsed)
  return label.charAt(0).toUpperCase() + label.slice(1)
}

export default function BarberCalendar() {
  const { data: session } = useSession()
  const barberId = (session?.user as SessionUserWithId | undefined)?.id

  const todayStr = new Date().toISOString().split('T')[0]
  const [selectedDate, setSelectedDate] = useState<string>(todayStr)
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [isDayBlocked, setIsDayBlocked] = useState(false)
  const [rangeStartIndex, setRangeStartIndex] = useState<number>(DEFAULT_START_INDEX)
  const [rangeEndIndex, setRangeEndIndex] = useState<number>(DEFAULT_END_INDEX)
  const [allSlots, setAllSlots] = useState<string[]>(() =>
    generateSlotsFromIndexes(DEFAULT_START_INDEX, DEFAULT_END_INDEX),
  )
  const [disabledSlots, setDisabledSlots] = useState<string[]>([])
  const [statusMessage, setStatusMessage] = useState<string | null>(null)

  const resetToDefaultRange = () => {
    const slots = generateSlotsFromIndexes(DEFAULT_START_INDEX, DEFAULT_END_INDEX)
    setRangeStartIndex(DEFAULT_START_INDEX)
    setRangeEndIndex(DEFAULT_END_INDEX)
    setAllSlots(slots)
    setDisabledSlots([])
  }

  const getAvailableSlotsFromState = (): string[] => {
    const disabledSet = new Set(disabledSlots)
    return allSlots.filter((slot) => !disabledSet.has(slot))
  }

  const handleRangeChange = (type: 'start' | 'end', value: number) => {
    if (isDayBlocked) return

    const clampedValue = Math.min(Math.max(value, 0), MAX_SLOT_INDEX)

    if (type === 'start') {
      const nextStart = Math.min(clampedValue, rangeEndIndex)
      const slots = generateSlotsFromIndexes(nextStart, rangeEndIndex)
      setRangeStartIndex(nextStart)
      setAllSlots(slots)
      setDisabledSlots((prev) => prev.filter((slot) => slots.includes(slot)))
    } else {
      const nextEnd = Math.max(clampedValue, rangeStartIndex)
      const slots = generateSlotsFromIndexes(rangeStartIndex, nextEnd)
      setRangeEndIndex(nextEnd)
      setAllSlots(slots)
      setDisabledSlots((prev) => prev.filter((slot) => slots.includes(slot)))
    }
  }

  const toggleSlot = (slot: string) => {
    if (isDayBlocked) return

    setDisabledSlots((prev) =>
      prev.includes(slot) ? prev.filter((s) => s !== slot) : [...prev, slot],
    )
  }

  const loadAvailability = async (date: string) => {
    if (!barberId) return
    try {
      setLoading(true)
      setStatusMessage(null)

      const res = await fetch(
        `/api/barber/availability?barberId=${encodeURIComponent(
          barberId,
        )}&date=${encodeURIComponent(date)}`,
      )
      if (!res.ok) {
        console.error('Falha ao carregar disponibilidade do barbeiro')
        return
      }

      const data: AvailabilityResponse = await res.json()
      const avail = data.availability

      if (
        !avail ||
        (!avail.isDayBlocked &&
          (!avail.availableSlots || avail.availableSlots.length === 0))
      ) {
        setIsDayBlocked(false)
        resetToDefaultRange()
        return
      }

      setIsDayBlocked(avail.isDayBlocked)

      if (avail.isDayBlocked) {
        resetToDefaultRange()
        return
      }

      const available = Array.from(new Set(avail.availableSlots || [])).sort()
      if (available.length === 0) {
        resetToDefaultRange()
        return
      }

      const first = available[0]
      const last = available[available.length - 1]
      const startIndex = timeStringToIndex(first)
      const endIndex = timeStringToIndex(last)
      const slots = generateSlotsFromIndexes(startIndex, endIndex)
      const availableSet = new Set(available)

      setRangeStartIndex(startIndex)
      setRangeEndIndex(endIndex)
      setAllSlots(slots)
      setDisabledSlots(slots.filter((slot) => !availableSet.has(slot)))
    } catch (e) {
      console.error('Erro ao carregar disponibilidade do barbeiro:', e)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (barberId) {
      void loadAvailability(selectedDate)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [barberId])

  const normalizeDateNotPast = (value: string): string => {
    if (!value || value.length !== 10) return value
    return value < todayStr ? todayStr : value
  }

  const handleSave = async () => {
    if (!barberId || !selectedDate) return

    try {
      setSaving(true)
      setStatusMessage(null)

      const currentAvailable = getAvailableSlotsFromState()

      if (isDayBlocked || currentAvailable.length === 0) {
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
        setDisabledSlots(allSlots)
        return
      }

      const res = await fetch('/api/barber/availability', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          barberId,
          date: selectedDate,
          isDayBlocked: false,
          availableSlots: currentAvailable,
          blockedSlots: [],
        }),
      })
      if (!res.ok) throw new Error('Falha ao salvar disponibilidade')
      setStatusMessage('Horários de atendimento salvos com sucesso.')
    } catch (e) {
      console.error('Erro ao salvar disponibilidade do barbeiro:', e)
      setStatusMessage('Erro ao salvar. Tente novamente.')
    } finally {
      setSaving(false)
    }
  }

  const availableSlots = getAvailableSlotsFromState()

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
    <div className="bg-[#3D3D3D] rounded-xl p-6 border border-[#1F1F1F] space-y-6 shadow-lg shadow-black/40">
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-1">
          <h2 className="text-2xl font-semibold text-white flex items-center gap-2">
            <CalendarIcon className="h-7 w-7 text-amber-500" />
            Meu Calendário
          </h2>
          <p className="text-sm text-slate-300 max-w-xl">
            Ajuste de forma rápida quais horários estarão liberados para novos agendamentos em
            cada dia.
          </p>
        </div>
        <div className="flex flex-col items-end gap-2">
          <span
            className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-medium border ${
              isDayBlocked || availableSlots.length === 0
                ? 'bg-red-500/10 border-red-500/60 text-red-300'
                : 'bg-emerald-500/10 border-emerald-500/60 text-emerald-300'
            }`}
          >
            <Clock className="h-3 w-3 mr-1" />
            {isDayBlocked || availableSlots.length === 0
              ? 'Dia sem atendimento'
              : `${availableSlots.length} horário(s) disponíveis`}
          </span>
          <span className="text-[11px] uppercase tracking-wide text-slate-400">
            Configuração diária
          </span>
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        {/* Seleção de data */}
        <div className="space-y-3 bg-slate-900/40 border border-slate-700/70 rounded-lg p-4">
          <div className="flex items-center justify-between gap-2">
            <label className="block text-sm font-medium text-slate-200">
              Dia de atendimento
            </label>
            <span className="text-[11px] px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 border border-slate-700">
              {getWeekdayLabel(selectedDate) || 'Selecione uma data'}
            </span>
          </div>
          <SimpleDatePicker
            value={selectedDate}
            min={todayStr}
            onChange={(value) => {
              const normalized = normalizeDateNotPast(value)
              setSelectedDate(normalized)
              if (normalized && barberId) {
                void loadAvailability(normalized)
              }
            }}
          />
          <p className="text-xs text-slate-400">
            Escolha o dia que você deseja configurar. Cada dia pode ter um padrão diferente.
          </p>
        </div>

        {/* Opções de dia inteiro */}
        <div className="space-y-3 bg-slate-900/40 border border-slate-700/70 rounded-lg p-4">
          <label className="block text-sm font-medium text-slate-200">
            Status do dia
          </label>
          <div className="flex flex-col gap-2">
            <label className="inline-flex items-center gap-3 text-slate-200">
              <input
                type="checkbox"
                checked={isDayBlocked || availableSlots.length === 0}
                onChange={(e) => {
                  const checked = e.target.checked
                  setIsDayBlocked(checked)
                  if (checked) {
                    setDisabledSlots(allSlots)
                  } else {
                    setDisabledSlots([])
                  }
                }}
                className="h-4 w-4 rounded border-slate-600 bg-slate-800"
              />
              <span className="text-sm">Não atender neste dia (bloquear dia inteiro)</span>
            </label>
            <p className="text-xs text-slate-400">
              Use esta opção em folgas, feriados ou quando não houver nenhum horário disponível.
            </p>
          </div>
        </div>
      </div>

      {/* Slider de período de atendimento */}
      <div className="space-y-4 bg-slate-900/40 border border-slate-700/70 rounded-lg p-4">
        <div className="flex items-center justify-between mb-1">
          <label className="block text-sm font-medium text-slate-200">
            Período de atendimento no dia
          </label>
          <span className="text-[11px] text-slate-400">
            Intervalo principal de trabalho
          </span>
        </div>
        <div
          className={`space-y-3 ${
            isDayBlocked ? 'opacity-50 pointer-events-none' : ''
          }`}
        >
          <div className="flex items-center justify-between text-xs text-slate-300">
            <span>
              Início:{' '}
              <span className="font-semibold text-amber-400">
                {indexToTimeString(rangeStartIndex)}
              </span>
            </span>
            <span>
              Fim:{' '}
              <span className="font-semibold text-amber-400">
                {indexToTimeString(rangeEndIndex)}
              </span>
            </span>
          </div>
          <div className="space-y-2">
            <input
              type="range"
              min={0}
              max={MAX_SLOT_INDEX}
              step={1}
              value={rangeStartIndex}
              onChange={(e) => handleRangeChange('start', Number(e.target.value))}
              className="w-full cursor-pointer accent-amber-500"
            />
            <input
              type="range"
              min={0}
              max={MAX_SLOT_INDEX}
              step={1}
              value={rangeEndIndex}
              onChange={(e) => handleRangeChange('end', Number(e.target.value))}
              className="w-full cursor-pointer accent-amber-500"
            />
            <div className="flex justify-between text-[10px] text-slate-500">
              <span>00:00</span>
              <span>06:00</span>
              <span>12:00</span>
              <span>18:00</span>
              <span>23:30</span>
            </div>
          </div>
          <p className="text-xs text-slate-400">
            Ajuste o intervalo principal. Os horários abaixo são gerados de 30 em 30 minutos.
          </p>
        </div>
      </div>

      {/* Lista de horários do período */}
      <div className="space-y-3 bg-slate-900/40 border border-slate-700/70 rounded-lg p-4">
        <label className="block text-sm font-medium text-slate-200">
          Horários deste dia
        </label>
        <div
          className={`flex flex-wrap gap-2 max-h-60 overflow-y-auto pr-1 ${
            isDayBlocked ? 'opacity-50 pointer-events-none' : ''
          }`}
        >
          {allSlots.length === 0 && (
            <p className="text-xs text-slate-400">
              Ajuste o período acima para gerar horários.
            </p>
          )}
          {allSlots.map((slot) => {
            const selected = !disabledSlots.includes(slot)
            return (
              <button
                key={slot}
                type="button"
                onClick={() => toggleSlot(slot)}
                className={`px-3 py-1 rounded-md text-xs font-medium border transition-colors ${
                  selected
                    ? 'bg-amber-600 border-amber-500 text-white'
                    : 'bg-slate-800 border-slate-600 text-slate-200 hover:border-slate-400'
                }`}
              >
                {slot}
              </button>
            )
          })}
        </div>
        <p className="text-xs text-slate-400">
          Clique para desmarcar horários em que você não atende.
        </p>
        <p className="text-xs text-slate-400">
          {availableSlots.length > 0
            ? `${availableSlots.length} horário(s) disponíveis neste dia.`
            : 'Nenhum horário disponível neste dia.'}
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
