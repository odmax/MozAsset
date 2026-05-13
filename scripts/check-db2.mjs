import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
try {
  const assets = await prisma.asset.findMany({ select: { id: true, name: true, assetTag: true, organizationId: true, status: true } });
  console.log('=== ALL ASSETS ===');
  assets.forEach(a => console.log(JSON.stringify(a)));
  
  const categories = await prisma.category.findMany({ select: { id: true, name: true, organizationId: true } });
  console.log('\n=== ALL CATEGORIES ===');
  categories.forEach(c => console.log(JSON.stringify(c)));
  
  const departments = await prisma.department.findMany({ select: { id: true, name: true, organizationId: true } });
  console.log('\n=== ALL DEPARTMENTS ===');
  departments.forEach(d => console.log(JSON.stringify(d)));
  
  const vendors = await prisma.vendor.findMany({ select: { id: true, name: true, organizationId: true } });
  console.log('\n=== ALL VENDORS ===');
  vendors.forEach(v => console.log(JSON.stringify(v)));
  
  const auditLogs = await prisma.auditLog.findMany({ take: 5, orderBy: { createdAt: 'desc' }, select: { id: true, action: true, entityType: true, userId: true } });
  console.log('\n=== LAST 5 AUDIT LOGS ===');
  auditLogs.forEach(l => console.log(JSON.stringify(l)));
} finally {
  await prisma.$disconnect();
}
