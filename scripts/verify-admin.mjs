import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
try {
  // Verify admin routes still work: InternalAdmin table
  const admins = await prisma.internalAdmin.count();
  console.log(`Internal admins: ${admins}`);

  // Verify no assets have null orgId (data cleanliness)
  const nullOrgAssets = await prisma.asset.count({ where: { organizationId: null } });
  const nullOrgCats = await prisma.category.count({ where: { organizationId: null } });
  const nullOrgDepts = await prisma.department.count({ where: { organizationId: null } });
  const nullOrgVendors = await prisma.vendor.count({ where: { organizationId: null } });
  console.log(`\nData with null orgId:`);
  console.log(`  Assets: ${nullOrgAssets}`);
  console.log(`  Categories: ${nullOrgCats}`);
  console.log(`  Departments: ${nullOrgDepts}`);
  console.log(`  Vendors: ${nullOrgVendors}`);

  // Verify test data cleanup
  const totalAssets = await prisma.asset.count();
  const totalCats = await prisma.category.count();
  const totalDepts = await prisma.department.count();
  const totalVendors = await prisma.vendor.count();
  const totalUsers = await prisma.user.count();
  const totalOrgs = await prisma.organization.count();
  console.log(`\nFinal database state:`);
  console.log(`  Users: ${totalUsers}`);
  console.log(`  Orgs: ${totalOrgs}`);
  console.log(`  Assets: ${totalAssets}`);
  console.log(`  Categories: ${totalCats}`);
  console.log(`  Departments: ${totalDepts}`);
  console.log(`  Vendors: ${totalVendors}`);
} finally {
  await prisma.$disconnect();
}
