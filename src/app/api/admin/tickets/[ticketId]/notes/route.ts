import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getSimpleAdminSession } from '@/lib/admin-session';
import { hasPermission } from '@/lib/admin-permissions';

export async function GET(req: Request, { params }: { params: { ticketId: string } }) {
  const admin = getSimpleAdminSession();
  if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const dbAdmin = await prisma.internalAdmin.findUnique({ where: { id: admin.adminId }, select: { id: true, role: true, permissions: true } });
  if (!dbAdmin || !hasPermission(dbAdmin, 'tickets:view_internal_notes')) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const ticket = await prisma.supportTicket.findUnique({ where: { id: params.ticketId } });
  if (!ticket) return NextResponse.json({ error: 'Ticket not found' }, { status: 404 });

  const notes = await prisma.internalNote.findMany({
    where: { ticketId: params.ticketId },
    orderBy: { createdAt: 'desc' },
    select: {
      id: true,
      content: true,
      createdAt: true,
      updatedAt: true,
      author: {
        select: { id: true, name: true, email: true, role: true, avatar: true },
      },
    },
  });

  return NextResponse.json({ notes });
}

export async function POST(req: Request, { params }: { params: { ticketId: string } }) {
  const admin = getSimpleAdminSession();
  if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const dbAdmin = await prisma.internalAdmin.findUnique({
    where: { id: admin.adminId },
    select: { id: true, role: true, name: true, permissions: true },
  });
  if (!dbAdmin || !hasPermission(dbAdmin, 'tickets:add_internal_notes')) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const ticket = await prisma.supportTicket.findUnique({ where: { id: params.ticketId } });
  if (!ticket) return NextResponse.json({ error: 'Ticket not found' }, { status: 404 });

  const body = await req.json();
  if (!body.content || !body.content.trim()) {
    return NextResponse.json({ error: 'Content is required' }, { status: 400 });
  }

  const note = await prisma.internalNote.create({
    data: {
      ticketId: params.ticketId,
      authorId: dbAdmin.id,
      content: body.content.trim(),
    },
    select: {
      id: true,
      content: true,
      createdAt: true,
      author: {
        select: { id: true, name: true, email: true, role: true, avatar: true },
      },
    },
  });

  await prisma.auditLog.create({
    data: {
      action: 'INTERNAL_NOTE_ADDED',
      entityType: 'SupportTicket',
      entityId: params.ticketId,
      userId: dbAdmin.id,
      metadata: { authorId: dbAdmin.id, noteId: note.id },
    },
  });

  return NextResponse.json({ note }, { status: 201 });
}
