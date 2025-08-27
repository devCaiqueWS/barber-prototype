'use client'

import { createContext, useContext, useState, useEffect, ReactNode } from 'react'

interface User {
  id: string
  name: string
  email: string
  role: string
}

interface AuthContextType {
  user: User | null
  loading: boolean
  login: (email: string, password: string) => Promise<boolean>
  logout: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  // Verificar sessão ao carregar
  useEffect(() => {
    checkAuth()
  }, [])

  const checkAuth = async () => {
    try {
      console.log('Checking auth...')
      const response = await fetch('/api/auth/me')
      const data = await response.json()
      console.log('Auth response:', data)
      
      if (data.user) {
        console.log('User found:', data.user)
        setUser(data.user)
      } else {
        console.log('No user found')
      }
    } catch (error) {
      console.error('Erro ao verificar autenticação:', error)
    } finally {
      console.log('Auth check complete, loading set to false')
      setLoading(false)
    }
  }

  const login = async (email: string, password: string): Promise<boolean> => {
    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password }),
      })

      const data = await response.json()

      if (response.ok && data.user) {
        console.log('Login successful, setting user:', data.user)
        setUser(data.user)
        
        // Aguardar um pouco para garantir que o cookie foi definido
        await new Promise(resolve => setTimeout(resolve, 100))
        
        // Verificar autenticação novamente para sincronizar
        await checkAuth()
        
        return true
      }
      
      return false
    } catch (error) {
      console.error('Erro no login:', error)
      return false
    }
  }

  const logout = async () => {
    try {
      await fetch('/api/auth/logout', {
        method: 'POST',
      })
      
      setUser(null)
    } catch (error) {
      console.error('Erro no logout:', error)
    }
  }

  return (
    <AuthContext.Provider value={{ user, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth deve ser usado dentro de AuthProvider')
  }
  return context
}
