import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function PATCH(request: Request) {
  try {
    const { adminId, isActive, role } = await request.json();

    if (!adminId) {
      return NextResponse.json({ error: 'Admin ID required' }, { status: 400 });
    }

    const updateData: Record<string, unknown> = {};

    if (typeof isActive === 'boolean') {
      updateData.isActive = isActive;
    }

    if (role) {
      updateData.role = role;
    }

    const admin = await prisma.internalAdmin.update({
      where: { id: adminId },
      data: updateData,
    });

    return NextResponse.json({
      id: admin.id,
      email: admin.email,
      name: admin.name,
      role: admin.role,
      isActive: admin.isActive,
    });
  } catch (error) {
    console.error('Update admin error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}