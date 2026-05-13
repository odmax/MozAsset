import { PrismaClient } from '@prisma/client';
const p = new PrismaClient();
try {
  const testUsers = await p.user.findMany({ where: { email: { contains: '@test.com' } }, select: { id: true, email: true } });
  console.log('Test users remaining:', testUsers.length);
  if (testUsers.length > 0) {
    // These might already have orgs deleted, so safe to delete now
    await p.user.deleteMany({ where: { id: { in: testUsers.map(u => u.id) } } });
    console.log('Deleted remaining test users');
  }
  console.log('\n=== FINAL DATABASE STATE ===');
  console.log('Users:', await p.user.count());
  console.log('Orgs:', await p.organization.count());
  console.log('Assets:', await p.asset.count());
  console.log('Categories:', await p.category.count());
  console.log('Depts:', await p.department.count());
  console.log('Vendors:', await p.vendor.count());
  console.log('InternalAdmins:', await p.internalAdmin.count());
} finally {
  await p.$disconnect();
}
