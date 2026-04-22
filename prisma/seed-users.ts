import { PrismaClient, Role, Plan } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  const password = await bcrypt.hash('test123', 12);
  
  await prisma.user.upsert({
    where: { email: 'free@test.com' },
    update: {},
    create: { name: 'Free User', email: 'free@test.com', password, role: Role.SUPER_ADMIN, plan: Plan.FREE, isActive: true }
  });
  
  await prisma.user.upsert({
    where: { email: 'pro@test.com' },
    update: {},
    create: { name: 'Pro User', email: 'pro@test.com', password, role: Role.SUPER_ADMIN, plan: Plan.PRO, isActive: true, subscriptionStatus: 'ACTIVE' as any }
  });
  
  await prisma.user.upsert({
    where: { email: 'enterprise@test.com' },
    update: {},
    create: { name: 'Enterprise User', email: 'enterprise@test.com', password, role: Role.SUPER_ADMIN, plan: Plan.ENTERPRISE, isActive: true, subscriptionStatus: 'ACTIVE' as any }
  });
  
  console.log('Created test users:');
  console.log('- free@test.com / test123 (FREE plan)');
  console.log('- pro@test.com / test123 (PRO plan)');
  console.log('- enterprise@test.com / test123 (ENTERPRISE plan)');
  
  await prisma.$disconnect();
}

main().catch(console.error);