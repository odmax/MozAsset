import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
try {
  const testOrgs = await prisma.organization.findMany({
    where: { name: { contains: 'Org' } },
    select: { id: true, name: true, ownerId: true },
  });
  
  for (const org of testOrgs) {
    if (!org.name.match(/Org[ABC]-\d{6}$/)) continue;
    console.log(`Cleaning: ${org.name}`);
    
    // Delete children first
    await prisma.asset.deleteMany({ where: { organizationId: org.id } });
    await prisma.category.deleteMany({ where: { organizationId: org.id } });
    await prisma.department.deleteMany({ where: { organizationId: org.id } });
    await prisma.vendor.deleteMany({ where: { organizationId: org.id } });
    
    // Disconnect user from org before deleting org
    await prisma.user.updateMany({ where: { organizationId: org.id }, data: { organizationId: null } });
    
    // Delete org (now ownerId FK will cascade — actually no cascade, need to delete user after org)
    // First set ownerId to null... can't, it's @unique and required
    // Instead: delete org first (but ownerId references User)
    // Actually: Organization.ownerId references User.id. Can't delete User while Org.ownerId points to it.
    // Solution: delete Org first — but org.ownerId FK prevents User deletion, not Org deletion.
    // However: deleting Org requires ownerId to be valid — which it is.
    // After Org deleted, we can delete the owner user.
    
    await prisma.organization.delete({ where: { id: org.id } });
    await prisma.user.deleteMany({ where: { id: org.ownerId } });
    console.log(`  Done: ${org.name}`);
  }
  
  // Also clean up any users created for testing without orgs
  const testUsers = await prisma.user.findMany({
    where: { email: { contains: '@test.com' } },
    select: { id: true, email: true },
  });
  if (testUsers.length > 0) {
    await prisma.user.deleteMany({ where: { id: { in: testUsers.map(u => u.id) } } });
    console.log(`Cleaned ${testUsers.length} test users`);
  }

  // Final check
  const remaining = {
    users: await prisma.user.count(),
    orgs: await prisma.organization.count(),
    assets: await prisma.asset.count(),
    categories: await prisma.category.count(),
    departments: await prisma.department.count(),
    vendors: await prisma.vendor.count(),
  };
  console.log('\nRemaining:', remaining);
} finally {
  await prisma.$disconnect();
}
