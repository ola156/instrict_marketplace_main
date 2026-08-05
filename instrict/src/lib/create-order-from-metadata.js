import { sendPushToTokens } from '@/lib/sendPush';
import { notifyAdminsOfActivity } from '@/lib/notifyAdmins';

function uuidOrNull(v) {
  if (v === null || v === undefined) return null;
  if (typeof v === 'string' && (v.trim() === '' || v === 'null' || v === 'undefined')) return null;
  return v;
}

export async function createOrderFromMetadata(supabase, reference, metadata) {
  // Unique constraint on payment_ref means a duplicate insert (webhook
  // and verify racing each other) fails cleanly instead of double-creating.
  const { data: order, error: orderError } = await supabase
    .from('orders')
    .insert({
      student_id: uuidOrNull(metadata.student_id),
      requester_id: uuidOrNull(metadata.requester_id),
      vendor_id: uuidOrNull(metadata.vendor_id),
      order_type: metadata.order_type,
      fulfillment_type: metadata.fulfillment_type,
      delivery_address: metadata.delivery_address,
      delivery_hostel: metadata.delivery_hostel,
      dropoff_zone_id: uuidOrNull(metadata.dropoff_zone_id),
      subtotal: metadata.subtotal,
      service_charge: metadata.service_charge,
      delivery_fee: metadata.delivery_fee,
      total: metadata.total,
      status: 'confirmed',
      payment_status: 'paid',
      payment_ref: reference,
      description: metadata.description,
      file_urls: metadata.file_urls,
    line_items: metadata.order_type === 'print' ? (metadata.line_items || []) : metadata.items,
    })
    .select()
    .single();

  if (orderError) {
    // 23505 = unique_violation on payment_ref — someone else (webhook or
    // verify) already created this order. Not a real failure, fetch it.
    if (orderError.code === '23505') {
      const { data: existing } = await supabase
        .from('orders')
        .select('*')
        .eq('payment_ref', reference)
        .single();
      return { order: existing, alreadyExisted: true };
    }
    throw orderError;
  }

 if (metadata.order_type !== 'print' && Array.isArray(metadata.items)) {
    const orderItems = metadata.items.map((i) => ({
      order_id: order.id,
      menu_item_id: uuidOrNull(i.id?.split('::')[1]),
      variant_id: uuidOrNull(i.meta?.variantId),
      name: i.name,
      unit_price: i.unitPrice,
      quantity: i.quantity,
      selected_extras: Array.isArray(i.meta?.extras) ? i.meta.extras : [],
    }));
    const { error: itemsError } = await supabase.from('order_items').insert(orderItems);
    if (itemsError) console.error('order_items insert error:', itemsError);

    // Decrement stock for every line that has a real variant. Canteen items
    // (no variantId) have no stock column to touch — skipped by design.
    for (const i of metadata.items) {
      const variantId = i.meta?.variantId;
      if (!variantId) continue;

      const { data: stockResult, error: stockError } = await supabase.rpc(
        'decrement_variant_stock',
        { p_variant_id: variantId, p_qty: i.quantity }
      );

      if (stockError) {
        console.error('[stock] decrement failed:', { variantId, qty: i.quantity, error: stockError });
        continue;
      }

      const updated = stockResult?.[0]?.updated_stock;
      if (updated !== undefined && updated < 0) {
        console.error('[stock] OVERSOLD:', {
          variantId,
          itemName: i.name,
          orderId: order.id,
          deficit: Math.abs(updated),
        });
        // Fire-and-forget admin alert so oversells get eyes on them fast.
        notifyAdminsOfActivity(supabase, {
          title: 'Oversold item',
          body: `${i.name} went ${Math.abs(updated)} below stock on order ${order.id}.`,
        }).catch((err) => console.error('[push] oversell alert error:', err));
      }
    }
  }

  // Fire notifications only once, for a genuinely new order — the 23505
  // branch above returns early on a duplicate, so this only runs on the
  // real insert path. Both are fire-and-forget: a push failure must never
  // block the checkout response.
  // Vendor notification fires here, at genuine order creation. Rider
  // notification does NOT — a fresh order isn't claimable yet (it still
  // has to go pending -> confirmed -> preparing -> ready), so that fires
  // separately from /api/orders/notify-ready once the vendor actually
  // marks it ready.
  notifyVendorOfNewOrder(supabase, order).catch((err) => console.error('[push] vendor notify error:', err));
  notifyAdminsOfActivity(supabase, {
    title: 'New order placed',
    body: `A new order worth ₦${order.subtotal.toLocaleString()} was just placed.`,
  }).catch((err) => console.error('[push] admin notify error:', err));

  return { order, alreadyExisted: false };
}

async function notifyVendorOfNewOrder(supabase, order) {
  if (!order.vendor_id) return;
  const { data: vendor } = await supabase
    .from('vendor_profiles')
    .select('fcm_token')
    .eq('user_id', order.vendor_id)
    .maybeSingle();

  if (!vendor?.fcm_token) return;

  await sendPushToTokens(
    supabase,
    [vendor.fcm_token],
    { title: 'New order received', body: `You've got a new order worth ₦${order.subtotal.toLocaleString()}.` },
    'vendor_profiles'
  );
}