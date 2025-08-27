'use client'

import Link from 'next/link'
import { useState, useEffect } from 'react'

function AgendamentoPage() {
  const [step, setStep] = useState(1)
  const [loading, setLoading] = useState(false)
  const [services, setServices] = useState([])
  const [barbers, setBarbers] = useState([])
  const [selectedService, setSelectedService] = useState(null)
  const [selectedBarber, setSelectedBarber] = useState(null)
  const [selectedDate, setSelectedDate] = useState('')
  const [selectedTime, setSelectedTime] = useState('')
  const [availableTimes, setAvailableTimes] = useState([])
  const [clientData, setClientData] = useState({
    name: '',
    email: '',
    phone: ''
  })

  // Carregar serviços ao montar o componente
  useEffect(() => {
    loadServices()
    loadBarbers()
  }, [])

  const loadServices = async () => {
    try {
      const response = await fetch('/api/services')
      const data = await response.json()
      if (data.success) {
        setServices(data.services)
      }
    } catch (error) {
      console.error('Erro ao carregar serviços:', error)
    }
  }

  const loadBarbers = async () => {
    try {
      const response = await fetch('/api/barbers')
      const data = await response.json()
      if (data.success) {
        setBarbers(data.barbers)
      }
    } catch (error) {
      console.error('Erro ao carregar barbeiros:', error)
    }
  }

  const loadAvailableTimes = async (barberId, date) => {
    try {
      const response = await fetch(`/api/availability?barberId=${barberId}&date=${date}`)
      const data = await response.json()
      if (data.success) {
        setAvailableTimes(data.availableTimes)
      }
    } catch (error) {
      console.error('Erro ao carregar horários:', error)
    }
  }

  const handleServiceSelect = (service) => {
    setSelectedService(service)
    setStep(2)
  }

  const handleBarberSelect = (barber) => {
    setSelectedBarber(barber)
    setStep(3)
  }

  const handleDateSelect = (date) => {
    setSelectedDate(date)
    if (selectedBarber) {
      loadAvailableTimes(selectedBarber.id, date)
    }
    setStep(4)
  }

  const handleTimeSelect = (time) => {
    setSelectedTime(time)
    setStep(5)
  }

  const handleClientDataSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)

    try {
      const response = await fetch('/api/appointments', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          serviceId: selectedService.id,
          barberId: selectedBarber.id,
          date: selectedDate,
          time: selectedTime,
          clientName: clientData.name,
          clientEmail: clientData.email,
          clientPhone: clientData.phone,
        }),
      })

      const data = await response.json()
      
      if (data.success) {
        setStep(6) // Página de sucesso
      } else {
        alert('Erro ao criar agendamento: ' + (data.message || 'Erro desconhecido'))
      }
    } catch (error) {
      console.error('Erro ao criar agendamento:', error)
      alert('Erro ao criar agendamento')
    } finally {
      setLoading(false)
    }
  }

  const resetBooking = () => {
    setStep(1)
    setSelectedService(null)
    setSelectedBarber(null)
    setSelectedDate('')
    setSelectedTime('')
    setClientData({ name: '', email: '', phone: '' })
    setAvailableTimes([])
  }

  return (
    <div className="min-h-screen bg-slate-900 text-white">
      <div className="container mx-auto px-4 py-8">
        <div className="mb-6">
          <Link href="/" className="text-amber-500 hover:text-amber-400">
            ← Voltar para Home
          </Link>
        </div>
        
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold mb-4">
            Sistema de <span className="text-amber-500">Agendamento</span>
          </h1>
          
          {/* Progress Steps */}
          <div className="flex justify-center space-x-4 mb-8">
            {[1, 2, 3, 4, 5].map((num) => (
              <div
                key={num}
                className={`w-8 h-8 rounded-full flex items-center justify-center ${
                  step >= num ? 'bg-amber-500' : 'bg-slate-600'
                }`}
              >
                {num}
              </div>
            ))}
          </div>
        </div>

        <div className="max-w-4xl mx-auto">
          {/* Step 1: Selecionar Serviço */}
          {step === 1 && (
            <div>
              <h2 className="text-2xl font-bold mb-6 text-center">Escolha seu Serviço</h2>
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                {services.map((service) => (
                  <div
                    key={service.id}
                    className="bg-slate-800 p-6 rounded-lg cursor-pointer hover:bg-slate-700 transition-colors"
                    onClick={() => handleServiceSelect(service)}
                  >
                    <h3 className="text-xl font-semibold mb-2 text-amber-500">{service.name}</h3>
                    <p className="text-slate-400 mb-3">{service.description}</p>
                    <div className="flex justify-between">
                      <span className="text-green-400 font-bold">R$ {service.price}</span>
                      <span className="text-slate-400">{service.duration}min</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Step 2: Selecionar Barbeiro */}
          {step === 2 && (
            <div>
              <h2 className="text-2xl font-bold mb-6 text-center">Escolha seu Barbeiro</h2>
              <div className="mb-4 text-center">
                <p className="text-slate-400">Serviço: <span className="text-amber-500">{selectedService?.name}</span></p>
              </div>
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                {barbers.map((barber) => (
                  <div
                    key={barber.id}
                    className="bg-slate-800 p-6 rounded-lg cursor-pointer hover:bg-slate-700 transition-colors"
                    onClick={() => handleBarberSelect(barber)}
                  >
                    <h3 className="text-xl font-semibold mb-2 text-amber-500">{barber.name}</h3>
                    <p className="text-slate-400">{barber.email}</p>
                  </div>
                ))}
              </div>
              <div className="mt-6 text-center">
                <button
                  onClick={() => setStep(1)}
                  className="text-slate-400 hover:text-white"
                >
                  ← Voltar
                </button>
              </div>
            </div>
          )}

          {/* Step 3: Selecionar Data */}
          {step === 3 && (
            <div>
              <h2 className="text-2xl font-bold mb-6 text-center">Escolha a Data</h2>
              <div className="mb-4 text-center space-y-2">
                <p className="text-slate-400">Serviço: <span className="text-amber-500">{selectedService?.name}</span></p>
                <p className="text-slate-400">Barbeiro: <span className="text-amber-500">{selectedBarber?.name}</span></p>
              </div>
              
              <div className="max-w-md mx-auto">
                <input
                  type="date"
                  min={new Date().toISOString().split('T')[0]}
                  onChange={(e) => handleDateSelect(e.target.value)}
                  className="w-full p-3 bg-slate-800 border border-slate-600 rounded-lg text-white"
                />
              </div>
              
              <div className="mt-6 text-center">
                <button
                  onClick={() => setStep(2)}
                  className="text-slate-400 hover:text-white"
                >
                  ← Voltar
                </button>
              </div>
            </div>
          )}

          {/* Step 4: Selecionar Horário */}
          {step === 4 && (
            <div>
              <h2 className="text-2xl font-bold mb-6 text-center">Escolha o Horário</h2>
              <div className="mb-6 text-center space-y-2">
                <p className="text-slate-400">Serviço: <span className="text-amber-500">{selectedService?.name}</span></p>
                <p className="text-slate-400">Barbeiro: <span className="text-amber-500">{selectedBarber?.name}</span></p>
                <p className="text-slate-400">Data: <span className="text-amber-500">{selectedDate}</span></p>
              </div>
              
              <div className="grid grid-cols-3 md:grid-cols-4 gap-4 max-w-2xl mx-auto">
                {availableTimes.map((time) => (
                  <button
                    key={time}
                    onClick={() => handleTimeSelect(time)}
                    className="p-3 bg-slate-800 hover:bg-amber-500 rounded-lg transition-colors"
                  >
                    {time}
                  </button>
                ))}
              </div>
              
              {availableTimes.length === 0 && (
                <p className="text-center text-slate-400 mt-6">
                  Nenhum horário disponível para esta data
                </p>
              )}
              
              <div className="mt-6 text-center">
                <button
                  onClick={() => setStep(3)}
                  className="text-slate-400 hover:text-white"
                >
                  ← Voltar
                </button>
              </div>
            </div>
          )}

          {/* Step 5: Dados do Cliente */}
          {step === 5 && (
            <div>
              <h2 className="text-2xl font-bold mb-6 text-center">Seus Dados</h2>
              <div className="mb-6 text-center space-y-2">
                <p className="text-slate-400">Serviço: <span className="text-amber-500">{selectedService?.name}</span></p>
                <p className="text-slate-400">Barbeiro: <span className="text-amber-500">{selectedBarber?.name}</span></p>
                <p className="text-slate-400">Data: <span className="text-amber-500">{selectedDate}</span></p>
                <p className="text-slate-400">Horário: <span className="text-amber-500">{selectedTime}</span></p>
              </div>
              
              <form onSubmit={handleClientDataSubmit} className="max-w-md mx-auto space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Nome</label>
                  <input
                    type="text"
                    required
                    value={clientData.name}
                    onChange={(e) => setClientData({...clientData, name: e.target.value})}
                    className="w-full p-3 bg-slate-800 border border-slate-600 rounded-lg text-white"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium mb-2">Email</label>
                  <input
                    type="email"
                    required
                    value={clientData.email}
                    onChange={(e) => setClientData({...clientData, email: e.target.value})}
                    className="w-full p-3 bg-slate-800 border border-slate-600 rounded-lg text-white"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium mb-2">Telefone</label>
                  <input
                    type="tel"
                    required
                    value={clientData.phone}
                    onChange={(e) => setClientData({...clientData, phone: e.target.value})}
                    className="w-full p-3 bg-slate-800 border border-slate-600 rounded-lg text-white"
                  />
                </div>
                
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-amber-500 hover:bg-amber-600 disabled:bg-slate-600 text-white font-bold py-3 px-6 rounded-lg transition-colors"
                >
                  {loading ? 'Agendando...' : 'Confirmar Agendamento'}
                </button>
              </form>
              
              <div className="mt-6 text-center">
                <button
                  onClick={() => setStep(4)}
                  className="text-slate-400 hover:text-white"
                >
                  ← Voltar
                </button>
              </div>
            </div>
          )}

          {/* Step 6: Sucesso */}
          {step === 6 && (
            <div className="text-center">
              <div className="bg-green-900/50 border border-green-500 rounded-lg p-8 max-w-2xl mx-auto">
                <h2 className="text-2xl font-bold mb-4 text-green-400">🎉 Agendamento Confirmado!</h2>
                <div className="space-y-2 mb-6">
                  <p><strong>Serviço:</strong> {selectedService?.name}</p>
                  <p><strong>Barbeiro:</strong> {selectedBarber?.name}</p>
                  <p><strong>Data:</strong> {selectedDate}</p>
                  <p><strong>Horário:</strong> {selectedTime}</p>
                  <p><strong>Valor:</strong> R$ {selectedService?.price}</p>
                </div>
                <p className="text-slate-400 mb-6">
                  Você receberá uma confirmação no email: {clientData.email}
                </p>
                <button
                  onClick={resetBooking}
                  className="bg-amber-500 hover:bg-amber-600 text-white font-bold py-3 px-6 rounded-lg transition-colors"
                >
                  Fazer Novo Agendamento
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default AgendamentoPage
