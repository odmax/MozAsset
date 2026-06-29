import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getSimpleUserSession } from '@/lib/customer-session';

export const dynamic = 'force-dynamic';

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const s = getSimpleUserSession();
  if (!s) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const invoice = await prisma.subscriptionInvoice.findUnique({ where: { id: params.id } });
  if (!invoice || invoice.userId !== s.userId) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  return NextResponse.json({ invoice });
}
