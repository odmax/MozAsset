import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
try {
  const users = await prisma.user.findMany({ select: { id: true, email: true, name: true, role: true, plan: true, organizationId: true } });
  console.log('=== USERS ===');
  users.forEach(u => console.log(JSON.stringify(u)));
  const orgs = await prisma.organization.findMany({ select: { id: true, name: true, ownerId: true } });
  console.log('\n=== ORGS ===');
  orgs.forEach(o => console.log(JSON.stringify(o)));
  const assets = await prisma.asset.count();
  console.log('\nTotal assets:', assets);
  const auditLogs = await prisma.auditLog.count();
  console.log('Total audit logs:', auditLogs);
} finally {
  await prisma.$disconnect();
}
