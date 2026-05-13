import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
async function main() {
  try {
    const users = await prisma.user.findMany({
      where: { email: { in: ['free@mozassets.com','pro@mozassets.com','enterprise@mozassets.com'] } },
      select: { email: true, organizationId: true, plan: true, role: true, isActive: true, onBoardingComplete: true },
    });
    console.log('Users:', JSON.stringify(users, null, 2));
    const admin = await prisma.internalAdmin.findUnique({
      where: { email: 'Ademoyemo@gmail.com' },
      select: { email: true, role: true, isActive: true },
    });
    console.log('Admin:', JSON.stringify(admin, null, 2));
  } finally {
    await prisma.$disconnect();
  }
}
main();
