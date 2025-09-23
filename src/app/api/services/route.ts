import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// GET - Buscar serviços disponíveis
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const category = searchParams.get('category')

    const services = await prisma.service.findMany({
      where: {
        active: true,
        ...(category && { category })
      },
      select: {
        id: true,
        name: true,
        price: true,
        duration: true
      },
      orderBy: {
        name: 'asc'
      }
    })

    // Adicionar description padrão para compatibilidade com frontend
    const servicesWithDescription = services.map(service => ({
      ...service,
      description: `Serviço de ${service.name.toLowerCase()}`
    }))

    return NextResponse.json({ success: true, services: servicesWithDescription })
  } catch (error) {
    console.error('Erro ao buscar serviços:', error)
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 })
  }
}
