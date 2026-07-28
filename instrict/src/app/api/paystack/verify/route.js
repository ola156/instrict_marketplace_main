import { createClient } from '@/utils/supabase/server';
import { verifyTransaction } from '@/lib/paystack';
import { createOrderFromMetadata } from '@/lib/create-order-from-metadata';
import { NextResponse } from 'next/server';

export async function GET(req) {
  const supabase = await createClient();
  const { searchParams } = new URL(req.url);
  const reference = searchParams.get('reference');
  if (!reference) return NextResponse.json({ success: false }, { status: 400 });

  // Order might already exist if the webhook beat us here.
  const { data: existing } = await supabase
    .from('orders')
    .select('id')
    .eq('payment_ref', reference)
    .maybeSingle();

  if (existing) {
    return NextResponse.json({ success: true, orderId: existing.id });
  }

  try {
    const txn = await verifyTransaction(reference);
    if (txn.status !== 'success') {
      return NextResponse.json({ success: false });
    }

    const { order } = await createOrderFromMetadata(supabase, reference, txn.metadata);
    return NextResponse.json({ success: true, orderId: order.id });
  } catch (err) {
    console.error('verify error:', err);
    return NextResponse.json({ success: false }, { status: 500 });
  }
}