import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getSimpleUserSession } from '@/lib/customer-session';
import { canAccessEnterpriseFeature } from '@/lib/billing';
import { generateAssetTag } from '@/lib/utils';
export const dynamic = 'force-dynamic';

export async function POST(_req: Request, { params }: { params: { id: string } }) {
  const s = getSimpleUserSession();
  if (!s) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (!canAccessEnterpriseFeature(s.plan as any)) return NextResponse.json({ error: 'Enterprise plan required', code: 'UPGRADE_REQUIRED' }, { status: 402 });
  const orgId = s.organizationId; if (!orgId) return NextResponse.json({ error: 'No organization' }, { status: 400 });

  const po = await prisma.purchaseOrder.findUnique({ where: { id: params.id }, include: { items: true } });
  if (!po || po.organizationId !== orgId) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const toCreate = [];
  for (const item of po.items) {
    for (let i = 0; i < item.receivedQuantity; i++) {
      toCreate.push({
        name: item.description || `Asset from PO ${po.poNumber}`,
        assetTag: generateAssetTag('AST'),
        organizationId: orgId,
        vendorId: po.vendorId,
        purchaseCost: item.unitPrice ? Number(item.unitPrice) : null,
        poNumber: po.poNumber,
        orderedDate: po.orderDate,
        receivedDate: po.receivedDate || new Date(),
        status: 'AVAILABLE' as any,
        condition: 'NEW' as any,
      });
    }
  }

  if (toCreate.length === 0) return NextResponse.json({ error: 'No received items to create assets from' }, { status: 400 });
  await prisma.asset.createMany({ data: toCreate });

  await prisma.auditLog.create({ data: { action: 'CREATE' as any, entityType: 'Asset', entityId: po.id, userId: s.userId, changes: { action: 'created_from_po', poNumber: po.poNumber, count: toCreate.length } } }).catch(() => {});

  return NextResponse.json({ success: true, assetsCreated: toCreate.length });
}
