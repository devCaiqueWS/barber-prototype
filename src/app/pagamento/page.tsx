'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { ArrowLeft, CreditCard, Smartphone, CheckCircle, AlertCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface PaymentData {
  service: string
  barber: string
  date: string
  time: string
  price: number
  paymentMethod: string
  clientName: string
  clientWhatsapp: string
}

export default function PagamentoPage() {
  const [paymentData, setPaymentData] = useState<PaymentData | null>(null)
  const [step, setStep] = useState(1) // 1: dados, 2: processando, 3: sucesso/erro
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [cardData, setCardData] = useState({
    number: '',
    name: '',
    expiry: '',
    cvv: ''
  })

  useEffect(() => {
    // Carregar dados do pagamento do localStorage
    const data = localStorage.getItem('paymentData')
    if (data) {
      setPaymentData(JSON.parse(data))
    } else {
      // Se não há dados, redirecionar para agendamento
      window.location.href = '/agendamento'
    }
  }, [])

  const formatCardNumber = (value: string) => {
    const v = value.replace(/\s+/g, '').replace(/[^0-9]/gi, '')
    const matches = v.match(/\d{4,16}/g)
    const match = matches && matches[0] || ''
    const parts = []
    for (let i = 0, len = match.length; i < len; i += 4) {
      parts.push(match.substring(i, i + 4))
    }
    if (parts.length) {
      return parts.join(' ')
    } else {
      return v
    }
  }

  const formatExpiry = (value: string) => {
    const v = value.replace(/\D/g, '')
    if (v.length >= 2) {
      return `${v.substring(0, 2)}/${v.substring(2, 4)}`
    }
    return v
  }

  const handlePayment = async () => {
    setLoading(true)
    setError('')
    setStep(2)

    // Simular processamento de pagamento
    try {
      await new Promise(resolve => setTimeout(resolve, 3000))
      
      // Simular sucesso (80% de chance)
      const success = Math.random() > 0.2
      
      if (success) {
        setStep(3)
        // Limpar dados do localStorage
        localStorage.removeItem('paymentData')
      } else {
        setError('Pagamento rejeitado. Verifique os dados do cartão.')
        setStep(1)
      }
    } catch (error) {
      setError('Erro no processamento. Tente novamente.' + error)
      setStep(1)
    } finally {
      setLoading(false)
    }
  }

  const handlePixPayment = () => {
    setLoading(true)
    setStep(2)
    
    // Simular geração de QR Code PIX
    setTimeout(() => {
      setStep(3)
      setLoading(false)
      localStorage.removeItem('paymentData')
    }, 2000)
  }

  if (!paymentData) {
    return (
      <div className="min-h-screen bg-[#1F1F1F] flex items-center justify-center">
        <div className="text-white">Carregando...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#1F1F1F] text-white">
      <div className="container mx-auto px-4 py-8">
        <div className="mb-6">
          <Link href="/agendamento" className="text-amber-500 hover:text-amber-400 flex items-center">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Voltar para Agendamento
          </Link>
        </div>

        <div className="max-w-2xl mx-auto">
          {/* Cabeçalho */}
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold mb-4">
              Finalizar <span className="text-amber-500">Pagamento</span>
            </h1>
            <p className="text-slate-400">Complete seu agendamento com pagamento seguro</p>
          </div>

          {/* Resumo do Agendamento */}
          <div className="bg-slate-800 rounded-lg p-6 mb-6 border border-slate-700">
            <h3 className="text-lg font-semibold mb-4 text-amber-500">Resumo do Agendamento</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-slate-400">Serviço:</span>
                <span>{paymentData.service}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Barbeiro:</span>
                <span>{paymentData.barber}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Data:</span>
                <span>{paymentData.date}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Horário:</span>
                <span>{paymentData.time}</span>
              </div>
              <hr className="border-slate-600 my-3" />
              <div className="flex justify-between text-lg font-bold">
                <span>Total:</span>
                <span className="text-amber-500">R$ {paymentData.price?.toFixed(2)}</span>
              </div>
            </div>
          </div>

          {/* Conteúdo baseado no step */}
          {step === 1 && (
            <div className="space-y-6">
              {/* PIX */}
              {paymentData.paymentMethod === 'pix' && (
                <div className="bg-slate-800 rounded-lg p-6 border border-slate-700">
                  <div className="flex items-center space-x-3 mb-4">
                    <Smartphone className="h-6 w-6 text-green-500" />
                    <h3 className="text-lg font-semibold">Pagamento via PIX</h3>
                  </div>
                  <p className="text-slate-400 mb-6">
                    Você será redirecionado para gerar o QR Code do PIX
                  </p>
                  <Button 
                    onClick={handlePixPayment}
                    className="w-full bg-green-600 hover:bg-green-700"
                    disabled={loading}
                  >
                    Gerar PIX
                  </Button>
                </div>
              )}

              {/* Cartão */}
              {(paymentData.paymentMethod === 'cartao_credito' || paymentData.paymentMethod === 'cartao_debito') && (
                <div className="bg-slate-800 rounded-lg p-6 border border-slate-700">
                  <div className="flex items-center space-x-3 mb-6">
                    <CreditCard className="h-6 w-6 text-blue-500" />
                    <h3 className="text-lg font-semibold">
                      {paymentData.paymentMethod === 'cartao_credito' ? 'Cartão de Crédito' : 'Cartão de Débito'}
                    </h3>
                  </div>

                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium mb-2">Número do Cartão</label>
                      <input
                        type="text"
                        value={cardData.number}
                        onChange={(e) => setCardData({...cardData, number: formatCardNumber(e.target.value)})}
                        className="w-full p-3 bg-slate-700 border border-slate-600 rounded-lg text-white"
                        placeholder="1234 5678 9012 3456"
                        maxLength={19}
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium mb-2">Nome no Cartão</label>
                      <input
                        type="text"
                        value={cardData.name}
                        onChange={(e) => setCardData({...cardData, name: e.target.value.toUpperCase()})}
                        className="w-full p-3 bg-slate-700 border border-slate-600 rounded-lg text-white"
                        placeholder="NOME COMO NO CARTÃO"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium mb-2">Validade</label>
                        <input
                          type="text"
                          value={cardData.expiry}
                          onChange={(e) => setCardData({...cardData, expiry: formatExpiry(e.target.value)})}
                          className="w-full p-3 bg-slate-700 border border-slate-600 rounded-lg text-white"
                          placeholder="MM/AA"
                          maxLength={5}
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium mb-2">CVV</label>
                        <input
                          type="text"
                          value={cardData.cvv}
                          onChange={(e) => setCardData({...cardData, cvv: e.target.value.replace(/\D/g, '')})}
                          className="w-full p-3 bg-slate-700 border border-slate-600 rounded-lg text-white"
                          placeholder="123"
                          maxLength={4}
                        />
                      </div>
                    </div>

                    {error && (
                      <div className="bg-red-900/50 border border-red-700 text-red-200 px-4 py-3 rounded-lg text-sm flex items-center">
                        <AlertCircle className="h-4 w-4 mr-2" />
                        {error}
                      </div>
                    )}

                    <Button 
                      onClick={handlePayment}
                      className="w-full bg-blue-600 hover:bg-blue-700"
                      disabled={loading || !cardData.number || !cardData.name || !cardData.expiry || !cardData.cvv}
                    >
                      Processar Pagamento
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Processando */}
          {step === 2 && (
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-amber-500 mx-auto mb-6"></div>
              <h3 className="text-xl font-semibold mb-2">Processando Pagamento</h3>
              <p className="text-slate-400">
                {paymentData.paymentMethod === 'pix' 
                  ? 'Gerando código PIX...' 
                  : 'Verificando dados do cartão...'}
              </p>
            </div>
          )}

          {/* Sucesso */}
          {step === 3 && (
            <div className="text-center py-12">
              <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-6" />
              <h3 className="text-2xl font-bold mb-4 text-green-400">
                Pagamento Confirmado! 🎉
              </h3>
              <p className="text-slate-400 mb-6">
                Seu agendamento foi confirmado e o pagamento processado com sucesso.
              </p>
              <div className="space-y-3">
                <Button 
                  onClick={() => window.location.href = '/agendamento'}
                  className="w-full bg-amber-600 hover:bg-amber-700"
                >
                  Fazer Novo Agendamento
                </Button>
                <Button 
                  onClick={() => window.location.href = '/'}
                  variant="outline"
                  className="w-full border-slate-600 text-slate-300 hover:bg-slate-700"
                >
                  Voltar ao Início
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
