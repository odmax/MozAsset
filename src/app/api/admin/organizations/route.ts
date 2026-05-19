import { NextResponse } from 'next/server';
import { getSimpleAdminSession } from '@/lib/admin-session';
import { hasPermission } from '@/lib/admin-permissions';
import prisma from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET() {
  const admin = getSimpleAdminSession();

  if (!admin) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const dbAdmin = await prisma.internalAdmin.findUnique({
    where: { id: admin.adminId },
    select: { id: true, role: true, permissions: true },
  });
  if (!dbAdmin || !hasPermission(dbAdmin, 'organizations:read')) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  try {
    const organizations = await prisma.organization.findMany({
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        name: true,
        orgEmail: true,
        phone: true,
        addressLine1: true,
        city: true,
        province: true,
        country: true,
        industry: true,
        companySize: true,
        logo: true,
        plan: true,
        createdAt: true,
        owner: {
          select: {
            id: true,
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
      orgEmail: org.orgEmail,
      phone: org.phone,
      addressLine1: org.addressLine1,
      city: org.city,
      province: org.province,
      country: org.country,
      industry: org.industry,
      companySize: org.companySize,
      logo: org.logo,
      plan: org.plan,
      createdAt: org.createdAt,
      owner: org.owner || { id: '', name: null, email: 'Unknown' },
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
