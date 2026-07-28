import { createClient } from '@/utils/supabase/server';
import { notifyRidersOfNewJob } from '@/lib/notifyRiders';
import { NextResponse } from 'next/server';

const TIMESTAMP_FIELD = {
  confirmed: 'accepted_at',
  ready: 'ready_at',
  picked_up: 'picked_up_at',
  cancelled: 'cancelled_at',
};

export async function POST(req) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

  const { orderId, newStatus } = await req.json();
  if (!orderId || !newStatus) {
    return NextResponse.json({ error: 'orderId and newStatus are required' }, { status: 400 });
  }

  // Confirm this order actually belongs to the requesting vendor before
  // touching it — this route runs with the user's own session, so RLS
  // on `orders` should already enforce this too, but checking explicitly
  // here means we can safely read fulfillment_type for the notify step
  // without a second implicit trust assumption.
  const { data: order, error: fetchError } = await supabase
    .from('orders')
    .select('id, vendor_id, fulfillment_type, status')
    .eq('id', orderId)
    .single();

  if (fetchError || !order) {
    return NextResponse.json({ error: 'Order not found' }, { status: 404 });
  }
  if (order.vendor_id !== user.id) {
    return NextResponse.json({ error: 'Not your order' }, { status: 403 });
  }

  const update = { status: newStatus };
  const timestampField = TIMESTAMP_FIELD[newStatus];
  if (timestampField) update[timestampField] = new Date().toISOString();

  const { error: updateError } = await supabase.from('orders').update(update).eq('id', orderId);
  if (updateError) {
    console.error('Failed to update order status:', updateError.message);
    return NextResponse.json({ error: 'Could not update order' }, { status: 500 });
  }

  // Only notify riders on the actual "ready for pickup" transition, and
  // only for delivery orders — a pickup order never needs a rider at all.
  if (newStatus === 'ready' && order.fulfillment_type === 'delivery') {
    notifyRidersOfNewJob(supabase, {
      title: 'New job available',
      body: 'A new delivery is ready for pickup — open the app to claim it.',
    }).catch((err) => console.error('[push] rider notify error:', err));
  }

  return NextResponse.json({ success: true });
}