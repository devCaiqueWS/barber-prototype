'use client'



import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'

import { useState, useEffect, useRef, Suspense } from 'react'

import { useSearchParams } from 'next/navigation'


import { SimpleDatePicker } from '@/components/ui/simple-date-picker'
import { formatDateBR, formatDateKey } from '@/lib/date'
import { appointmentIcsFilename, buildAppointmentIcs } from '@/lib/ics'
import ClientAuthForm from '@/components/client/ClientAuthForm'
import { ONLINE_PAYMENT_REQUIRED } from '@/lib/payment-config'

function BookingPageContent() {

  const searchParams = useSearchParams()

  const [step, setStep] = useState(1)

  const [loading, setLoading] = useState(false)

  const [services, setServices] = useState([])

  const [barbers, setBarbers] = useState([])

  const [selectedService, setSelectedService] = useState(null)

  const [selectedBarber, setSelectedBarber] = useState(null)

  const [selectedDate, setSelectedDate] = useState('')

  const [selectedTime, setSelectedTime] = useState('')

  const [availableTimes, setAvailableTimes] = useState([])

  // Produtos ativos e quantidades escolhidas ({ [productId]: quantidade })
  const [products, setProducts] = useState([])
  const [cart, setCart] = useState({})

  // Serviços adicionais que cabem depois do principal no horário escolhido
  const [extraOptions, setExtraOptions] = useState([])
  const [extraGapMinutes, setExtraGapMinutes] = useState(0)
  const [selectedExtraIds, setSelectedExtraIds] = useState([])

  const [lastAppointmentId, setLastAppointmentId] = useState('')

  const [confirmationEmailSent, setConfirmationEmailSent] = useState(false)

  const [clientData, setClientData] = useState({

    name: '',

    email: '',

    instagram: '',

    whatsapp: '',

    paymentMethod: '',

    payOnline: false

  })

  // Conta do cliente logado (obrigatória para agendar)
  const [authUser, setAuthUser] = useState(null)
  const [authChecked, setAuthChecked] = useState(false)

  const todayStr = formatDateKey(new Date())

  const hasPrefilledService = useRef(false)



  // Carregar serviços ao montar o componente

  useEffect(() => {

    loadServices()

    loadBarbers()

    loadProducts()

    checkSession()

  }, [])



  // Verifica se o cliente já está logado e preenche os dados da conta
  const checkSession = async () => {
    try {
      const response = await fetch('/api/auth/me')
      const data = await response.json()
      if (data.user && data.user.role === 'CLIENT') {
        applyAuthUser(data.user)
      }
    } catch (error) {
      console.error('Erro ao verificar sessão:', error)
    } finally {
      setAuthChecked(true)
    }
  }

  const applyAuthUser = (user) => {
    setAuthUser(user)
    setClientData((prev) => ({
      ...prev,
      name: user.name || '',
      email: user.email || '',
      whatsapp: prev.whatsapp || user.whatsapp || '',
    }))
  }

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' })
    } catch (error) {
      console.error('Erro ao sair:', error)
    }
    setAuthUser(null)
    setClientData((prev) => ({ ...prev, name: '', email: '', whatsapp: '' }))
  }



  const loadServices = async () => {

    try {

      const response = await fetch('/api/services')

      const data = await response.json()

      if (data.success) {

        setServices(data.services)

      } else {

        setServices([])

      }

    } catch (error) {

      console.error('Erro ao carregar serviços:', error)

      setServices([])

    }

  }



  const loadProducts = async () => {
    try {
      const response = await fetch('/api/products')
      const data = await response.json()
      setProducts(data.success ? data.products : [])
    } catch (error) {
      console.error('Erro ao carregar produtos:', error)
      setProducts([])
    }
  }

  const MAX_PRODUCT_QUANTITY = 10

  const changeQuantity = (productId, delta) => {
    setCart((prev) => {
      const next = Math.min(MAX_PRODUCT_QUANTITY, Math.max(0, (prev[productId] || 0) + delta))
      const updated = { ...prev }
      if (next === 0) delete updated[productId]
      else updated[productId] = next
      return updated
    })
  }

  const formatBRL = (value) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(value) || 0)

  // Itens escolhidos, com os dados do cadastro (o servidor recalcula tudo ao reservar)
  const cartItems = products
    .filter((product) => cart[product.id] > 0)
    .map((product) => ({ ...product, quantity: cart[product.id] }))

  const productsTotal = cartItems.reduce((sum, item) => sum + item.price * item.quantity, 0)

  // Adicionais escolhidos e quanto tempo livre ainda sobra para outros
  const selectedExtras = extraOptions.filter((service) => selectedExtraIds.includes(service.id))
  const extrasMinutes = selectedExtras.reduce((sum, service) => sum + (Number(service.duration) || 0), 0)
  const extrasTotal = selectedExtras.reduce((sum, service) => sum + (Number(service.price) || 0), 0)
  const remainingExtraMinutes = extraGapMinutes - extrasMinutes

  const formatMinutes = (minutes) => {
    const h = Math.floor(minutes / 60)
    const m = minutes % 60
    if (h === 0) return `${m} min`
    return m === 0 ? `${h}h` : `${h}h${String(m).padStart(2, '0')}`
  }

  const toggleExtra = (service) => {
    setSelectedExtraIds((prev) => {
      if (prev.includes(service.id)) return prev.filter((id) => id !== service.id)
      return service.duration <= remainingExtraMinutes ? [...prev, service.id] : prev
    })
  }

  const allServiceNames = [selectedService?.name, ...selectedExtras.map((service) => service.name)]
    .filter(Boolean)
    .join(' + ')
  const totalDuration = (Number(selectedService?.duration) || 30) + extrasMinutes

  // Busca os serviços que cabem depois do principal; devolve a lista para decidir o próximo passo
  const loadExtraOptions = async (time) => {
    setSelectedExtraIds([])
    try {
      const params = new URLSearchParams({
        barberId: selectedBarber.id,
        date: selectedDate,
        time,
        serviceId: selectedService.id,
      })
      const response = await fetch(`/api/availability/extras?${params.toString()}`)
      const data = await response.json()
      const options = data.success ? data.services : []
      setExtraOptions(options)
      setExtraGapMinutes(data.success ? data.gapMinutes : 0)
      return options
    } catch (error) {
      console.error('Erro ao carregar serviços adicionais:', error)
      setExtraOptions([])
      setExtraGapMinutes(0)
      return []
    }
  }

  // Passo 5 (adicionais) só existe quando há produto ativo ou serviço que caiba no horário
  const hasProductsStep = products.length > 0 || extraOptions.length > 0
  const STEP_CONFIRM = 6
  const STEP_SUCCESS = 7
  const stepBeforeConfirm = hasProductsStep ? 5 : 4

  const loadBarbers = async () => {

    try {

      const response = await fetch('/api/barbers')

      const data = await response.json()

      if (data.success) {

        setBarbers(data.barbers)

      } else {

        setBarbers([])

      }

    } catch (error) {

      console.error('Erro ao carregar barbeiros:', error)

      setBarbers([])

    }

  }



  const loadAvailableTimes = async (barberId, date, durationMinutes = 30) => {

    try {

      const response = await fetch(`/api/availability?barberId=${barberId}&date=${date}&duration=${durationMinutes}`)

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



  const getSlotDurationForService = () => {

    const dur = Number(selectedService?.duration)
    if (!Number.isFinite(dur) || dur <= 0) return 30
    return Math.round(dur)

  }



  useEffect(() => {

    if (hasPrefilledService.current) return

    const preselectId = searchParams?.get('service')

    if (!preselectId || services.length === 0) return

    const found = services.find((s) => s.id === preselectId)

    if (found) {

      setSelectedService(found)

      setStep(2)

      hasPrefilledService.current = true

    }

  }, [services, searchParams])



  const handleBarberSelect = (barber) => {

    setSelectedBarber(barber)

    setStep(3)

  }



  const handleDateSelect = (date) => {

    if (!date || date.length !== 10) {

      setSelectedDate(date)

      return

    }



    const normalized = date < todayStr ? todayStr : date



    setSelectedDate(normalized)

    if (selectedBarber) {

      loadAvailableTimes(selectedBarber.id, normalized, getSlotDurationForService())

    }

    setStep(4)

  }



  const handleTimeSelect = async (time) => {

    setSelectedTime(time)

    const options = await loadExtraOptions(time)

    setStep(products.length > 0 || options.length > 0 ? 5 : STEP_CONFIRM)

  }



  const bookingPaymentLabel = authUser?.isSubscriber
    ? 'Assinatura'
    : ONLINE_PAYMENT_REQUIRED
      ? 'Online'
      : 'Na barbearia'

  // Estimativa para a tela; o valor cobrado é sempre recalculado no servidor
  const amountDue =
    (authUser?.isSubscriber ? 0 : (Number(selectedService?.price) || 0) + extrasTotal) + productsTotal

  const handleClientDataSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)

    try {
      if (!selectedService || !selectedBarber || !selectedDate || !selectedTime) {
        alert('Selecione serviço, barbeiro, data e horário antes de confirmar.')
        return
      }

      if (!authUser) {
        alert('Faça login ou crie sua conta para agendar.')
        return
      }

      const response = await fetch('/api/appointments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          serviceId: selectedService.id,
          barberId: selectedBarber.id,
          date: selectedDate,
          time: selectedTime,
          clientInstagram: clientData.instagram,
          clientWhatsapp: clientData.whatsapp,
          products: cartItems.map((item) => ({ productId: item.id, quantity: item.quantity })),
          extraServiceIds: selectedExtraIds,
        }),
      })

      const data = await response.json()

      if (response.status === 401) {
        setAuthUser(null)
        alert(data.error || 'Sua sessão expirou. Faça login novamente para agendar.')
        return
      }

      if (!response.ok || !data.success) {
        alert(data.error || 'Não foi possível concluir o agendamento.')
        if (response.status === 409 && data.extrasUnavailable) {
          // O tempo livre mudou enquanto o cliente escolhia: recarrega os adicionais
          const options = await loadExtraOptions(selectedTime)
          setStep(products.length > 0 || options.length > 0 ? 5 : STEP_CONFIRM)
        } else if (response.status === 409 && data.productsUnavailable) {
          // Produto desativado enquanto o cliente escolhia: recarrega a lista
          setCart({})
          void loadProducts()
          setStep(5)
        } else if (response.status === 409) {
          // Horário ocupado: volta para a escolha de horário com a lista atualizada
          setSelectedTime('')
          void loadAvailableTimes(selectedBarber.id, selectedDate, getSlotDurationForService())
          setStep(4)
        }
        return
      }

      setLastAppointmentId(data.appointment?.id || '')

      if (data.requiresPayment && data.checkoutUrl) {
        // O horário já está reservado; a confirmação chega depois do pagamento
        window.location.href = data.checkoutUrl
        return
      }

      setConfirmationEmailSent(Boolean(data.emailSent))
      setStep(STEP_SUCCESS)
    } catch (error) {
      console.error('Erro ao criar agendamento:', error)
      alert('Erro ao criar agendamento. Tente novamente.')
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

    setClientData({ name: '', email: '', instagram: '', whatsapp: '', paymentMethod: '', payOnline: false })

    setAvailableTimes([])

    setCart({})

    setExtraOptions([])

    setExtraGapMinutes(0)

    setSelectedExtraIds([])

    setConfirmationEmailSent(false)

  }



  const handleAddToCalendar = () => {

    if (!selectedService || !selectedDate || !selectedTime) return



    // Mesmo gerador usado no anexo do e-mail de confirmação

    const ics = buildAppointmentIcs({

      id: lastAppointmentId || `${selectedDate}-${selectedTime}`,

      date: selectedDate,

      startTime: selectedTime,

      serviceName: allServiceNames || selectedService.name,

      serviceDuration: totalDuration,

      barberName: selectedBarber?.name,

      clientName: clientData.name,

    })



    if (!ics) return



    const blob = new Blob([ics], { type: 'text/calendar;charset=utf-8' })

    const url = URL.createObjectURL(blob)

    const link = document.createElement('a')

    link.href = url

    link.download = appointmentIcsFilename({ date: selectedDate, startTime: selectedTime })

    document.body.appendChild(link)

    link.click()

    document.body.removeChild(link)

    setTimeout(() => URL.revokeObjectURL(url), 1000)

  }



  return (

    <div className="premium-shell min-h-screen text-white">

      <div className="container mx-auto px-4 py-8 space-y-6">

        <div className="mb-6">

          <Link href="/" aria-label="Voltar" className="inline-flex h-10 w-10 items-center justify-center text-primary hover:text-red-300">

            <ArrowLeft className="h-5 w-5" />

          </Link>

        </div>



        <div className="text-center mb-8">

          <div className="brand-kicker mb-3">Reserva online</div>
          <h1 className="mb-4 text-4xl font-bold text-white md:text-5xl">

            Agendamento <span className="text-amber-500">Elemento</span>

          </h1>



          {/* Progress Steps */}

          <div className="flex justify-center flex-wrap gap-3 mb-8">

            {(hasProductsStep ? [1, 2, 3, 4, 5, 6] : [1, 2, 3, 4, 5]).map((num) => (

              <div

                key={num}

                className={`w-9 h-9 rounded-full flex items-center justify-center ${(hasProductsStep || step < STEP_CONFIRM ? step : step - 1) >= num ? 'bg-amber-500' : 'bg-slate-600'

                  }`}

              >

                {num}

              </div>

            ))}

          </div>

        </div>



          <div className="premium-card max-w-4xl mx-auto rounded-[2rem] p-5 sm:p-8">

          {/* Step 1: Selecionar Serviço */}

          {step === 1 && (

            <div>

              <h2 className="text-white text-2xl font-bold mb-6 text-center">Escolha seu Serviço</h2>

              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">

                {services.map((service) => (

                  <div

                    key={service.id}

                    className="premium-card cursor-pointer rounded-2xl p-6 transition hover:-translate-y-1 hover:border-primary/40"

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
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">

                {barbers.map((barber) => (

                  <div

                    key={barber.id}

                    className="premium-card cursor-pointer rounded-2xl p-6 transition hover:-translate-y-1 hover:border-primary/40"

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

                  aria-label="Voltar"
                  className="inline-flex h-10 w-10 items-center justify-center text-slate-400 hover:text-white"

                >

                  <ArrowLeft className="h-4 w-4" />

                </button>

              </div>

            </div>

          )}



          {/* Step 3: Selecionar Data */}

          {step === 3 && (

            <div>

              <h2 className="text-white text-2xl font-bold mb-6 text-center">Escolha a Data</h2>

              <div className="mb-4 text-center space-y-2">

                <p className="text-slate-400">Servico: <span className="text-amber-500">{selectedService?.name}</span></p>

                <p className="text-slate-400">Barbeiro: <span className="text-amber-500">{selectedBarber?.name}</span></p>

              </div>



              <div className="max-w-md mx-auto">

                <SimpleDatePicker

                  value={selectedDate}

                  min={todayStr}

                  onChange={handleDateSelect}

                  className="w-full"

                />

              </div>



              <div className="mt-6 text-center">

                <button

                  onClick={() => setStep(2)}

                  aria-label="Voltar"
                  className="inline-flex h-10 w-10 items-center justify-center text-slate-400 hover:text-white"

                >

                  <ArrowLeft className="h-4 w-4" />

                </button>

              </div>

            </div>

          )}



          {/* Step 4: Selecionar Horário */}

          {step === 4 && (

            <div>

              <h2 className="text-white text-2xl font-bold mb-6 text-center">Escolha o Horário</h2>

              <div className="mb-6 text-center space-y-2">

                <p className="text-slate-400">Servico: <span className="text-amber-500">{selectedService?.name}</span></p>

                <p className="text-slate-400">Barbeiro: <span className="text-amber-500">{selectedBarber?.name}</span></p>

                <p className="text-slate-400">Data: <span className="text-amber-500">{formatDateBR(selectedDate)}</span></p>

              </div>



              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 max-w-2xl mx-auto">

                {availableTimes.map((time) => (

                  <button

                    key={time}

                    onClick={() => handleTimeSelect(time)}

                    className="rounded-xl border border-white/10 bg-[#151414] p-3 transition-colors hover:border-primary hover:bg-primary"

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

                  aria-label="Voltar"
                  className="inline-flex h-10 w-10 items-center justify-center text-slate-400 hover:text-white"

                >

                  <ArrowLeft className="h-4 w-4" />

                </button>

              </div>

            </div>

          )}



          {/* Step 5: Produtos (opcional) */}

          {step === 5 && (

            <div>

              <h2 className="text-white text-2xl font-bold mb-2 text-center">Quer adicionar algo?</h2>

              <p className="mb-6 text-center text-slate-400">
                Opcional. O que você escolher entra no mesmo pagamento.
              </p>

              {extraOptions.length > 0 && (
                <div className="mb-8">
                  <h3 className="text-lg font-semibold text-white">Mais serviços no mesmo horário</h3>
                  <p className="mb-4 text-sm text-slate-400">
                    Feitos logo depois de {selectedService?.name}. Há {formatMinutes(extraGapMinutes)} livres na agenda
                    {selectedExtras.length > 0 ? ` (restam ${formatMinutes(remainingExtraMinutes)})` : ''}.
                  </p>

                  <div className="grid sm:grid-cols-2 gap-4">
                    {extraOptions.map((service) => {
                      const selected = selectedExtraIds.includes(service.id)
                      const fits = selected || service.duration <= remainingExtraMinutes
                      return (
                        <button
                          key={service.id}
                          type="button"
                          onClick={() => toggleExtra(service)}
                          disabled={!fits}
                          aria-pressed={selected}
                          className={`premium-card rounded-2xl p-5 text-left transition ${
                            selected ? 'border-primary' : fits ? 'hover:border-primary/40' : 'opacity-40'
                          }`}
                        >
                          <div className="flex items-start justify-between gap-3">
                            <span className="text-lg font-semibold text-amber-500">{service.name}</span>
                            <span className="shrink-0 font-bold text-green-400">
                              {authUser?.isSubscriber ? 'Assinatura' : formatBRL(service.price)}
                            </span>
                          </div>
                          <div className="mt-2 flex items-center justify-between text-sm text-slate-400">
                            <span>{service.duration} min</span>
                            <span className={selected ? 'font-semibold text-primary' : ''}>
                              {selected ? 'Adicionado' : fits ? 'Adicionar' : 'Não cabe mais'}
                            </span>
                          </div>
                        </button>
                      )
                    })}
                  </div>
                </div>
              )}

              {products.length > 0 && <h3 className="mb-4 text-lg font-semibold text-white">Produtos</h3>}

              <div className="grid sm:grid-cols-2 gap-4">

                {products.map((product) => {
                  const quantity = cart[product.id] || 0
                  return (
                    <div
                      key={product.id}
                      className={`premium-card rounded-2xl p-5 transition ${quantity > 0 ? 'border-primary/60' : ''}`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <h3 className="text-lg font-semibold text-amber-500">{product.name}</h3>
                        <span className="shrink-0 font-bold text-green-400">{formatBRL(product.price)}</span>
                      </div>

                      {product.description && <p className="mt-1 text-sm text-slate-400">{product.description}</p>}

                      <div className="mt-4 flex items-center justify-end gap-3">
                        <button
                          type="button"
                          onClick={() => changeQuantity(product.id, -1)}
                          disabled={quantity === 0}
                          aria-label={`Remover ${product.name}`}
                          className="h-9 w-9 rounded-full border border-white/20 text-lg font-bold text-white hover:border-primary disabled:opacity-30"
                        >
                          −
                        </button>
                        <span className="w-6 text-center font-semibold" aria-live="polite">{quantity}</span>
                        <button
                          type="button"
                          onClick={() => changeQuantity(product.id, 1)}
                          disabled={quantity >= MAX_PRODUCT_QUANTITY}
                          aria-label={`Adicionar ${product.name}`}
                          className="h-9 w-9 rounded-full border border-white/20 text-lg font-bold text-white hover:border-primary disabled:opacity-30"
                        >
                          +
                        </button>
                      </div>
                    </div>
                  )
                })}

              </div>

              <div className="mx-auto mt-6 max-w-md space-y-3">
                {(cartItems.length > 0 || selectedExtras.length > 0) && (
                  <p className="text-center text-sm text-slate-300">
                    Adicionais:{' '}
                    <span className="font-semibold text-green-400">
                      {formatBRL((authUser?.isSubscriber ? 0 : extrasTotal) + productsTotal)}
                    </span>
                    {selectedExtras.length > 0 ? ` · +${extrasMinutes} min` : ''}
                  </p>
                )}
                <button
                  type="button"
                  onClick={() => setStep(STEP_CONFIRM)}
                  className="w-full rounded-lg bg-primary px-6 py-3 font-bold text-white transition-colors hover:bg-[#c21111]"
                >
                  {cartItems.length > 0 || selectedExtras.length > 0 ? 'Continuar' : 'Continuar sem adicionais'}
                </button>
              </div>

              <div className="mt-6 text-center">
                <button
                  onClick={() => setStep(4)}
                  aria-label="Voltar"
                  className="inline-flex h-10 w-10 items-center justify-center text-slate-400 hover:text-white"
                >
                  <ArrowLeft className="h-4 w-4" />
                </button>
              </div>

            </div>

          )}



          {/* Step 6a: Login/Cadastro obrigatório */}

          {step === STEP_CONFIRM && !authUser && (

            <div>

              <h2 className="text-2xl font-bold mb-4 text-center">Entre na sua conta</h2>

              <p className="mb-8 text-center text-slate-400">
                Para agendar é necessário ter uma conta. Entre ou crie a sua em segundos.
              </p>

              {authChecked ? (
                <ClientAuthForm onSuccess={applyAuthUser} initialMode="login" />
              ) : (
                <p className="text-center text-slate-400">Carregando...</p>
              )}

              <div className="mt-6 text-center">

                <button

                  onClick={() => setStep(stepBeforeConfirm)}

                  aria-label="Voltar"
                  className="inline-flex h-10 w-10 items-center justify-center text-slate-400 hover:text-white"

                >

                  <ArrowLeft className="h-4 w-4" />

                </button>

              </div>

            </div>

          )}



          {/* Step 6b: Dados do Cliente (logado) */}

          {step === STEP_CONFIRM && authUser && (

            <div>

              <h2 className="text-2xl font-bold mb-6 text-center">Confirme seus Dados</h2>

              <div className="mb-6 text-center space-y-2">

                <p className="text-slate-400">Serviço: <span className="text-amber-500">{allServiceNames}</span></p>

                <p className="text-slate-400">Barbeiro: <span className="text-amber-500">{selectedBarber?.name}</span></p>

                <p className="text-slate-400">Data: <span className="text-amber-500">{selectedDate}</span></p>

                <p className="text-slate-400">Horário: <span className="text-amber-500">{selectedTime}</span></p>

                {cartItems.length > 0 && (
                  <p className="text-slate-400">
                    Produtos:{' '}
                    <span className="text-amber-500">
                      {cartItems.map((item) => `${item.quantity}x ${item.name}`).join(', ')}
                    </span>
                  </p>
                )}

              </div>



              <form onSubmit={handleClientDataSubmit} className="max-w-md mx-auto space-y-4">

                <div className="flex items-center justify-between rounded-xl border border-white/10 bg-slate-800/60 p-4">

                  <div className="min-w-0">

                    <p className="truncate font-semibold text-white">{authUser.name}</p>

                    <p className="truncate text-sm text-slate-400">{authUser.email}</p>

                  </div>

                  <button

                    type="button"

                    onClick={handleLogout}

                    className="ml-3 shrink-0 text-xs font-semibold text-amber-500 hover:text-amber-400"

                  >

                    Trocar conta

                  </button>

                </div>



                <div>

                  <label className="block text-sm font-medium mb-2">Insta <span className="text-slate-400">(opcional)</span></label>

                  <input

                    type="text"

                    value={clientData.instagram}

                    onChange={(e) => {

                      const value = e.target.value.trimStart()

                      setClientData({ ...clientData, instagram: value })

                    }}

                    className="w-full p-3 bg-slate-800 border border-slate-600 rounded-lg text-white"

                    placeholder="@seuinstagram"

                    maxLength="50"

                  />

                </div>



                <div>

                  <label className="block text-sm font-medium mb-2">WhatsApp</label>

                  <input

                    type="tel"

                    required

                    value={clientData.whatsapp}

                    onChange={(e) => {

                      // Remover caracteres numéricos e aplicar máscara

                      const value = e.target.value.replace(/\D/g, '')

                      const formatted = value.replace(/(\d{2})(\d{5})(\d{4})/, '($1) $2-$3')

                      setClientData({ ...clientData, whatsapp: formatted })

                    }}

                    className="w-full p-3 bg-slate-800 border border-slate-600 rounded-lg text-white"

                    placeholder="(11) 99999-9999"

                    maxLength="15"

                  />

                  <p className="text-xs text-slate-400 mt-1">Número para contato via WhatsApp</p>

                </div>



                {/* Pagamento: assinante não paga o serviço; o resto é pago online ou na barbearia */}
                {amountDue > 0 ? (
                  <div className="rounded-xl border border-slate-600 bg-slate-800/70 p-4">
                    <p className="text-sm font-semibold text-white">
                      {ONLINE_PAYMENT_REQUIRED ? 'Pagamento online' : 'Pagamento na barbearia'} · {formatBRL(amountDue)}
                    </p>
                    <ul className="mt-2 space-y-1 text-sm text-slate-300">
                      <li className="flex justify-between gap-3">
                        <span>{selectedService?.name}</span>
                        <span>{authUser?.isSubscriber ? 'Assinatura' : formatBRL(selectedService?.price)}</span>
                      </li>
                      {selectedExtras.map((service) => (
                        <li key={service.id} className="flex justify-between gap-3">
                          <span>{service.name}</span>
                          <span>{authUser?.isSubscriber ? 'Assinatura' : formatBRL(service.price)}</span>
                        </li>
                      ))}
                      {cartItems.map((item) => (
                        <li key={item.id} className="flex justify-between gap-3">
                          <span>{item.quantity}x {item.name}</span>
                          <span>{formatBRL(item.price * item.quantity)}</span>
                        </li>
                      ))}
                    </ul>
                    <p className="mt-3 text-sm text-slate-300">
                      {ONLINE_PAYMENT_REQUIRED
                        ? 'Pague com PIX ou cartão para confirmar. Seu horário fica reservado por 20 minutos enquanto você conclui o pagamento.'
                        : 'Você paga na barbearia, no dia do atendimento. O agendamento é confirmado na hora.'}
                    </p>
                  </div>
                ) : (
                  <div className="rounded-xl border border-green-500/40 bg-green-500/10 p-4">
                    <p className="text-sm font-semibold text-green-300">
                      {authUser?.isSubscriber ? 'Você é assinante' : 'Sem cobrança'}
                    </p>
                    <p className="mt-1 text-sm text-slate-300">Este agendamento é confirmado na hora, sem cobrança.</p>
                  </div>
                )}

                <div className="rounded-xl border border-primary/40 bg-primary/10 p-4">
                  <p className="text-amber-300 text-sm font-medium">
                    Aviso: chegue com 15 min de antecedência. Tolerância de 5 min de atraso (sujeito à ocupação da cadeira).
                  </p>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full font-bold py-3 px-6 rounded-lg transition-colors bg-primary hover:bg-[#c21111] disabled:bg-slate-600 text-white"
                >
                  {loading
                    ? 'Processando...'
                    : ONLINE_PAYMENT_REQUIRED && amountDue > 0
                      ? 'Reservar e ir para o pagamento'
                      : 'Confirmar Agendamento'}
                </button>

              </form>



              <div className="mt-6 text-center">

                <button

                  onClick={() => setStep(stepBeforeConfirm)}

                  aria-label="Voltar"
                  className="inline-flex h-10 w-10 items-center justify-center text-slate-400 hover:text-white"

                >

                  <ArrowLeft className="h-4 w-4" />

                </button>

              </div>

            </div>

          )}



          {/* Step 6: Sucesso */}

          {step === STEP_SUCCESS && (

            <div className="text-center">

              <div className="bg-green-900/50 border border-green-500 rounded-lg p-8 max-w-2xl mx-auto">

                <h2 className="text-2xl font-bold mb-4 text-green-400">Agendamento Confirmado!</h2>

                <div className="space-y-2 mb-6">

                  <p><strong>Serviço:</strong> {allServiceNames}</p>

                  <p><strong>Barbeiro:</strong> {selectedBarber?.name}</p>

                  <p><strong>Data:</strong> {formatDateBR(selectedDate)}</p>

                  <p><strong>Horário:</strong> {selectedTime}</p>

                  <p><strong>Valor:</strong> {formatBRL((Number(selectedService?.price) || 0) + extrasTotal)}</p>

                  <p><strong>WhatsApp:</strong> {clientData.whatsapp}</p>

                  <p><strong>Pagamento:</strong> {bookingPaymentLabel}</p>

                </div>

                <p className="text-slate-400 mb-6">

                  {confirmationEmailSent

                    ? `Enviamos a confirmação com todos os detalhes para o email: ${authUser?.email || ''}`

                    : `Guarde os dados acima. Se preferir, use o botão abaixo para salvar o agendamento na agenda do seu celular.`}

                </p>



                {/* Botão WhatsApp / Agenda */}

                <div className="mb-6">

                  <button

                    onClick={handleAddToCalendar}

                    className="w-95 mb-4 inline-flex items-center bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-6 rounded-lg transition-colors mr-4"

                  >

                    Adicionar à agenda do dispositivo

                  </button>



                  <a

                    href={`https://wa.me/55${clientData.whatsapp.replace(/\D/g, '')}?text=Olá! Acabei de realizar um agendamento na Elemento Estúdio e Barbearia para ${allServiceNames} no dia ${formatDateBR(selectedDate)} às ${selectedTime}.`}

                    target="_blank"

                    rel="noopener noreferrer"

                    className="inline-flex items-center mb-4 bg-green-600 hover:bg-green-700 text-white font-bold py-3 px-6 rounded-lg transition-colors mr-4"

                  >

                    <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 24 24">

                      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67 0.15-.197 0.297-.767 0.966-.94 1.164-.173 0.199-.347 0.223-.644 0.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458 0.13-.606.134-.133 0.298-.347 0.446-.52 0.149-.174 0.198-.298 0.298-.497 0.099-.198 0.05-.371-0.025-.52-0.075-.149-0.669-1.612-0.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52 0.074-.792 0.372-.272 0.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074 0.149 0.198 2.096 3.2 5.077 4.487 0.709 0.306 1.262 0.489 1.694 0.625 0.712 0.227 1.36 0.195 1.871 0.118 0.571-.085 1.758-.719 2.006-1.413 0.248-.694 0.248-1.289 0.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741 0.982 0.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.890-5.335 11.893-11.893A11.821 11.821 0 0020.885 3.488" />

                    </svg>

                    Entrar em contato via WhatsApp

                  </a>

                  <br />

                  <button

                    onClick={resetBooking}

                    className="inline-flex items-center bg-amber-500 hover:bg-amber-600 text-white font-bold py-3 px-6 rounded-lg transition-colors mr-4"

                  >

                    Fazer Novo Agendamento

                  </button>

                  <Link

                    href="/minha-conta"

                    className="inline-flex items-center bg-slate-700 hover:bg-slate-600 text-white font-bold py-3 px-6 rounded-lg transition-colors"

                  >

                    Ver Meus Agendamentos

                  </Link>

                </div>

              </div>

            </div>

          )}        </div>

      </div>

    </div>

  )

}



export default function AgendamentoPage() {

  return (

    <Suspense fallback={<div className="min-h-screen bg-[#1F1F1F] text-white flex items-center justify-center">Carregando...</div>}>

      <BookingPageContent />

    </Suspense>

  )

}
