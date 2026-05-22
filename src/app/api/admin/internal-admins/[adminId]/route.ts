import { NextResponse } from 'next/server';
import { hasPermission, CREATABLE_ROLES, canManageAgent, canModifyOwner } from '@/lib/admin-permissions';
import { cookies } from 'next/headers';
import prisma from '@/lib/prisma';
import { InternalRole } from '@prisma/client';

function getAdminSession() {
  const adminCookie = cookies().get('adminSession');
  if (adminCookie?.value) {
    try {
      const decoded = Buffer.from(adminCookie.value, 'base64').toString('utf-8');
      return JSON.parse(decoded);
    } catch { return null; }
  }
  return null;
}

export const dynamic = 'force-dynamic';

// GET - Get single admin
export async function GET(
  request: Request,
  { params }: { params: { adminId: string } }
) {
  const admin = getAdminSession();
  if (!admin?.isInternalAdmin) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }

  const dbAdmin = await prisma.internalAdmin.findUnique({
    where: { id: admin.id },
    select: { id: true, role: true, permissions: true },
  });
  if (!dbAdmin || !hasPermission(dbAdmin, 'agents:read')) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  try {
    const adminUser = await prisma.internalAdmin.findUnique({
      where: { id: params.adminId },
      select: { id: true, name: true, email: true, role: true, isActive: true, lastLogin: true, createdAt: true }
    });
    
    if (!adminUser) {
      return NextResponse.json({ error: 'Admin not found' }, { status: 404 });
    }
    
    return NextResponse.json(adminUser);
  } catch (error) {
    console.error('[internal-admins] Error:', error);
    return NextResponse.json({ error: 'Failed to fetch admin' }, { status: 500 });
  }
}

// PUT - Update admin (role, isActive)
export async function PUT(
  request: Request,
  { params }: { params: { adminId: string } }
) {
  const admin = getAdminSession();
  if (!admin?.isInternalAdmin) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }

  const dbAdmin = await prisma.internalAdmin.findUnique({
    where: { id: admin.id },
    select: { id: true, role: true, permissions: true },
  });
  if (!dbAdmin || !hasPermission(dbAdmin, 'admins:manage')) {
    return NextResponse.json({ error: 'Only admins with admin management permission can update admins' }, { status: 403 });
  }

  const targetAdmin = await prisma.internalAdmin.findUnique({
    where: { id: params.adminId },
    select: { id: true, role: true },
  });
  if (!targetAdmin) {
    return NextResponse.json({ error: 'Admin not found' }, { status: 404 });
  }

  // OWNER cannot be modified by anyone except themselves (and only OWNER can modify OWNER)
  if (targetAdmin.role === 'OWNER' && !canModifyOwner(dbAdmin)) {
    return NextResponse.json({ error: 'Cannot modify Owner account' }, { status: 403 });
  }

  // Must be able to manage the target
  if (!canManageAgent(dbAdmin, targetAdmin)) {
    return NextResponse.json({ error: 'Cannot manage this admin' }, { status: 403 });
  }

  try {
    const { role, isActive } = await request.json();
    
    if (role) {
      if (!CREATABLE_ROLES.includes(role as InternalRole) && role !== 'OWNER') {
        return NextResponse.json({ error: 'Invalid role' }, { status: 400 });
      }
      // Only OWNER can assign OWNER role
      if (role === 'OWNER' && !canModifyOwner(dbAdmin)) {
        return NextResponse.json({ error: 'Only owner can assign Owner role' }, { status: 403 });
      }
      // Only OWNER/PLATFORM_ADMIN can assign PLATFORM_ADMIN role
      if (role === 'PLATFORM_ADMIN' && dbAdmin.role !== 'OWNER' && dbAdmin.role !== 'PLATFORM_ADMIN' && dbAdmin.role !== 'SUPER_ADMIN') {
        return NextResponse.json({ error: 'Cannot assign Platform Admin role' }, { status: 403 });
      }
      // SUPPORT_MANAGER can only assign SUPPORT_AGENT and VIEWER
      if (dbAdmin.role === 'SUPPORT_MANAGER' && !['SUPPORT_AGENT', 'VIEWER'].includes(role)) {
        return NextResponse.json({ error: 'Support Managers can only assign Support Agent and Viewer roles' }, { status: 403 });
      }
    }

    const data: any = {};
    if (role) data.role = role;
    if (isActive !== undefined) data.isActive = isActive;

    const updated = await prisma.internalAdmin.update({
      where: { id: params.adminId },
      data,
      select: { id: true, name: true, email: true, role: true, isActive: true }
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error('[internal-admins] Error:', error);
    return NextResponse.json({ error: 'Failed to update admin' }, { status: 500 });
  }
}

// DELETE - Deactivate/delete admin
export async function DELETE(
  request: Request,
  { params }: { params: { adminId: string } }
) {
  const admin = getAdminSession();
  if (!admin?.isInternalAdmin) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }

  const dbAdmin = await prisma.internalAdmin.findUnique({
    where: { id: admin.id },
    select: { id: true, role: true, permissions: true },
  });
  if (!dbAdmin || !hasPermission(dbAdmin, 'admins:manage')) {
    return NextResponse.json({ error: 'Only admins with admin management permission can delete admins' }, { status: 403 });
  }

  // Prevent deleting yourself
  if (admin.id === params.adminId) {
    return NextResponse.json({ error: 'Cannot delete yourself' }, { status: 400 });
  }

  const targetAdmin = await prisma.internalAdmin.findUnique({
    where: { id: params.adminId },
    select: { id: true, role: true },
  });
  if (!targetAdmin) {
    return NextResponse.json({ error: 'Admin not found' }, { status: 404 });
  }

  // OWNER cannot be deleted
  if (targetAdmin.role === 'OWNER' && !canModifyOwner(dbAdmin)) {
    return NextResponse.json({ error: 'Cannot delete Owner account' }, { status: 403 });
  }

  // Must be able to manage the target
  if (!canManageAgent(dbAdmin, targetAdmin)) {
    return NextResponse.json({ error: 'Cannot manage this admin' }, { status: 403 });
  }

  try {
    await prisma.internalAdmin.delete({
      where: { id: params.adminId }
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[internal-admins] Error:', error);
    return NextResponse.json({ error: 'Failed to delete admin' }, { status: 500 });
  }
}
