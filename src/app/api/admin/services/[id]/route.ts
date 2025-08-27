import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// GET - Buscar serviço por ID
export async function GET(request: NextRequest) {
  try {
    const urlParts = request.nextUrl.pathname.split('/');
    const id = urlParts[urlParts.length - 2] === '[id]' ? urlParts[urlParts.length - 1] : urlParts.pop();
    const service = await prisma.service.findUnique({
      where: { id: id as string },
      select: {
        id: true,
        name: true,
        price: true,
        duration: true,
  active: true,
        createdAt: true,
        _count: {
          select: {
            appointments: true
          }
        }
      }
    });
    if (!service) {
      return NextResponse.json({ error: 'Serviço não encontrado' }, { status: 404 });
    }
    return NextResponse.json(service);
  } catch (error) {
    console.error('Erro ao buscar serviço:', error);
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 });
  }
}

// PUT - Atualizar serviço
export async function PUT(request: NextRequest) {
  try {
    const urlParts = request.nextUrl.pathname.split('/');
    const id = urlParts[urlParts.length - 2] === '[id]' ? urlParts[urlParts.length - 1] : urlParts.pop();
    const body = await request.json();
    const { name, price, duration, isActive } = body;
    // Verificar se o serviço existe
    const existingService = await prisma.service.findUnique({
      where: { id: id as string }
    });
    if (!existingService) {
      return NextResponse.json({ error: 'Serviço não encontrado' }, { status: 404 });
    }
    // Validar dados obrigatórios
    if (!name || !price || !duration) {
      return NextResponse.json({ 
        error: 'Nome, preço, duração e categoria são obrigatórios' 
      }, { status: 400 });
    }
    const updatedService = await prisma.service.update({
      where: { id: id as string },
      data: {
        name,
        price: parseFloat(price),
        duration: parseInt(duration),
  active: isActive,
      },
      select: {
        id: true,
        name: true,
        price: true,
        duration: true,
        active: true,
        createdAt: true
      }
    });
    return NextResponse.json(updatedService);
  } catch (error) {
    console.error('Erro ao atualizar serviço:', error);
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 });
  }
}

// DELETE - Deletar serviço
export async function DELETE(request: NextRequest) {
  try {
    const urlParts = request.nextUrl.pathname.split('/');
    const id = urlParts[urlParts.length - 2] === '[id]' ? urlParts[urlParts.length - 1] : urlParts.pop();
    // Verificar se o serviço existe
    const existingService = await prisma.service.findUnique({
      where: { id: id as string }
    });
    if (!existingService) {
      return NextResponse.json({ error: 'Serviço não encontrado' }, { status: 404 });
    }
    // Verificar se o serviço tem agendamentos
    const serviceAppointments = await prisma.appointment.findMany({
      where: { serviceId: id as string }
    });
    if (serviceAppointments.length > 0) {
      // Em vez de deletar, desativar o serviço
      const deactivatedService = await prisma.service.update({
        where: { id: id as string },
  data: { active: false },
        select: {
          id: true,
          name: true,
          price: true,
          duration: true,
    active: true
        }
      });
      return NextResponse.json({ 
        message: 'Serviço desativado com sucesso (tinha agendamentos associados)',
        service: deactivatedService
      });
    }
    // Se não tem agendamentos, pode deletar
    await prisma.service.delete({
      where: { id: id as string }
    });
    return NextResponse.json({ 
      message: 'Serviço deletado com sucesso'
    });
  } catch (error) {
    console.error('Erro ao deletar serviço:', error);
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 });
  }
}
