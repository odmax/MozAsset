import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getSimpleUserSession } from '@/lib/customer-session';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const session = getSimpleUserSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const orgId = session.organizationId;
  if (!orgId) return NextResponse.json({ error: 'No organization' }, { status: 400 });

  const url = new URL(request.url);
  const search = url.searchParams.get('search') || '';

  const assets = await prisma.asset.findMany({
    where: {
      organizationId: orgId,
      OR: [
        { assetTag: { equals: search, mode: 'insensitive' } },
        { name: { contains: search, mode: 'insensitive' } },
      ],
    },
    select: {
      id: true, assetTag: true, name: true, status: true, condition: true,
      category: { select: { name: true } }, location: { select: { name: true } },
    },
    take: 5,
  });

  return NextResponse.json({ assets });
}
