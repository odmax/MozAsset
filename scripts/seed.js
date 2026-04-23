const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

const testUsers = [
  {
    email: 'free@mozassets.com',
    name: 'Free User',
    password: 'Password123!',
    plan: 'FREE',
    role: 'SUPER_ADMIN',
    onBoardingComplete: true,
    isActive: true,
  },
  {
    email: 'pro@mozassets.com',
    name: 'Pro User',
    password: 'Password123!',
    plan: 'PRO',
    role: 'SUPER_ADMIN',
    onBoardingComplete: true,
    isActive: true,
  },
  {
    email: 'enterprise@mozassets.com',
    name: 'Enterprise User',
    password: 'Password123!',
    plan: 'ENTERPRISE',
    role: 'SUPER_ADMIN',
    onBoardingComplete: true,
    isActive: true,
  },
];

const platformAdmin = {
  email: 'Ademoyemo@gmail.com',
  name: 'Ademoye Admin',
  password: 'Greenmoneys10@',
  role: 'OWNER',
  isActive: true,
};

async function main() {
  console.log('Starting seed...\n');

  for (const userData of testUsers) {
    const hashedPassword = await bcrypt.hash(userData.password, 12);
    
    const existing = await prisma.user.findUnique({ where: { email: userData.email } });
    
    if (existing) {
      await prisma.user.update({
        where: { email: userData.email },
        data: {
          name: userData.name,
          password: hashedPassword,
          plan: userData.plan,
          role: userData.role,
          onBoardingComplete: userData.onBoardingComplete,
          isActive: userData.isActive,
          isPlatformAdmin: false,
        },
      });
      console.log(`Updated: ${userData.email} (${userData.plan})`);
    } else {
      await prisma.user.create({
        data: {
          email: userData.email,
          name: userData.name,
          password: hashedPassword,
          plan: userData.plan,
          role: userData.role,
          onBoardingComplete: userData.onBoardingComplete,
          isActive: userData.isActive,
          isPlatformAdmin: false,
        },
      });
      console.log(`Created: ${userData.email} (${userData.plan})`);
    }
  }

  const hashedAdminPassword = await bcrypt.hash(platformAdmin.password, 12);
  
  const existingAdmin = await prisma.internalAdmin.findUnique({ 
    where: { email: platformAdmin.email } 
  });

  if (existingAdmin) {
    await prisma.internalAdmin.update({
      where: { email: platformAdmin.email },
      data: {
        name: platformAdmin.name,
        password: hashedAdminPassword,
        role: platformAdmin.role,
        isActive: platformAdmin.isActive,
      },
    });
    console.log(`Updated: InternalAdmin ${platformAdmin.email}`);
  } else {
    await prisma.internalAdmin.create({
      data: {
        email: platformAdmin.email,
        name: platformAdmin.name,
        password: hashedAdminPassword,
        role: platformAdmin.role,
        isActive: platformAdmin.isActive,
      },
    });
    console.log(`Created: InternalAdmin ${platformAdmin.email}`);
  }

  console.log('\n--- Verifying Users ---');
  const users = await prisma.user.findMany({
    where: { email: { in: testUsers.map(u => u.email) } },
    select: { name: true, email: true, plan: true, role: true, isActive: true, onBoardingComplete: true },
  });
  users.forEach(u => console.log(`${u.name} | ${u.email} | ${u.plan} | ${u.role} | Active: ${u.isActive}`));

  console.log('\n--- Verifying InternalAdmin ---');
  const admin = await prisma.internalAdmin.findUnique({
    where: { email: platformAdmin.email },
    select: { name: true, email: true, role: true, isActive: true },
  });
  console.log(`${admin.name} | ${admin.email} | ${admin.role} | Active: ${admin.isActive}`);

  console.log('\nSeed complete!');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());