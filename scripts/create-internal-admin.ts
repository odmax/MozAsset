import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  const email = 'admin@example.com';
  const password = 'password123';
  
  const existing = await prisma.internalAdmin.findUnique({
    where: { email },
  });

  if (existing) {
    console.log('Admin already exists');
    return;
  }

  const hashedPassword = await bcrypt.hash(password, 10);

  const admin = await prisma.internalAdmin.create({
    data: {
      email,
      name: 'System Admin',
      password: hashedPassword,
      role: 'OWNER',
      isActive: true,
    },
  });

  console.log('Created admin:', admin.email, 'with role:', admin.role);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());