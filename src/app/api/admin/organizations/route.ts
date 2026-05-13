import { NextResponse } from 'next/server';
import { getSimpleAdminSession } from '@/lib/admin-session';
import prisma from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET() {
  const admin = getSimpleAdminSession();

  if (!admin) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const organizations = await prisma.organization.findMany({
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        name: true,
        plan: true,
        createdAt: true,
        owner: {
          select: {
            name: true,
            email: true,
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
      plan: org.plan,
      createdAt: org.createdAt,
      owner: org.owner || { name: null, email: 'Unknown' },
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
