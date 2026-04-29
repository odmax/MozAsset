import { NextResponse } from 'next/server';
import { getCurrentUserContext } from '@/lib/user-context';
import prisma from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET() {
  const context = await getCurrentUserContext();
  
  if (!context?.isPlatformAdmin && !context?.isInternalAdmin) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }

  try {
    const organizations = await prisma.organization.findMany({
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        name: true,
        createdAt: true,
        owner: {
          select: {
            name: true,
            email: true,
            plan: true,
          },
        },
        _count: {
          select: {
            users: true,
            assets: true,
            locations: true,
            departments: true,
          },
        },
      },
    });

    const formatted = organizations.map(org => ({
      id: org.id,
      name: org.name,
      code: '',
      createdAt: org.createdAt,
      owner: org.owner || { name: null, email: 'Unknown', plan: 'FREE' },
      _count: {
        users: org._count.users,
        assets: org._count.assets,
        locations: org._count.locations,
        departments: org._count.departments,
      },
    }));

    return NextResponse.json(formatted);
  } catch (error) {
    console.error('Admin organizations GET error:', error);
    return NextResponse.json({ error: 'Failed to fetch organizations' }, { status: 500 });
  }
}
