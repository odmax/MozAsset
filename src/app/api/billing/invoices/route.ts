import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getSimpleUserSession } from '@/lib/customer-session';
import { getPayfastBaseUrl, createCheckoutPayload, getPayfastConfig, generateSignature } from '@/lib/payfast';
import type { Plan } from '@prisma/client';

export const dynamic = 'force-dynamic';

export async function GET() {
  const s = getSimpleUserSession();
  if (!s) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const invoices = await prisma.subscriptionInvoice.findMany({
    where: { userId: s.userId },
    orderBy: { createdAt: 'desc' },
    take: 20,
  });

  return NextResponse.json({ invoices });
}

export async function POST(request: Request) {
  const s = getSimpleUserSession();
  if (!s) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await request.json();
  const { action, invoiceId } = body;

  const invoice = await prisma.subscriptionInvoice.findUnique({ where: { id: invoiceId } });
  if (!invoice || invoice.userId !== s.userId) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  if (invoice.status === 'PAID') return NextResponse.json({ error: 'Already paid' }, { status: 400 });

  if (action === 'pay') {
    const user = await prisma.user.findUnique({ where: { id: s.userId }, select: { email: true, name: true } });
    const payload = createCheckoutPayload(s.userId, user?.email || '', user?.name || '', invoice.plan as Plan);
    const config = getPayfastConfig();
    payload.merchant_id = config.merchantId;
    payload.merchant_key = config.merchantKey;
    payload.return_url = `${config.returnUrl}?userId=${s.userId}&plan=${invoice.plan}`;
    payload.cancel_url = `${config.cancelUrl}?userId=${s.userId}`;
    payload.notify_url = `${config.itnUrl}?userId=${s.userId}`;
    payload.m_payment_id = invoice.invoiceNumber;
    payload.amount = String(Number(invoice.total));
    payload.signature = generateSignature(payload as any);

    await prisma.subscriptionInvoice.update({ where: { id: invoiceId }, data: { paymentReference: invoice.invoiceNumber, payNowUrl: getPayfastBaseUrl() + '/eng/process', status: 'PENDING_PAYMENT' } });

    return NextResponse.json({ checkoutUrl: getPayfastBaseUrl() + '/eng/process', checkoutData: payload });
  }

  return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
}
