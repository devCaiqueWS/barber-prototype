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
    phone: '',
    whatsapp: '',
    paymentMethod: '',
    payOnline: false
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
          clientWhatsapp: clientData.whatsapp,
          paymentMethod: clientData.paymentMethod,
          payOnline: clientData.payOnline,
        }),
      })

      const data = await response.json()
      
      if (data.success) {
        if (clientData.payOnline) {
          // Redirecionar para página de pagamento
          const paymentData = {
            appointmentId: data.appointment.id,
            service: selectedService.name,
            price: selectedService.price,
            barber: selectedBarber.name,
            date: selectedDate,
            time: selectedTime,
            paymentMethod: clientData.paymentMethod,
            clientName: clientData.name,
            clientEmail: clientData.email
          }
          
          // Armazenar dados do pagamento no localStorage temporariamente
          localStorage.setItem('paymentData', JSON.stringify(paymentData))
          
          // Redirecionar para página de pagamento
          window.location.href = '/pagamento'
        } else {
          setStep(6) // Página de sucesso normal
        }
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
    setClientData({ name: '', email: '', phone: '', whatsapp: '', paymentMethod: '', payOnline: false })
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
          <h1 className="text-white text-3xl font-bold mb-4">
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
              <h2 className="text-white text-2xl font-bold mb-6 text-center">Escolha seu Serviço</h2>
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
              <h2 className="text-white text-2xl font-bold mb-6 text-center">Escolha seu Barbeiro</h2>
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
              <h2 className="text-white text-2xl font-bold mb-6 text-center">Escolha a Data</h2>
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
              <h2 className="text-white text-2xl font-bold mb-6 text-center">Escolha o Horário</h2>
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
                    onChange={(e) => {
                      // Remover caracteres não numéricos e aplicar máscara
                      const value = e.target.value.replace(/\D/g, '')
                      const formatted = value.replace(/(\d{2})(\d{5})(\d{4})/, '($1) $2-$3')
                      setClientData({...clientData, phone: formatted})
                    }}
                    className="w-full p-3 bg-slate-800 border border-slate-600 rounded-lg text-white"
                    placeholder="(11) 99999-9999"
                    maxLength="15"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium mb-2">WhatsApp</label>
                  <input
                    type="tel"
                    required
                    value={clientData.whatsapp}
                    onChange={(e) => {
                      // Remover caracteres não numéricos e aplicar máscara
                      const value = e.target.value.replace(/\D/g, '')
                      const formatted = value.replace(/(\d{2})(\d{5})(\d{4})/, '($1) $2-$3')
                      setClientData({...clientData, whatsapp: formatted})
                    }}
                    className="w-full p-3 bg-slate-800 border border-slate-600 rounded-lg text-white"
                    placeholder="(11) 99999-9999"
                    maxLength="15"
                  />
                  <p className="text-xs text-slate-400 mt-1">Número para contato via WhatsApp</p>
                </div>
                
                <div>
                  <label className="block text-sm font-medium mb-2">Forma de Pagamento</label>
                  <select
                    required
                    value={clientData.paymentMethod}
                    onChange={(e) => {
                      setClientData({...clientData, paymentMethod: e.target.value, payOnline: false})
                    }}
                    className="w-full p-3 bg-slate-800 border border-slate-600 rounded-lg text-white"
                  >
                    <option value="">Selecione a forma de pagamento</option>
                    <option value="dinheiro">Dinheiro</option>
                    <option value="cartao_credito">Cartão de Crédito</option>
                    <option value="cartao_debito">Cartão de Débito</option>
                    <option value="pix">PIX</option>
                  </select>
                </div>

                {/* Opção de Pagamento Online */}
                {(clientData.paymentMethod === 'pix' || 
                  clientData.paymentMethod === 'cartao_credito' || 
                  clientData.paymentMethod === 'cartao_debito') && (
                  <div className="bg-slate-700 rounded-lg p-4 border border-slate-600">
                    <div className="flex items-center space-x-3">
                      <input
                        type="checkbox"
                        id="payOnline"
                        checked={clientData.payOnline}
                        onChange={(e) => setClientData({...clientData, payOnline: e.target.checked})}
                        className="w-4 h-4 text-amber-600 bg-slate-800 border-slate-600 rounded focus:ring-amber-500"
                      />
                      <label htmlFor="payOnline" className="text-white font-medium">
                        💳 Quero pagar online agora
                      </label>
                    </div>
                    <p className="text-slate-400 text-sm mt-2 ml-7">
                      {clientData.paymentMethod === 'pix' 
                        ? 'Pague com PIX de forma rápida e segura'
                        : 'Pague com cartão de forma segura pelo site'
                      }
                    </p>
                    {clientData.payOnline && (
                      <div className="mt-3 ml-7">
                        <div className="flex items-center space-x-2 text-green-400">
                          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                          </svg>
                          <span className="text-sm">Pagamento será processado após confirmação</span>
                        </div>
                      </div>
                    )}
                  </div>
                )}
                
                <button
                  type="submit"
                  disabled={loading}
                  className={`w-full font-bold py-3 px-6 rounded-lg transition-colors ${
                    clientData.payOnline 
                      ? 'bg-green-600 hover:bg-green-700 disabled:bg-slate-600' 
                      : 'bg-amber-500 hover:bg-amber-600 disabled:bg-slate-600'
                  } text-white`}
                >
                  {loading ? 'Processando...' : 
                   clientData.payOnline ? 'Agendar e Pagar Online' : 'Confirmar Agendamento'}
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
                  <p><strong>WhatsApp:</strong> {clientData.whatsapp}</p>
                  <p><strong>Forma de Pagamento:</strong> {
                    clientData.paymentMethod === 'dinheiro' ? 'Dinheiro' :
                    clientData.paymentMethod === 'cartao_credito' ? 'Cartão de Crédito' :
                    clientData.paymentMethod === 'cartao_debito' ? 'Cartão de Débito' :
                    clientData.paymentMethod === 'pix' ? 'PIX' : clientData.paymentMethod
                  }</p>
                </div>
                <p className="text-slate-400 mb-6">
                  Você receberá uma confirmação no email: {clientData.email}
                </p>
                
                {/* Botão WhatsApp */}
                <div className="mb-6">
                  <a
                    href={`https://wa.me/55${clientData.whatsapp.replace(/\D/g, '')}?text=Olá! Acabei de realizar um agendamento no BarberPro para ${selectedService?.name} no dia ${selectedDate} às ${selectedTime}.`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center bg-green-600 hover:bg-green-700 text-white font-bold py-3 px-6 rounded-lg transition-colors mr-4"
                  >
                    <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.890-5.335 11.893-11.893A11.821 11.821 0 0020.885 3.488"/>
                    </svg>
                    Entrar em contato via WhatsApp
                  </a>
                </div>
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
