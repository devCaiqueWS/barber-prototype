'use client'

import { useEffect, useRef, useState, type ReactElement } from 'react'
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight } from 'lucide-react'
import { formatDateKey, parseDateOnly } from '@/lib/date'

type SimpleDatePickerProps = {
  value?: string
  min?: string
  onChange: (value: string) => void
  placeholder?: string
  className?: string
}

const parseDate = (value?: string | null): Date | null => parseDateOnly(value)

const formatDate = (date: Date) => formatDateKey(date)

const toDisplay = (date: Date) =>
  new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(date)

export function SimpleDatePicker({
  value,
  min,
  onChange,
  placeholder = 'AAAA-MM-DD',
  className = '',
}: SimpleDatePickerProps) {
  const today = formatDate(new Date())
  const minDate = min || today
  const selectedDate = parseDate(value)
  const [open, setOpen] = useState(false)
  const [monthCursor, setMonthCursor] = useState<Date>(() => selectedDate || parseDate(minDate) || new Date())
  const wrapperRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (selectedDate) {
      setMonthCursor(selectedDate)
    }
  }, [value]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const changeMonth = (delta: number) => {
    setMonthCursor((prev) => {
      const next = new Date(prev)
      next.setMonth(prev.getMonth() + delta)
      return next
    })
  }

  const daysInMonth = new Date(monthCursor.getFullYear(), monthCursor.getMonth() + 1, 0).getDate()
  const firstWeekday = new Date(monthCursor.getFullYear(), monthCursor.getMonth(), 1).getDay() // 0-6 (Sun-Sat)

  const isDisabled = (dateStr: string) => dateStr < minDate

  const handleSelect = (dateStr: string) => {
    if (isDisabled(dateStr)) return
    onChange(dateStr)
    setOpen(false)
  }

  const dayCells: ReactElement[] = []
  for (let i = 0; i < firstWeekday; i += 1) {
    dayCells.push(<div key={`empty-${i}`} />)
  }
  for (let day = 1; day <= daysInMonth; day += 1) {
    const date = new Date(monthCursor.getFullYear(), monthCursor.getMonth(), day)
    const dateStr = formatDate(date)
    const disabled = isDisabled(dateStr)
    const selected = selectedDate && formatDate(selectedDate) === dateStr
    dayCells.push(
      <button
        key={dateStr}
        type="button"
        onClick={() => handleSelect(dateStr)}
        disabled={disabled}
        className={`text-sm rounded-md py-1.5 transition-colors ${
          selected
            ? 'bg-amber-600 text-white'
            : 'text-slate-200 hover:bg-slate-700/80'
        } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
      >
        {day}
      </button>,
    )
  }

  return (
    <div className={`relative ${className}`} ref={wrapperRef}>
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        className="w-full flex items-center justify-between px-3 py-2 bg-slate-800 border border-slate-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-amber-500"
      >
        <span className="flex items-center gap-2">
          <CalendarIcon className="h-4 w-4 text-amber-500" />
          {selectedDate ? toDisplay(selectedDate) : <span className="text-slate-400">{placeholder}</span>}
        </span>
        <ChevronDownIcon open={open} />
      </button>

      {open && (
        <div className="absolute mt-2 w-full min-w-[260px] bg-slate-900 border border-slate-700 rounded-lg shadow-xl z-20 p-3">
          <div className="flex items-center justify-between mb-3">
            <button
              type="button"
              onClick={() => changeMonth(-1)}
              className="p-1 rounded-md hover:bg-slate-800 text-slate-200"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <div className="text-sm font-medium text-slate-100">
              {new Intl.DateTimeFormat('pt-BR', { month: 'long', year: 'numeric' }).format(monthCursor)}
            </div>
            <button
              type="button"
              onClick={() => changeMonth(1)}
              className="p-1 rounded-md hover:bg-slate-800 text-slate-200"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
          <div className="grid grid-cols-7 gap-1 text-[11px] text-center text-slate-400 mb-1">
            {['D', 'S', 'T', 'Q', 'Q', 'S', 'S'].map((d) => (
              <span key={d}>{d}</span>
            ))}
          </div>
          <div className="grid grid-cols-7 gap-1">{dayCells}</div>
        </div>
      )}
    </div>
  )
}

function ChevronDownIcon({ open }: { open: boolean }) {
  return (
    <svg
      className={`h-4 w-4 text-slate-400 transition-transform ${open ? 'rotate-180' : ''}`}
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
    </svg>
  )
}
