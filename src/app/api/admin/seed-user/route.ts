import { NextResponse } from 'next/server';
import { hasPermission } from '@/lib/admin-permissions';
import { cookies } from 'next/headers';
import prisma from '@/lib/prisma';
import bcrypt from 'bcryptjs';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    const { email, password, name } = await request.json();

    const adminCookie = cookies().get('adminSession');
    if (!adminCookie?.value) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const decoded = JSON.parse(Buffer.from(adminCookie.value, 'base64').toString('utf-8'));
    if (!decoded.isInternalAdmin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const dbAdmin = await prisma.internalAdmin.findUnique({
      where: { id: decoded.id },
      select: { id: true, role: true, permissions: true },
    });
    if (!dbAdmin || !hasPermission(dbAdmin, 'users:edit')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      return NextResponse.json({ error: 'Email already exists' }, { status: 400 });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const result = await prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          name: name || email.split('@')[0],
          email,
          password: hashedPassword,
          role: 'SUPER_ADMIN',
          plan: 'FREE',
          assetLimit: 50,
          onBoardingComplete: true,
          isActive: true,
        },
      });

      const org = await tx.organization.create({
        data: {
          name: `${user.name}'s Organization`,
          ownerId: user.id,
        },
      });

      await tx.user.update({
        where: { id: user.id },
        data: { organizationId: org.id },
      });

      return { user, org };
    });

    return NextResponse.json({
      id: result.user.id,
      email: result.user.email,
      name: result.user.name,
      organizationId: result.org.id,
    });
  } catch (error) {
    console.error('Create user error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}