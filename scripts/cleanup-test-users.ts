import { PrismaClient } from '@prisma/client';

const p = new PrismaClient();

async function main() {
  const emails = ['free@test.com', 'pro@test.com', 'enterprise@test.com'];

  for (const email of emails) {
    const user = await p.user.findUnique({
      where: { email },
      select: { id: true, organizationId: true, ownedOrganization: { select: { id: true } } },
    });
    if (!user) { console.log(`Skipping ${email}: not found`); continue; }

    const id = user.id;

    await p.account.deleteMany({ where: { userId: id } });
    await p.session.deleteMany({ where: { userId: id } });
    await p.notification.deleteMany({ where: { userId: id } });
    await p.supportTicket.deleteMany({ where: { userId: id } });
    await p.file.deleteMany({ where: { uploadedById: id } });
    await p.payment.deleteMany({ where: { userId: id } });
    await p.invoice.deleteMany({ where: { userId: id } });
    await p.auditLog.deleteMany({ where: { userId: id } });
    await p.department.updateMany({ where: { managerId: id }, data: { managerId: null } });
    const assets = await p.asset.findMany({ where: { assignedToId: id }, select: { id: true } });
    for (const a of assets) {
      await p.asset.update({ where: { id: a.id }, data: { assignedToId: null, status: 'AVAILABLE' } });
    }
    await p.assetAssignment.deleteMany({ where: { userId: id } });
    await p.maintenance.deleteMany({ where: { performedBy: id } });

    if (user.ownedOrganization) {
      const oid = user.ownedOrganization.id;
      await p.department.deleteMany({ where: { organizationId: oid } });
      await p.location.deleteMany({ where: { organizationId: oid } });
      await p.category.deleteMany({ where: { organizationId: oid } });
      await p.vendor.deleteMany({ where: { organizationId: oid } });
      await p.file.deleteMany({ where: { organizationId: oid } });
      await p.asset.updateMany({ where: { organizationId: oid }, data: { organizationId: null } });
      await p.organization.delete({ where: { id: oid } });
    }

    await p.user.delete({ where: { id } });
    console.log(`Deleted ${email}`);
  }

  await p.$disconnect();
  console.log('Done');
}

main().catch((e) => { console.error(e); p.$disconnect(); });
