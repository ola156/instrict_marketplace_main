import { requireAdmin } from '@/lib/require-admin';
import { createAdminClient } from '@/utils/supabase/admin';
import WalletsClient from './WalletsClient';

export default async function WalletsPage() {
  await requireAdmin();
  const supabase = createAdminClient();

  const [
    { data: vendorWallets },
    { data: riderWallets },
    { data: vendorRequests },
    { data: riderRequests },
    { data: paidOrders },
    { data: completedErrands },
    { data: riderFeeTx },
    { data: vendorFeeTx },
    { data: reversalTx },
  ] = await Promise.all([
    supabase
      .from('vendor_wallet')
      .select('*, vendor_profiles(legal_name)')
      .order('balance', { ascending: false }),
    supabase
      .from('rider_wallets')
      .select('*, rider_profiles(full_name)')
      .order('balance', { ascending: false }),
    supabase
      .from('vendor_withdrawal_requests')
      .select('*, vendor_profiles(legal_name)')
      .eq('status', 'pending')
      .order('created_at', { ascending: true }),
    supabase
      .from('rider_withdrawal_requests')
      .select('*, rider_profiles(full_name)')
      .eq('status', 'pending')
      .order('created_at', { ascending: true }),
    supabase
      .from('orders')
      .select('subtotal, delivery_fee, service_charge, total')
      .eq('payment_status', 'paid'),
    // total_charged = reward + service_charge — the actual amount the
    // student paid at posting time. Used for "money in", not just the
    // 3% fee slice.
    supabase
      .from('errands')
      .select('reward, service_charge, total_charged')
      .eq('status', 'completed'),
    supabase
      .from('rider_wallet_transactions')
      .select('source_type, gross_amount, platform_fee')
      .in('type', ['order_earning', 'errand_earning']),
    supabase
      .from('vendor_wallet_transactions')
      .select('gross_amount, platform_fee')
      .eq('type', 'order_earning'),
    // Cancellation reversals — money that was held for a vendor but never
    // reached their withdrawable balance, clawed back on a post-payment
    // cancellation. source_id points at orders.id but isn't a real FK
    // (source_id is a generic uuid covering both orders and errands), so
    // it can't be nested in this select — fetched separately below.
    supabase
      .from('vendor_wallet_transactions')
      .select('id, vendor_id, amount, source_id, description, created_at')
      .eq('type', 'reversal')
      .order('created_at', { ascending: false }),
  ]);

  // Student-side revenue (service charge added on top at checkout — 3%
  // of subtotal), plus order totals for the "money in" figure below.
  const revenue = (paidOrders || []).reduce(
    (acc, o) => ({
      subtotal: acc.subtotal + Number(o.subtotal || 0),
      delivery_fee: acc.delivery_fee + Number(o.delivery_fee || 0),
      service_charge: acc.service_charge + Number(o.service_charge || 0),
      total: acc.total + Number(o.total || 0),
    }),
    { subtotal: 0, delivery_fee: 0, service_charge: 0, total: 0 }
  );

  // Errand gross volume (rewards), student service charge, and total
  // charged (what the student actually paid), each summed separately.
  const errandTotals = (completedErrands || []).reduce(
    (acc, e) => ({
      volume: acc.volume + Number(e.reward || 0),
      service_charge: acc.service_charge + Number(e.service_charge || 0),
      // Fall back to reward + service_charge for any older rows where
      // total_charged might not have been backfilled.
      total_charged: acc.total_charged + Number(e.total_charged ?? (Number(e.reward || 0) + Number(e.service_charge || 0))),
    }),
    { volume: 0, service_charge: 0, total_charged: 0 }
  );

  const riderFees = (riderFeeTx || []).reduce(
    (acc, tx) => {
      const fee = Number(tx.platform_fee || 0);
      if (tx.source_type === 'order') acc.orders += fee;
      else if (tx.source_type === 'errand') acc.errands += fee;
      acc.total += fee;
      return acc;
    },
    { orders: 0, errands: 0, total: 0 }
  );

  const vendorFees = (vendorFeeTx || []).reduce(
    (sum, tx) => sum + Number(tx.platform_fee || 0),
    0
  );

  revenue.errand_volume = errandTotals.volume;
  revenue.errand_service_charge = errandTotals.service_charge;
  revenue.errand_total_charged = errandTotals.total_charged;
  revenue.rider_fee_orders = riderFees.orders;
  revenue.rider_fee_errands = riderFees.errands;
  revenue.rider_fee_total = riderFees.total;
  revenue.vendor_fee_orders = vendorFees;

  // Platform's own cut only — student fees + vendor/rider commission.
  revenue.platform_total =
    revenue.service_charge + revenue.errand_service_charge + riderFees.total + vendorFees;

  // ALL cash that flowed into the app — full order totals (subtotal +
  // delivery + service charge) plus full errand totals (reward + service
  // charge). Includes money that will later be paid back out to vendors
  // and riders, unlike platform_total above.
  revenue.total_income = revenue.total + revenue.errand_total_charged;

  // ---------- Refunds (cancellation reversals) ----------
  // Stitched together manually since source_id isn't a real FK: fetch the
  // related orders + student names in two follow-up batch queries keyed
  // off the ids we already have, then merge in JS.
  const reversalRows = reversalTx || [];
  const orderIds = [...new Set(reversalRows.map((tx) => tx.source_id).filter(Boolean))];
  const vendorIds = [...new Set(reversalRows.map((tx) => tx.vendor_id).filter(Boolean))];

  const [{ data: refundOrders }, { data: refundVendors }] = await Promise.all([
    orderIds.length
      ? supabase
          .from('orders')
          .select('id, student_id, total, service_charge, payment_status, cancelled_by, cancellation_reason, cancelled_at')
          .in('id', orderIds)
      : Promise.resolve({ data: [] }),
    vendorIds.length
      ? supabase.from('vendor_profiles').select('user_id, legal_name').in('user_id', vendorIds)
      : Promise.resolve({ data: [] }),
  ]);

  const studentIds = [...new Set((refundOrders || []).map((o) => o.student_id).filter(Boolean))];
  // orders.student_id stores student_profiles.id (its own PK), not
  // student_profiles.user_id — join on id, not user_id.
  const { data: refundStudents } = studentIds.length
    ? await supabase.from('student_profiles').select('id, full_name').in('id', studentIds)
    : { data: [] };

  const orderById = Object.fromEntries((refundOrders || []).map((o) => [o.id, o]));
  const vendorById = Object.fromEntries((refundVendors || []).map((v) => [v.user_id, v]));
  const studentById = Object.fromEntries((refundStudents || []).map((s) => [s.id, s]));

  const refunds = reversalRows.map((tx) => {
    const order = orderById[tx.source_id] || null;
    const student = order ? studentById[order.student_id] : null;
    const vendor = vendorById[tx.vendor_id] || null;
    return {
      id: tx.id,
      // What the STUDENT gets back — order total minus the service charge
      // (the platform's own fee, never refunded). Not the same as tx.amount,
      // which is the vendor's held-balance clawback (their earnings share
      // only) and is a smaller, different number.
      amount: order ? Number(order.total || 0) - Number(order.service_charge || 0) : Math.abs(Number(tx.amount || 0)),
      createdAt: tx.created_at,
      orderId: tx.source_id,
      orderTotal: order?.total ?? null,
      paymentStatus: order?.payment_status ?? null,
      cancelledBy: order?.cancelled_by ?? null,
      reason: order?.cancellation_reason || tx.description || null,
      cancelledAt: order?.cancelled_at ?? null,
      vendorName: vendor?.legal_name || 'Unknown vendor',
      studentName: student?.full_name || 'Unknown student',
    };
  });

  return (
    <WalletsClient
      vendorWallets={vendorWallets || []}
      riderWallets={riderWallets || []}
      vendorRequests={vendorRequests || []}
      riderRequests={riderRequests || []}
      revenue={revenue}
      refunds={refunds}
    />
  );
}