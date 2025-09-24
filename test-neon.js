// Teste de conexão com Neon PostgreSQL
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function testNeonConnection() {
  try {
    console.log('🔄 Testando conexão com Neon PostgreSQL...');
    
    // Teste 1: Contar usuários
    const userCount = await prisma.user.count();
    console.log(`✅ Usuários no banco: ${userCount}`);
    
    // Teste 2: Criar um usuário de teste se não existir
    const testUser = await prisma.user.findUnique({
      where: { email: 'admin@barberpro.com' }
    });
    
    if (!testUser) {
      const newUser = await prisma.user.create({
        data: {
          email: 'admin@barberpro.com',
          name: 'Administrador',
          password: 'admin123',
          role: 'ADMIN',
          phone: '(11) 99999-9999',
          isActive: true
        }
      });
      console.log('✅ Usuário admin criado:', newUser.name);
    } else {
      console.log('✅ Usuário admin já existe:', testUser.name);
    }
    
    // Teste 3: Listar todos os usuários
    const users = await prisma.user.findMany({
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        createdAt: true
      }
    });
    
    console.log('✅ Usuários encontrados:');
    users.forEach(user => {
      console.log(`  - ${user.name} (${user.email}) - ${user.role}`);
    });
    
    // Teste 4: Contar serviços
    const serviceCount = await prisma.service.count();
    console.log(`✅ Serviços no banco: ${serviceCount}`);
    
    // Teste 5: Contar agendamentos
    const appointmentCount = await prisma.appointment.count();
    console.log(`✅ Agendamentos no banco: ${appointmentCount}`);
    
    console.log('🎉 Conexão com Neon PostgreSQL funcionando perfeitamente!');
    
  } catch (error) {
    console.error('❌ Erro ao conectar com Neon:', error.message);
    console.error('Detalhes:', error);
  } finally {
    await prisma.$disconnect();
  }
}

testNeonConnection();