import { createAdminClient } from '@/utils/supabase/admin';
import { requireAdmin } from '@/lib/require-admin';
import OrderFilters from './OrderFilters';
import OrderRow from './OrderRow';

export default async function OrdersPage({ searchParams }) {
  await requireAdmin();
  const params = await searchParams;

  const supabase = createAdminClient();

  let query = supabase
    .from('orders')
    .select(
      `id, status, fulfillment_type, order_type, payment_status, total, subtotal,
       delivery_fee, service_charge, delivery_address, delivery_hostel, dropoff_code,
       payment_ref, note, created_at, student_id, requester_id, rider_id, vendor_id,
       vendor_profiles ( legal_name ),
       rider_profiles ( full_name ),
       student_profiles ( full_name, phone )`
    )
    .order('created_at', { ascending: false })
    .limit(50);

  if (params.status) query = query.eq('status', params.status);
  if (params.vendor_id) query = query.eq('vendor_id', params.vendor_id);
  if (params.fulfillment_type) query = query.eq('fulfillment_type', params.fulfillment_type);

  const { data: orders, error } = await query;

  // For print/service orders placed via requester_id with no student_profiles
  // row, fall back to the requester's account email so admin still has
  // something to identify them by.
  const ordersNeedingEmail = (orders || []).filter((o) => !o.student_id && o.requester_id);
  const emailMap = {};
  await Promise.all(
    ordersNeedingEmail.map(async (o) => {
      try {
        const { data } = await supabase.auth.admin.getUserById(o.requester_id);
        if (data?.user?.email) emailMap[o.requester_id] = data.user.email;
      } catch {
        // best-effort only
      }
    })
  );

  const ordersWithEmail = (orders || []).map((o) => ({
    ...o,
    requester_email: emailMap[o.requester_id],
  }));

  const { data: vendors } = await supabase
    .from('vendor_profiles')
    .select('user_id, legal_name')
    .order('legal_name', { ascending: true });

  return (
    <main className="p-6 md:p-8">
      <div className="max-w-4xl mx-auto space-y-6">
        <div>
          <h1 className="text-2xl font-black tracking-tight">Order Oversight</h1>
          <p className="text-sm text-slate-500 mt-1">
            All orders across the platform. Showing latest 50.
          </p>
        </div>

        <OrderFilters vendors={vendors} />

        {error && <p className="text-rose-400 text-sm">Failed to load orders: {error.message}</p>}
        {ordersWithEmail.length === 0 && (
          <p className="text-slate-600 text-sm">No orders match these filters.</p>
        )}

        <div className="space-y-3">
          {ordersWithEmail.map((order) => (
            <OrderRow key={order.id} order={order} />
          ))}
        </div>
      </div>
    </main>
  );
}