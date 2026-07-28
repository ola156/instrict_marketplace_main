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
    // Completed errands — previously never queried here at all, so
    // errand volume/fees were invisible to the admin dashboard.
    supabase
      .from('errands')
      .select('reward')
      .eq('status', 'completed'),
    // Rider-side platform fee (5% orders / 3% errands), now stored as
    // structured columns on the ledger rather than buried in a text
    // description — see credit_rider_on_delivery /
    // credit_rider_on_errand_completion.
    supabase
      .from('rider_wallet_transactions')
      .select('source_type, gross_amount, platform_fee')
      .in('type', ['order_earning', 'errand_earning']),
  ]);

  // Vendor-side revenue (commission baked into the order's service_charge
  // column at checkout time) — unchanged from before.
  const revenue = (paidOrders || []).reduce(
    (acc, o) => ({
      subtotal: acc.subtotal + Number(o.subtotal || 0),
      delivery_fee: acc.delivery_fee + Number(o.delivery_fee || 0),
      service_charge: acc.service_charge + Number(o.service_charge || 0),
      total: acc.total + Number(o.total || 0),
    }),
    { subtotal: 0, delivery_fee: 0, service_charge: 0, total: 0 }
  );

  // Errand gross volume — total rewards paid out across completed errands,
  // independent of the rider fee (mirrors delivery_fee above for orders).
  const errandVolume = (completedErrands || []).reduce(
    (sum, e) => sum + Number(e.reward || 0),
    0
  );

  // Rider-side platform fee, split by source so the admin can see order
  // delivery fees and errand fees as separate line items, plus a combined
  // total.
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

  revenue.errand_volume = errandVolume;
  revenue.rider_fee_orders = riderFees.orders;
  revenue.rider_fee_errands = riderFees.errands;
  revenue.rider_fee_total = riderFees.total;
  // All platform income combined: vendor commission (service_charge) +
  // rider-side delivery/errand fees.
  revenue.platform_total = revenue.service_charge + riderFees.total;

  return (
    <WalletsClient
      vendorWallets={vendorWallets || []}
      riderWallets={riderWallets || []}
      vendorRequests={vendorRequests || []}
      riderRequests={riderRequests || []}
      revenue={revenue}
    />
  );
}