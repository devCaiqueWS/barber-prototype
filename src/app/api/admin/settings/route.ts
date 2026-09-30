import { NextRequest, NextResponse } from 'next/server'
import { requireStaff } from '@/lib/staff-auth'

// Armazenamento em memória para as configurações
// (válido enquanto o servidor estiver em execução)
let settingsCache: Record<string, unknown> | null = null

// GET - Obter configurações do sistema
export async function GET() {
  if (!(await requireStaff())) {
    return NextResponse.json({ error: 'Acesso negado' }, { status: 403 })
  }

  try {
    if (!settingsCache) {
      return NextResponse.json({ error: 'Configurações não encontradas' }, { status: 404 })
    }

    return NextResponse.json({ settings: settingsCache })
  } catch (error) {
    console.error('Erro ao carregar configurações (admin):', error)
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 })
  }
}

// POST - Salvar/atualizar configurações do sistema
export async function POST(request: NextRequest) {
  if (!(await requireStaff(['ADMIN']))) {
    return NextResponse.json({ error: 'Acesso negado' }, { status: 403 })
  }

  try {
    const body = await request.json()

    if (!body || typeof body !== 'object') {
      return NextResponse.json(
        { error: 'Payload inválido de configurações' },
        { status: 400 },
      )
    }

    settingsCache = body as Record<string, unknown>

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Erro ao salvar configurações (admin):', error)
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 })
  }
}
