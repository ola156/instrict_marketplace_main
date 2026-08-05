import { createClient } from '@/utils/supabase/server';
import { initializeTransaction } from '@/lib/paystack';
import { NextResponse } from 'next/server';
import { randomUUID } from 'crypto';

const SERVICE_CHARGE_PERCENT = 3;

export async function POST(req) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

  const body = await req.json();
  const {
    isPrintOrder,
    vendorId,
    items,
    deliveryFee = 0,
    description,
    fileUrls,
    fulfillmentType = 'delivery',
    deliveryAddress,
    deliveryHostel,
    dropoffZoneId,
  } = body;

  if (!vendorId) {
    return NextResponse.json({ error: 'vendorId is required' }, { status: 400 });
  }

  let subtotal;
  if (isPrintOrder) {
    subtotal = Number(body.subtotal);
  } else {
    if (!Array.isArray(items) || items.length === 0) {
      return NextResponse.json({ error: 'No items in order' }, { status: 400 });
    }
    subtotal = items.reduce((sum, i) => sum + Number(i.unitPrice) * Number(i.quantity), 0);
  }

  if (!Number.isFinite(subtotal) || subtotal <= 0) {
    console.error('Invalid subtotal computed:', { isPrintOrder, bodySubtotal: body.subtotal, items });
    return NextResponse.json({ error: 'Could not calculate order subtotal' }, { status: 400 });
  }

  const serviceCharge = Math.round((subtotal * SERVICE_CHARGE_PERCENT) / 100);
  const total = subtotal + serviceCharge + deliveryFee;

  const { data: studentProfile } = await supabase
    .from('student_profiles')
    .select('id')
    .eq('user_id', user.id)
    .maybeSingle();

  const reference = `${isPrintOrder ? 'print' : 'order'}_${randomUUID()}`;

  // Print jobs carry their files/breakdown/notes inside the single cart
  // item's `meta` (see PrintOrderBuilder) — nothing separate is sent for
  // them, so pull it out of there rather than the (always-empty) top-level
  // `description`/`fileUrls` fields.
  const printItem = isPrintOrder ? items?.[0] : null;

  const resolvedDescription = isPrintOrder
    ? (printItem?.meta?.notes || null)
    : (description ?? null);

  const resolvedFileUrls = isPrintOrder
    ? (printItem?.meta?.files || [])
    : (fileUrls ?? []);

  // Shaped to match what OrderCard reads:
  // (order.line_items || []).flatMap((li) => li?.breakdown || [])
  const resolvedLineItems = isPrintOrder
    ? (printItem?.meta?.breakdown?.length ? [{ breakdown: printItem.meta.breakdown }] : [])
    : [];

  // Nothing is written to `orders` yet — the order only gets created once
  // payment actually succeeds (webhook, with verify-route as fallback).
  // Everything needed to build the order later travels in `metadata`.
  try {
    const paystackData = await initializeTransaction({
      email: user.email,
      amountKobo: total * 100,
      reference,
      metadata: {
        student_id: studentProfile?.id ?? null,
        requester_id: user.id,
        vendor_id: vendorId,
        order_type: isPrintOrder ? 'print' : 'standard',
        fulfillment_type: fulfillmentType,
        delivery_address: fulfillmentType === 'delivery' ? deliveryAddress ?? null : null,
        delivery_hostel: fulfillmentType === 'delivery' ? deliveryHostel ?? null : null,
        dropoff_zone_id: fulfillmentType === 'delivery' ? dropoffZoneId ?? null : null,
        subtotal,
        service_charge: serviceCharge,
        delivery_fee: deliveryFee,
        total,
        description: resolvedDescription,
        file_urls: resolvedFileUrls,
        line_items: resolvedLineItems,
        items: isPrintOrder ? [] : items, // used to build order_items after payment
      },
      callback_url: `${process.env.NEXT_PUBLIC_SITE_URL}/checkout/callback`,
    });

    return NextResponse.json({ authorization_url: paystackData.authorization_url, reference });
  } catch (err) {
    console.error('paystack initialize error:', err);
    return NextResponse.json({ error: 'Could not start payment' }, { status: 500 });
  }
}