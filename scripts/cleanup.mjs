import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
try {
  // Find and delete test data (any org name containing date timestamp pattern)
  const testOrgs = await prisma.organization.findMany({
    where: { name: { contains: 'Org' } },
    select: { id: true, name: true },
  });
  
  for (const org of testOrgs) {
    // Check if this looks like test data
    if (org.name.match(/Org[ABC]-\d{6}$/)) {
      console.log(`Cleaning up: ${org.name} (${org.id})`);
      await prisma.asset.deleteMany({ where: { organizationId: org.id } });
      await prisma.category.deleteMany({ where: { organizationId: org.id } });
      await prisma.department.deleteMany({ where: { organizationId: org.id } });
      await prisma.vendor.deleteMany({ where: { organizationId: org.id } });
      const users = await prisma.user.findMany({ where: { organizationId: org.id }, select: { id: true } });
      await prisma.user.deleteMany({ where: { id: { in: users.map(u => u.id) } } });
      await prisma.organization.delete({ where: { id: org.id } });
      console.log(`  Cleaned up ${org.name}`);
    }
  }
  console.log('Done');
} finally {
  await prisma.$disconnect();
}
