import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// GET - Buscar barbeiro por ID
export async function GET(request: NextRequest) {
  try {
    const urlParts = request.nextUrl.pathname.split('/');
    const id = urlParts[urlParts.length - 2] === '[id]' ? urlParts[urlParts.length - 1] : urlParts.pop();
    const barber = await prisma.user.findUnique({
      where: {
        id: id as string,
        role: 'barber'
      },
      select: {
        id: true,
        name: true,
        email: true,
        createdAt: true,
      }
    });
    if (!barber) {
      return NextResponse.json({ error: 'Barbeiro não encontrado' }, { status: 404 });
    }
    return NextResponse.json(barber);
  } catch (error) {
    console.error('Erro ao buscar barbeiro:', error);
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 });
  }
}

// PUT - Atualizar barbeiro
export async function PUT(request: NextRequest) {
  try {
    const urlParts = request.nextUrl.pathname.split('/');
    const id = urlParts[urlParts.length - 2] === '[id]' ? urlParts[urlParts.length - 1] : urlParts.pop();
    const body = await request.json();
    const { name, email, phone } = body;
    // Verificar se o barbeiro existe
    const existingBarber = await prisma.user.findUnique({
      where: { id: id as string, role: 'barber' }
    });
    if (!existingBarber) {
      return NextResponse.json({ error: 'Barbeiro não encontrado' }, { status: 404 });
    }
    // Verificar se o email já existe (excluindo o próprio barbeiro)
    if (email !== existingBarber.email) {
      const emailExists = await prisma.user.findUnique({
        where: { email }
      });
      if (emailExists) {
        return NextResponse.json({ error: 'Email já está em uso' }, { status: 400 });
      }
    }
    const updatedBarber = await prisma.user.update({
      where: { id: id as string },
      data: {
        name,
        email,
      },
      select: {
        id: true,
        name: true,
        email: true,
        createdAt: true
      }
    });
    return NextResponse.json(updatedBarber);
  } catch (error) {
    console.error('Erro ao atualizar barbeiro:', error);
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 });
  }
}

// DELETE - Deletar barbeiro
export async function DELETE(request: NextRequest) {
  try {
    const urlParts = request.nextUrl.pathname.split('/');
    const id = urlParts[urlParts.length - 2] === '[id]' ? urlParts[urlParts.length - 1] : urlParts.pop();
    // Verificar se o barbeiro existe
    const existingBarber = await prisma.user.findUnique({
      where: { id: id as string, role: 'barber' }
    });
    if (!existingBarber) {
      return NextResponse.json({ error: 'Barbeiro não encontrado' }, { status: 404 });
    }
    // Verificar se o barbeiro tem agendamentos futuros
    const futureAppointments = await prisma.appointment.findMany({
      where: {
        barberId: id as string,
        date: {
          gt: new Date()
        },
        status: 'confirmed'
      }
    });
    if (futureAppointments.length > 0) {
      return NextResponse.json({ 
        error: 'Não é possível deletar barbeiro com agendamentos futuros' 
      }, { status: 400 });
    }
    // Em vez de deletar, vamos desativar o barbeiro
    const deactivatedBarber = await prisma.user.update({
      where: { id: id as string },
      data: { role: 'inactive' },
      select: {
        id: true,
        name: true,
        email: true,
      }
    });
    return NextResponse.json({ 
      message: 'Barbeiro desativado com sucesso',
      barber: deactivatedBarber
    });
  } catch (error) {
    console.error('Erro ao deletar barbeiro:', error);
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 });
  }
}
