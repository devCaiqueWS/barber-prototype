import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  // Criar admin
  const hashedAdminPassword = await bcrypt.hash('admin123', 10)
  const admin = await prisma.user.upsert({
    where: { email: 'admin@barberpro.com' },
    update: {},
    create: {
      name: 'Administrador',
      email: 'admin@barberpro.com',
      password: hashedAdminPassword,
      role: 'ADMIN'
    }
  })

  // Criar barbeiros
  const hashedBarberPassword = await bcrypt.hash('barber123', 10)
  
  const barber1 = await prisma.user.upsert({
    where: { email: 'joao@barberpro.com' },
    update: {},
    create: {
      name: 'João Silva',
      email: 'joao@barberpro.com',
      password: hashedBarberPassword,
      role: 'BARBER'
    }
  })

  const barber2 = await prisma.user.upsert({
    where: { email: 'pedro@barberpro.com' },
    update: {},
    create: {
      name: 'Pedro Santos',
      email: 'pedro@barberpro.com',
      password: hashedBarberPassword,
      role: 'BARBER'
    }
  })

  const barber3 = await prisma.user.upsert({
    where: { email: 'carlos@barberpro.com' },
    update: {},
    create: {
      name: 'Carlos Oliveira',
      email: 'carlos@barberpro.com',
      password: hashedBarberPassword,
      role: 'BARBER'
    }
  })

  // Criar serviços
  const services = [
    {
      name: 'Corte Masculino',
      price: 25.0,
      duration: 30
    },
    {
      name: 'Barba',
      price: 15.0,
      duration: 20
    },
    {
      name: 'Corte + Barba',
      price: 35.0,
      duration: 45
    },
    {
      name: 'Cabelo e Sobrancelha',
      price: 30.0,
      duration: 40
    },
    {
      name: 'Degradê',
      price: 30.0,
      duration: 35
    },
    {
      name: 'Lavagem e Hidratação',
      price: 20.0,
      duration: 25
    }
  ]

  for (const service of services) {
    const existingService = await prisma.service.findFirst({
      where: { name: service.name }
    })

    if (!existingService) {
      await prisma.service.create({
        data: service
      })
    }
  }

  console.log('✅ Seed executado com sucesso!')
  console.log('👤 Admin criado: admin@barberpro.com (senha: admin123)')
  console.log('💇‍♂️ Barbeiros criados:')
  console.log('  - João Silva: joao@barberpro.com (senha: barber123)')
  console.log('  - Pedro Santos: pedro@barberpro.com (senha: barber123)')
  console.log('  - Carlos Oliveira: carlos@barberpro.com (senha: barber123)')
  console.log('✂️ Serviços criados:', services.length)
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })