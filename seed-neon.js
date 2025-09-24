// Populando o banco Neon com dados de teste
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function seedDatabase() {
  try {
    console.log('🌱 Populando banco Neon com dados de teste...');
    
    // Criar serviços
    const services = [
      {
        name: 'Corte Masculino',
        description: 'Corte de cabelo masculino tradicional',
        price: 25.0,
        duration: 30,
        category: 'Corte'
      },
      {
        name: 'Barba',
        description: 'Aparar e modelar barba',
        price: 15.0,
        duration: 20,
        category: 'Barba'
      },
      {
        name: 'Corte + Barba',
        description: 'Pacote completo corte e barba',
        price: 35.0,
        duration: 45,
        category: 'Combo'
      }
    ];
    
    for (const serviceData of services) {
      const existingService = await prisma.service.findFirst({
        where: { name: serviceData.name }
      });
      
      if (!existingService) {
        await prisma.service.create({ data: serviceData });
        console.log(`✅ Serviço criado: ${serviceData.name}`);
      }
    }
    
    // Criar barbeiro
    const barberEmail = 'barbeiro@barberpro.com';
    const existingBarber = await prisma.user.findUnique({
      where: { email: barberEmail }
    });
    
    if (!existingBarber) {
      await prisma.user.create({
        data: {
          email: barberEmail,
          name: 'João Barbeiro',
          password: 'barber123',
          role: 'BARBER',
          phone: '(11) 98888-8888',
          isActive: true,
          specialties: ['Corte', 'Barba', 'Sobrancelha'],
          workDays: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'],
          workStartTime: '08:00',
          workEndTime: '18:00'
        }
      });
      console.log('✅ Barbeiro criado');
    }
    
    // Criar cliente
    const clientEmail = 'cliente@teste.com';
    const existingClient = await prisma.user.findUnique({
      where: { email: clientEmail }
    });
    
    if (!existingClient) {
      await prisma.user.create({
        data: {
          email: clientEmail,
          name: 'Cliente Teste',
          password: 'cliente123',
          role: 'CLIENT',
          phone: '(11) 97777-7777',
          isActive: true,
          specialties: [],
          workDays: []
        }
      });
      console.log('✅ Cliente criado');
    }
    
    // Resumo
    const userCount = await prisma.user.count();
    const serviceCount = await prisma.service.count();
    
    console.log(`🎉 Banco populado com sucesso!`);
    console.log(`   📊 Total de usuários: ${userCount}`);
    console.log(`   🔧 Total de serviços: ${serviceCount}`);
    
  } catch (error) {
    console.error('❌ Erro ao popular banco:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

seedDatabase();