import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getCurrentUserContext } from '@/lib/user-context';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const context = await getCurrentUserContext();
    if (!context) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const page = Math.max(1, parseInt(searchParams.get('page') || '1'));
    const limit = Math.min(50, Math.max(1, parseInt(searchParams.get('limit') || '20')));
    const type = searchParams.get('type');
    const assetId = searchParams.get('assetId');
    const maintenanceId = searchParams.get('maintenanceId');
    const supportTicketId = searchParams.get('supportTicketId');

    const where: Record<string, unknown> = {};
    if (!context.isInternalAdmin) {
      where.organizationId = context.organizationId || 'never-match';
    }
    if (type) where.type = type;
    if (assetId) where.assetId = assetId;
    if (maintenanceId) where.maintenanceId = maintenanceId;
    if (supportTicketId) where.supportTicketId = supportTicketId;

    const [files, total] = await Promise.all([
      prisma.file.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.file.count({ where }),
    ]);

    return NextResponse.json({
      files,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    });
  } catch (error) {
    console.error('List files error:', error);
    return NextResponse.json({ error: 'Failed to list files' }, { status: 500 });
  }
}
