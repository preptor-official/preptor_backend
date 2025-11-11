const prisma = require('./src/lib/prisma');

async function testConnection() {
  try {
    console.log('🔍 Testing database connection...\n');
    
    // Test 1: Database connection
    await prisma.$connect();
    console.log('✅ Database connected successfully!\n');
    
    // Test 2: Create a test user
    const user = await prisma.user.create({
      data: {
        email: 'test@preptorai.com',
        name: 'Test User',
        role: 'STUDENT',
      },
    });
    console.log('✅ Test user created:', user, '\n');
    
    // Test 3: Fetch all users
    const allUsers = await prisma.user.findMany();
    console.log('✅ All users in database:', allUsers, '\n');
    
    console.log('🎉 All tests passed! Database is ready!\n');
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

testConnection();