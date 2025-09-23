'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { Settings, ChevronLeft, Save, Clock, DollarSign, MapPin, Phone, Mail, Users, Key, Database, Palette } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface SystemSettings {
  business: {
    name: string
    description: string
    address: string
    phone: string
    email: string
    workingHours: {
      monday: { start: string; end: string; enabled: boolean }
      tuesday: { start: string; end: string; enabled: boolean }
      wednesday: { start: string; end: string; enabled: boolean }
      thursday: { start: string; end: string; enabled: boolean }
      friday: { start: string; end: string; enabled: boolean }
      saturday: { start: string; end: string; enabled: boolean }
      sunday: { start: string; end: string; enabled: boolean }
    }
  }
  appointments: {
    slotDuration: number
    advanceBookingDays: number
    cancellationPolicy: string
    confirmationRequired: boolean
    autoConfirmPayment: boolean
  }
  payments: {
    acceptCash: boolean
    acceptPix: boolean
    acceptCredit: boolean
    acceptDebit: boolean
    pixKey: string
  }
  notifications: {
    emailEnabled: boolean
    smsEnabled: boolean
    whatsappEnabled: boolean
    reminderHours: number
  }
  security: {
    passwordMinLength: number
    requireTwoFactor: boolean
    sessionTimeout: number
  }
}

export default function AdminSettings() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [settings, setSettings] = useState<SystemSettings | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [activeTab, setActiveTab] = useState('business')

  const weekDays = [
    { id: 'monday', label: 'Segunda-feira' },
    { id: 'tuesday', label: 'Terça-feira' },
    { id: 'wednesday', label: 'Quarta-feira' },
    { id: 'thursday', label: 'Quinta-feira' },
    { id: 'friday', label: 'Sexta-feira' },
    { id: 'saturday', label: 'Sábado' },
    { id: 'sunday', label: 'Domingo' }
  ]

  const tabs = [
    { id: 'business', label: 'Negócio', icon: MapPin },
    { id: 'appointments', label: 'Agendamentos', icon: Clock },
    { id: 'payments', label: 'Pagamentos', icon: DollarSign },
    { id: 'notifications', label: 'Notificações', icon: Mail },
    { id: 'security', label: 'Segurança', icon: Key }
  ]

  useEffect(() => {
    if (status === 'loading') return

    if (!session?.user) {
      router.push('/login')
      return
    }

    const userRole = (session.user as any).role
    if (userRole !== 'admin') {
      router.push('/')
      return
    }

    fetchSettings()
  }, [session, status])

  const fetchSettings = async () => {
    try {
      const response = await fetch('/api/admin/settings')
      if (response.ok) {
        const data = await response.json()
        setSettings(data.settings)
      } else {
        // If no settings exist, create default ones
        const defaultSettings: SystemSettings = {
          business: {
            name: 'BarberPro',
            description: 'Barbearia profissional',
            address: '',
            phone: '',
            email: '',
            workingHours: {
              monday: { start: '09:00', end: '18:00', enabled: true },
              tuesday: { start: '09:00', end: '18:00', enabled: true },
              wednesday: { start: '09:00', end: '18:00', enabled: true },
              thursday: { start: '09:00', end: '18:00', enabled: true },
              friday: { start: '09:00', end: '18:00', enabled: true },
              saturday: { start: '09:00', end: '16:00', enabled: true },
              sunday: { start: '10:00', end: '14:00', enabled: false }
            }
          },
          appointments: {
            slotDuration: 30,
            advanceBookingDays: 30,
            cancellationPolicy: 'Cancelamentos devem ser feitos com pelo menos 2 horas de antecedência.',
            confirmationRequired: true,
            autoConfirmPayment: false
          },
          payments: {
            acceptCash: true,
            acceptPix: true,
            acceptCredit: true,
            acceptDebit: true,
            pixKey: ''
          },
          notifications: {
            emailEnabled: false,
            smsEnabled: false,
            whatsappEnabled: true,
            reminderHours: 24
          },
          security: {
            passwordMinLength: 8,
            requireTwoFactor: false,
            sessionTimeout: 480
          }
        }
        setSettings(defaultSettings)
      }
    } catch (error) {
      console.error('Erro ao carregar configurações:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async () => {
    if (!settings) return

    setSaving(true)
    try {
      const response = await fetch('/api/admin/settings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(settings),
      })

      if (response.ok) {
        alert('Configurações salvas com sucesso!')
      } else {
        alert('Erro ao salvar configurações')
      }
    } catch (error) {
      console.error('Erro ao salvar configurações:', error)
      alert('Erro ao salvar configurações')
    } finally {
      setSaving(false)
    }
  }

  const updateSettings = (path: string[], value: any) => {
    if (!settings) return

    setSettings(prev => {
      const newSettings = { ...prev }
      let current: any = newSettings
      
      for (let i = 0; i < path.length - 1; i++) {
        current = current[path[i]]
      }
      
      current[path[path.length - 1]] = value
      return newSettings as SystemSettings
    })
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="text-white">Carregando configurações...</div>
      </div>
    )
  }

  if (!settings) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="text-white">Erro ao carregar configurações</div>
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
            <h1 className="text-3xl font-bold text-white">Configurações</h1>
          </div>
          <Button 
            onClick={handleSave}
            disabled={saving}
            className="bg-amber-600 hover:bg-amber-700"
          >
            <Save className="h-4 w-4 mr-2" />
            {saving ? 'Salvando...' : 'Salvar Alterações'}
          </Button>
        </div>

        <div className="grid lg:grid-cols-4 gap-8">
          {/* Sidebar */}
          <div className="lg:col-span-1">
            <div className="bg-slate-800 rounded-lg border border-slate-700 p-4">
              <nav className="space-y-2">
                {tabs.map(tab => {
                  const Icon = tab.icon
                  return (
                    <button
                      key={tab.id}
                      onClick={() => setActiveTab(tab.id)}
                      className={`w-full flex items-center space-x-3 px-3 py-2 rounded-md text-left transition-colors ${
                        activeTab === tab.id
                          ? 'bg-amber-600 text-white'
                          : 'text-slate-300 hover:bg-slate-700'
                      }`}
                    >
                      <Icon className="h-4 w-4" />
                      <span>{tab.label}</span>
                    </button>
                  )
                })}
              </nav>
            </div>
          </div>

          {/* Content */}
          <div className="lg:col-span-3">
            <div className="bg-slate-800 rounded-lg border border-slate-700 p-6">
              {/* Business Settings */}
              {activeTab === 'business' && (
                <div className="space-y-6">
                  <h2 className="text-xl font-semibold text-white">Informações do Negócio</h2>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-300 mb-2">Nome da Barbearia</label>
                      <input
                        type="text"
                        value={settings.business.name}
                        onChange={(e) => updateSettings(['business', 'name'], e.target.value)}
                        className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-slate-300 mb-2">Email</label>
                      <input
                        type="email"
                        value={settings.business.email}
                        onChange={(e) => updateSettings(['business', 'email'], e.target.value)}
                        className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">Descrição</label>
                    <textarea
                      value={settings.business.description}
                      onChange={(e) => updateSettings(['business', 'description'], e.target.value)}
                      rows={3}
                      className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-300 mb-2">Telefone</label>
                      <input
                        type="tel"
                        value={settings.business.phone}
                        onChange={(e) => updateSettings(['business', 'phone'], e.target.value)}
                        className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-slate-300 mb-2">Endereço</label>
                      <input
                        type="text"
                        value={settings.business.address}
                        onChange={(e) => updateSettings(['business', 'address'], e.target.value)}
                        className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                      />
                    </div>
                  </div>

                  <div>
                    <h3 className="text-lg font-medium text-white mb-4">Horários de Funcionamento</h3>
                    <div className="space-y-3">
                      {weekDays.map(day => (
                        <div key={day.id} className="flex items-center space-x-4">
                          <div className="w-24">
                            <input
                              type="checkbox"
                              id={`${day.id}-enabled`}
                              checked={settings.business.workingHours[day.id as keyof typeof settings.business.workingHours].enabled}
                              onChange={(e) => updateSettings(['business', 'workingHours', day.id, 'enabled'], e.target.checked)}
                              className="w-4 h-4 text-amber-600 bg-slate-700 border-slate-600 rounded focus:ring-amber-500"
                            />
                            <label htmlFor={`${day.id}-enabled`} className="ml-2 text-sm text-slate-300">
                              {day.label}
                            </label>
                          </div>
                          {settings.business.workingHours[day.id as keyof typeof settings.business.workingHours].enabled && (
                            <div className="flex items-center space-x-2">
                              <input
                                type="time"
                                value={settings.business.workingHours[day.id as keyof typeof settings.business.workingHours].start}
                                onChange={(e) => updateSettings(['business', 'workingHours', day.id, 'start'], e.target.value)}
                                className="px-3 py-1 bg-slate-700 border border-slate-600 rounded-md text-white text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
                              />
                              <span className="text-slate-400">até</span>
                              <input
                                type="time"
                                value={settings.business.workingHours[day.id as keyof typeof settings.business.workingHours].end}
                                onChange={(e) => updateSettings(['business', 'workingHours', day.id, 'end'], e.target.value)}
                                className="px-3 py-1 bg-slate-700 border border-slate-600 rounded-md text-white text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
                              />
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* Appointments Settings */}
              {activeTab === 'appointments' && (
                <div className="space-y-6">
                  <h2 className="text-xl font-semibold text-white">Configurações de Agendamento</h2>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-300 mb-2">Duração do Slot (minutos)</label>
                      <select
                        value={settings.appointments.slotDuration}
                        onChange={(e) => updateSettings(['appointments', 'slotDuration'], parseInt(e.target.value))}
                        className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                      >
                        <option value={15}>15 minutos</option>
                        <option value={30}>30 minutos</option>
                        <option value={60}>60 minutos</option>
                      </select>
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-slate-300 mb-2">Agendamento Antecipado (dias)</label>
                      <input
                        type="number"
                        min="1"
                        max="90"
                        value={settings.appointments.advanceBookingDays}
                        onChange={(e) => updateSettings(['appointments', 'advanceBookingDays'], parseInt(e.target.value))}
                        className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">Política de Cancelamento</label>
                    <textarea
                      value={settings.appointments.cancellationPolicy}
                      onChange={(e) => updateSettings(['appointments', 'cancellationPolicy'], e.target.value)}
                      rows={3}
                      className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                    />
                  </div>

                  <div className="space-y-3">
                    <div className="flex items-center">
                      <input
                        type="checkbox"
                        id="confirmationRequired"
                        checked={settings.appointments.confirmationRequired}
                        onChange={(e) => updateSettings(['appointments', 'confirmationRequired'], e.target.checked)}
                        className="w-4 h-4 text-amber-600 bg-slate-700 border-slate-600 rounded focus:ring-amber-500"
                      />
                      <label htmlFor="confirmationRequired" className="ml-2 text-sm text-slate-300">
                        Exigir confirmação de agendamentos
                      </label>
                    </div>
                    
                    <div className="flex items-center">
                      <input
                        type="checkbox"
                        id="autoConfirmPayment"
                        checked={settings.appointments.autoConfirmPayment}
                        onChange={(e) => updateSettings(['appointments', 'autoConfirmPayment'], e.target.checked)}
                        className="w-4 h-4 text-amber-600 bg-slate-700 border-slate-600 rounded focus:ring-amber-500"
                      />
                      <label htmlFor="autoConfirmPayment" className="ml-2 text-sm text-slate-300">
                        Confirmar automaticamente com pagamento online
                      </label>
                    </div>
                  </div>
                </div>
              )}

              {/* Payments Settings */}
              {activeTab === 'payments' && (
                <div className="space-y-6">
                  <h2 className="text-xl font-semibold text-white">Métodos de Pagamento</h2>
                  
                  <div className="space-y-3">
                    <div className="flex items-center">
                      <input
                        type="checkbox"
                        id="acceptCash"
                        checked={settings.payments.acceptCash}
                        onChange={(e) => updateSettings(['payments', 'acceptCash'], e.target.checked)}
                        className="w-4 h-4 text-amber-600 bg-slate-700 border-slate-600 rounded focus:ring-amber-500"
                      />
                      <label htmlFor="acceptCash" className="ml-2 text-sm text-slate-300">
                        Aceitar Dinheiro
                      </label>
                    </div>
                    
                    <div className="flex items-center">
                      <input
                        type="checkbox"
                        id="acceptPix"
                        checked={settings.payments.acceptPix}
                        onChange={(e) => updateSettings(['payments', 'acceptPix'], e.target.checked)}
                        className="w-4 h-4 text-amber-600 bg-slate-700 border-slate-600 rounded focus:ring-amber-500"
                      />
                      <label htmlFor="acceptPix" className="ml-2 text-sm text-slate-300">
                        Aceitar PIX
                      </label>
                    </div>
                    
                    <div className="flex items-center">
                      <input
                        type="checkbox"
                        id="acceptCredit"
                        checked={settings.payments.acceptCredit}
                        onChange={(e) => updateSettings(['payments', 'acceptCredit'], e.target.checked)}
                        className="w-4 h-4 text-amber-600 bg-slate-700 border-slate-600 rounded focus:ring-amber-500"
                      />
                      <label htmlFor="acceptCredit" className="ml-2 text-sm text-slate-300">
                        Aceitar Cartão de Crédito
                      </label>
                    </div>
                    
                    <div className="flex items-center">
                      <input
                        type="checkbox"
                        id="acceptDebit"
                        checked={settings.payments.acceptDebit}
                        onChange={(e) => updateSettings(['payments', 'acceptDebit'], e.target.checked)}
                        className="w-4 h-4 text-amber-600 bg-slate-700 border-slate-600 rounded focus:ring-amber-500"
                      />
                      <label htmlFor="acceptDebit" className="ml-2 text-sm text-slate-300">
                        Aceitar Cartão de Débito
                      </label>
                    </div>
                  </div>

                  {settings.payments.acceptPix && (
                    <div>
                      <label className="block text-sm font-medium text-slate-300 mb-2">Chave PIX</label>
                      <input
                        type="text"
                        value={settings.payments.pixKey}
                        onChange={(e) => updateSettings(['payments', 'pixKey'], e.target.value)}
                        placeholder="Ex: seu@email.com, CPF, telefone..."
                        className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                      />
                    </div>
                  )}
                </div>
              )}

              {/* Notifications Settings */}
              {activeTab === 'notifications' && (
                <div className="space-y-6">
                  <h2 className="text-xl font-semibold text-white">Notificações</h2>
                  
                  <div className="space-y-3">
                    <div className="flex items-center">
                      <input
                        type="checkbox"
                        id="emailEnabled"
                        checked={settings.notifications.emailEnabled}
                        onChange={(e) => updateSettings(['notifications', 'emailEnabled'], e.target.checked)}
                        className="w-4 h-4 text-amber-600 bg-slate-700 border-slate-600 rounded focus:ring-amber-500"
                      />
                      <label htmlFor="emailEnabled" className="ml-2 text-sm text-slate-300">
                        Habilitar notificações por email
                      </label>
                    </div>
                    
                    <div className="flex items-center">
                      <input
                        type="checkbox"
                        id="smsEnabled"
                        checked={settings.notifications.smsEnabled}
                        onChange={(e) => updateSettings(['notifications', 'smsEnabled'], e.target.checked)}
                        className="w-4 h-4 text-amber-600 bg-slate-700 border-slate-600 rounded focus:ring-amber-500"
                      />
                      <label htmlFor="smsEnabled" className="ml-2 text-sm text-slate-300">
                        Habilitar notificações por SMS
                      </label>
                    </div>
                    
                    <div className="flex items-center">
                      <input
                        type="checkbox"
                        id="whatsappEnabled"
                        checked={settings.notifications.whatsappEnabled}
                        onChange={(e) => updateSettings(['notifications', 'whatsappEnabled'], e.target.checked)}
                        className="w-4 h-4 text-amber-600 bg-slate-700 border-slate-600 rounded focus:ring-amber-500"
                      />
                      <label htmlFor="whatsappEnabled" className="ml-2 text-sm text-slate-300">
                        Habilitar notificações por WhatsApp
                      </label>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">Lembrete antecipado (horas)</label>
                    <select
                      value={settings.notifications.reminderHours}
                      onChange={(e) => updateSettings(['notifications', 'reminderHours'], parseInt(e.target.value))}
                      className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                    >
                      <option value={1}>1 hora antes</option>
                      <option value={2}>2 horas antes</option>
                      <option value={4}>4 horas antes</option>
                      <option value={24}>24 horas antes</option>
                      <option value={48}>48 horas antes</option>
                    </select>
                  </div>
                </div>
              )}

              {/* Security Settings */}
              {activeTab === 'security' && (
                <div className="space-y-6">
                  <h2 className="text-xl font-semibold text-white">Segurança</h2>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-300 mb-2">Tamanho mínimo da senha</label>
                      <input
                        type="number"
                        min="6"
                        max="20"
                        value={settings.security.passwordMinLength}
                        onChange={(e) => updateSettings(['security', 'passwordMinLength'], parseInt(e.target.value))}
                        className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-slate-300 mb-2">Timeout da sessão (minutos)</label>
                      <select
                        value={settings.security.sessionTimeout}
                        onChange={(e) => updateSettings(['security', 'sessionTimeout'], parseInt(e.target.value))}
                        className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                      >
                        <option value={60}>1 hora</option>
                        <option value={240}>4 horas</option>
                        <option value={480}>8 horas</option>
                        <option value={1440}>24 horas</option>
                      </select>
                    </div>
                  </div>

                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      id="requireTwoFactor"
                      checked={settings.security.requireTwoFactor}
                      onChange={(e) => updateSettings(['security', 'requireTwoFactor'], e.target.checked)}
                      className="w-4 h-4 text-amber-600 bg-slate-700 border-slate-600 rounded focus:ring-amber-500"
                    />
                    <label htmlFor="requireTwoFactor" className="ml-2 text-sm text-slate-300">
                      Exigir autenticação de dois fatores (2FA)
                    </label>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}