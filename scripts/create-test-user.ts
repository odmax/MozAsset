import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DATABASE_URL,
    },
  },
});

async function main() {
  const email = 'test@example.com';
  const password = 'password123';
  
  try {
    const existing = await prisma.user.findUnique({
      where: { email },
    });

    if (existing) {
      console.log('User already exists:', existing.email);
      console.log('Password hash exists:', !!existing.password);
      console.log('Is active:', existing.isActive);
      
      if (existing.password) {
        const isValid = await bcrypt.compare(password, existing.password);
        console.log('Password valid:', isValid);
      }
      return;
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await prisma.user.create({
      data: {
        name: 'Test User',
        email,
        password: hashedPassword,
        role: 'SUPER_ADMIN',
        plan: 'FREE',
        assetLimit: 50,
        onBoardingComplete: true,
        isActive: true,
      },
    });

    console.log('Created user:', user.email, 'with id:', user.id);
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

main();