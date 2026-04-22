import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const email = 'admin@example.com';
  
  const user = await prisma.user.findUnique({
    where: { email },
    select: { 
      id: true, 
      name: true, 
      email: true, 
      isPlatformAdmin: true,
      role: true,
      plan: true
    }
  });

  if (!user) {
    console.log('User not found');
    return;
  }

  console.log('Current user:', JSON.stringify(user, null, 2));

  if (!user.isPlatformAdmin) {
    console.log('\nUpdating isPlatformAdmin to true...');
    await prisma.user.update({
      where: { email },
      data: { isPlatformAdmin: true }
    });
    console.log('Done! isPlatformAdmin is now true');
  } else {
    console.log('\nisPlatformAdmin is already true');
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
