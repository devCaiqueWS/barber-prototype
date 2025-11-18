import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  // Criar admin
  const hashedAdminPassword = await bcrypt.hash('admin123', 10)
  await prisma.user.upsert({
    where: { email: 'admin@barberpro.com' },
    update: {},
    create: {
      name: 'Administrador',
      email: 'admin@barberpro.com',
      password: hashedAdminPassword,
      role: 'ADMIN',
    },
  })

  // Criar barbeiros padrão
  const hashedBarberPassword = await bcrypt.hash('barber123', 10)

  const barbers = [
    { name: 'João Silva', email: 'joao@barberpro.com' },
    { name: 'Pedro Santos', email: 'pedro@barberpro.com' },
    { name: 'Carlos Oliveira', email: 'carlos@barberpro.com' },
  ]

  for (const barber of barbers) {
    await prisma.user.upsert({
      where: { email: barber.email },
      update: {},
      create: {
        name: barber.name,
        email: barber.email,
        password: hashedBarberPassword,
        role: 'BARBER',
      },
    })
  }

  // Criar serviços oficiais da barbearia
  const services = [
    {
      name: 'Sobrancelhas',
      description: 'Design e ajuste de sobrancelhas',
      price: 5.0,
      duration: 5,
      category: 'Sobrancelhas',
    },
    {
      name: 'Pigmentação de Sobrancelhas',
      description: 'Pigmentação para realçar as sobrancelhas',
      price: 5.0,
      duration: 5,
      category: 'Sobrancelhas',
    },
    {
      name: 'Pézinho',
      description: 'Acabamento nas laterais e nuca',
      price: 10.0,
      duration: 5,
      category: 'Cabelo',
    },
    {
      name: 'Barba Comum',
      description: 'Barba tradicional com toalha quente',
      price: 15.0,
      duration: 15,
      category: 'Barba',
    },
    {
      name: 'Pigmentação de Barba',
      description: 'Pigmentação para realçar a barba',
      price: 15.0,
      duration: 15,
      category: 'Barba',
    },
    {
      name: 'Raspagem de Cabelo',
      description: 'Raspagem completa com máquina',
      price: 15.0,
      duration: 15,
      category: 'Cabelo',
    },
    {
      name: 'Coloração (a partir de)',
      description: 'Coloração de cabelo (valores adicionais no local)',
      price: 20.0,
      duration: 30,
      category: 'Coloração',
    },
    {
      name: 'Corte Simples',
      description: 'Corte masculino simples',
      price: 25.0,
      duration: 40,
      category: 'Cabelo',
    },
    {
      name: 'Pigmentação de Corte',
      description: 'Pigmentação para realçar o corte',
      price: 25.0,
      duration: 20,
      category: 'Coloração',
    },
    {
      name: 'Penteado (Escovação, Selagem, Finalização)',
      description: 'Penteado completo com finalização',
      price: 25.0,
      duration: 30,
      category: 'Cabelo',
    },
    {
      name: 'Alisamento',
      description: 'Alisamento de cabelo',
      price: 30.0,
      duration: 20,
      category: 'Química',
    },
    {
      name: 'Luzes',
      description: 'Luzes no cabelo',
      price: 45.0,
      duration: 90,
      category: 'Coloração',
    },
    {
      name: 'Limpeza de Pele',
      description: 'Tratamento de limpeza de pele',
      price: 50.0,
      duration: 30, // tempo padrão provisório
      category: 'Estética',
    },
    {
      name: 'Progressiva',
      description: 'Progressiva para alinhamento dos fios',
      price: 60.0,
      duration: 60,
      category: 'Química',
    },
    {
      name: 'Platinado (a partir de)',
      description: 'Platinado completo (valores adicionais no local)',
      price: 80.0,
      duration: 90,
      category: 'Coloração',
    },
  ]

  for (const service of services) {
    const existing = await prisma.service.findFirst({
      where: { name: service.name },
    })

    if (existing) {
      await prisma.service.update({
        where: { id: existing.id },
        data: {
          price: service.price,
          duration: service.duration,
          description: service.description,
          category: service.category,
          isActive: true,
        },
      })
    } else {
      await prisma.service.create({
        data: {
          ...service,
          isActive: true,
        },
      })
    }
  }

  console.log('Seed executado com sucesso!')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
