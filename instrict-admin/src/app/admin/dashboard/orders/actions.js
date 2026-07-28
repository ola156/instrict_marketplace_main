'use server';

import { createAdminClient } from '@/utils/supabase/admin';
import { requireAdmin } from '@/lib/require-admin';
import { revalidatePath } from 'next/cache';

// Admin force-cancel. Distinct from a normal student/vendor cancellation —
// this can happen at any status (stuck 'preparing', unresponsive rider, etc).
export async function forceCancelOrder(orderId, reason) {
  await requireAdmin();

  if (!reason || !reason.trim()) {
    throw new Error('A cancellation reason is required.');
  }

  const supabase = createAdminClient();

  const { error } = await supabase
    .from('orders')
    .update({
      status: 'cancelled',
      cancelled_at: new Date().toISOString(),
      note: reason.trim(),
    })
    .eq('id', orderId);

  if (error) throw new Error(error.message);
  revalidatePath('/admin/dashboard/orders');
}

// Manual override only — this does NOT call Paystack's refund API. Payments
// integration hasn't been built yet, so this just corrects the record while
// the actual refund is handled outside the system for now. Revisit once
// Paystack refund flow exists.
export async function markOrderRefunded(orderId) {
  await requireAdmin();
  const supabase = createAdminClient();

  const { error } = await supabase
    .from('orders')
    .update({ payment_status: 'refunded' })
    .eq('id', orderId);

  if (error) throw new Error(error.message);
  revalidatePath('/admin/dashboard/orders');
}

// Clears a stuck rider assignment so the order can be reassigned (e.g. a
// rider claimed a job and went silent). Does not auto-assign a new rider —
// that still needs to happen through the normal rider-claim flow, this
// just frees the order back up.
export async function unassignRider(orderId) {
  await requireAdmin();
  const supabase = createAdminClient();

  const { error } = await supabase
    .from('orders')
    .update({ rider_id: null, status: 'ready' })
    .eq('id', orderId);

  if (error) throw new Error(error.message);
  revalidatePath('/admin/dashboard/orders');
}