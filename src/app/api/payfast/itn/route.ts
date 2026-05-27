import { NextResponse } from 'next/server';
import { handleITN, updatePlanFromConfirmedPayment, getPayfastConfig } from '@/lib/payfast';
import prisma from '@/lib/prisma';
import { createNotification } from '@/lib/notifications';

export async function POST(request: Request) {
  try {
    const config = getPayfastConfig();
    
    if (!config.merchantId || !config.merchantKey) {
      console.error('Payfast not configured');
      return NextResponse.json({ error: 'Payment provider not configured' }, { status: 500 });
    }

    const formData = await request.formData();
    
    const paymentData = {
      m_payment_id: formData.get('m_payment_id')?.toString() || '',
      pf_payment_id: formData.get('pf_payment_id')?.toString() || '',
      payment_status: formData.get('payment_status')?.toString() || '',
      item_name: formData.get('item_name')?.toString() || '',
      item_description: formData.get('item_description')?.toString() || '',
      amount: formData.get('amount')?.toString() || '',
      custom_str1: formData.get('custom_str1')?.toString() || '',
      custom_str2: formData.get('custom_str2')?.toString() || '',
      custom_str3: formData.get('custom_str3')?.toString() || '',
      custom_int1: formData.get('custom_int1')?.toString() || '',
      name_first: formData.get('name_first')?.toString() || '',
      name_last: formData.get('name_last')?.toString() || '',
      email_address: formData.get('email_address')?.toString() || '',
    };

    const paymentRef = paymentData.m_payment_id;

    if (paymentData.payment_status === 'CANCELLED' || paymentData.payment_status === 'FAILED') {
      console.log('[Payfast ITN] Payment cancelled/failed:', paymentData.payment_status);

      const upgradeReq = await prisma.upgradeRequest.findFirst({
        where: { paymentReference: paymentRef, status: 'PENDING_PAYMENT' },
      });

      if (upgradeReq) {
        await prisma.upgradeRequest.update({
          where: { id: upgradeReq.id },
          data: { status: 'CANCELLED' },
        });

        createNotification({
          userId: upgradeReq.userId,
          type: 'BILLING_FAILED',
          title: 'Payment Cancelled',
          message: `Your ${upgradeReq.targetPlan} plan payment was cancelled or failed. Contact support for assistance.`,
          link: '/billing',
        }).catch(() => {});
      }

      return NextResponse.json({ success: true, message: 'Cancelled/failed payment noted' });
    }

    if (paymentData.payment_status !== 'COMPLETE') {
      console.log('[Payfast ITN] Skipping non-complete payment:', paymentData.payment_status);
      return NextResponse.json({ success: true, message: 'Payment not complete, ignored' });
    }

    const result = await handleITN(paymentData);

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    const updateResult = await updatePlanFromConfirmedPayment(
      result.userId!,
      result.plan!,
      paymentData.pf_payment_id
    );

    if (!updateResult.success) {
      return NextResponse.json({ error: updateResult.error }, { status: 500 });
    }

    return NextResponse.json({ success: true, message: 'Payment processed' });
  } catch (error) {
    console.error('Payfast ITN error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({ status: 'ok', message: 'Payfast ITN endpoint' });
}