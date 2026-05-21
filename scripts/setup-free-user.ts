import { PrismaClient, Role, Plan } from '@prisma/client';
import bcrypt from 'bcryptjs';

const p = new PrismaClient();

async function main() {
  const password = await bcrypt.hash('test123', 12);

  const user = await p.user.upsert({
    where: { email: 'free@test.com' },
    update: {},
    create: {
      name: 'Free User',
      email: 'free@test.com',
      password,
      role: Role.SUPER_ADMIN,
      plan: Plan.FREE,
      isActive: true,
    },
  });

  // Create an org if none exists
  if (!user.organizationId) {
    const org = await p.organization.create({
      data: {
        name: 'Free User Org',
        ownerId: user.id,
      },
    });
    await p.user.update({
      where: { id: user.id },
      data: { organizationId: org.id },
    });
    console.log('Created organization:', org.name);
  }

  console.log('Free user ready: free@test.com / test123');
  await p.$disconnect();
}

main().catch((e) => { console.error(e); p.$disconnect(); });
