import { NextResponse } from 'next/server';
import { handleITN, updatePlanFromConfirmedPayment, getPayfastConfig } from '@/lib/payfast';

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
      custom_int1: formData.get('custom_int1')?.toString() || '',
      name_first: formData.get('name_first')?.toString() || '',
      name_last: formData.get('name_last')?.toString() || '',
      email_address: formData.get('email_address')?.toString() || '',
    };

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