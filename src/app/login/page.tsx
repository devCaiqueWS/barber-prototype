'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Scissors, Eye, EyeOff, ArrowLeft } from 'lucide-react'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const router = useRouter()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password }),
      })

      const data = await response.json()

      if (response.ok) {
        // Login bem-sucedido
        if (data.user.role === 'admin' || data.user.role === 'barber') {
          router.push('/admin')
        } else {
          router.push('/')
        }
      } else {
        setError(data.error || 'Erro no login')
      }
    } catch (error) {
  setError('Erro de conexão. Tente novamente.')
    } finally {
  setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center px-4">
      <div className="max-w-md w-full space-y-8">
        {/* Header */}
        <div className="text-center">
          <Button variant="ghost" size="icon" asChild className="absolute top-4 left-4 text-slate-300 hover:text-amber-500">
            <Link href="/">
              <ArrowLeft className="h-5 w-5" />
            </Link>
          </Button>
          
          <div className="flex items-center justify-center space-x-2 mb-6">
            <Scissors className="h-10 w-10 text-amber-500" />
            <span className="text-3xl font-bold text-white">BarberPro</span>
          </div>
          
          <h2 className="text-2xl font-bold text-white">Acesse sua conta</h2>
          <p className="mt-2 text-slate-400">
            Entre com suas credenciais para continuar
          </p>
        </div>

        {/* Login Form */}
        <div className="bg-slate-800 rounded-lg p-8 border border-slate-700">
          <form className="space-y-6" onSubmit={handleSubmit}>
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-white mb-2">
                E-mail
              </label>
              <input
                id="email"
                name="email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-white placeholder-slate-400 focus:border-amber-500 focus:outline-none transition-colors"
                placeholder="seu@email.com"
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-white mb-2">
                Senha
              </label>
              <div className="relative">
                <input
                  id="password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-white placeholder-slate-400 focus:border-amber-500 focus:outline-none transition-colors pr-10"
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-white"
                >
                  {showPassword ? (
                    <EyeOff className="h-5 w-5" />
                  ) : (
                    <Eye className="h-5 w-5" />
                  )}
                </button>
              </div>
            </div>

            {error && (
              <div className="bg-red-900/50 border border-red-700 text-red-200 px-4 py-3 rounded-lg text-sm">
                {error}
              </div>
            )}

            <Button
              type="submit"
              className="w-full bg-amber-600 hover:bg-amber-700"
              disabled={loading}
            >
              {loading ? 'Entrando...' : 'Entrar'}
            </Button>
          </form>
        </div>

        {/* Demo Credentials */}
        <div className="bg-slate-800 rounded-lg p-6 border border-slate-700">
          <h3 className="text-white font-semibold mb-3">Credenciais de Demo:</h3>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-slate-400">Admin:</span>
              <span className="text-white">admin@barberpro.com / admin123</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Barbeiro:</span>
              <span className="text-white">joao@barberpro.com / barber123</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Cliente:</span>
              <span className="text-white">cliente@exemplo.com / client123</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
