'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/utils/supabase/client';
import { Package, Truck, Store, CheckCircle2, MapPin, Clock, Loader2 , User} from 'lucide-react';

// Real status flow, matching orders_status_check. Retail has no "cooking"
// stage — an order goes straight from confirmed to ready (packed).
// Pickup orders are closed out by the vendor directly; delivery orders
// wait on a rider once ready, since claiming/pickup/delivery from there
// is the rider's job, not the vendor's.
function getNextAction(order) {
  const isDelivery = order.fulfillment_type === 'delivery';
  switch (order.status) {
    case 'pending':
      return { next: 'confirmed', label: 'Confirm Order' };
    case 'confirmed':
      return { next: 'ready', label: isDelivery ? 'Mark Ready & Notify Rider' : 'Mark Ready for Pickup' };
    case 'ready':
      return isDelivery ? null : { next: 'picked_up', label: 'Mark Completed' };
    default:
      return null; // ready (delivery, awaiting rider), picked_up, delivered, cancelled
  }
}

function fmtTime(d) {
  return new Date(d).toLocaleTimeString('en-NG', { hour: '2-digit', minute: '2-digit' });
}

function OrderCard({ order, onAdvance, busy }) {
  const isDelivery = order.fulfillment_type === 'delivery';
  const isBusy = busy === order.id;
  const action = getNextAction(order);

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl p-4 space-y-3">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-black text-slate-900 dark:text-white">
            Order #{order.id.slice(0, 8).toUpperCase()}
          </p>
          <p className="text-[11px] text-slate-400 mt-0.5 flex items-center gap-1">
            <Clock className="w-3 h-3" />
            {fmtTime(order.created_at)}
          </p>
        </div>
        <span className="text-sm font-black text-blue-600 dark:text-blue-400">
          ₦{Number(order.subtotal).toLocaleString()}
        </span>
      </div>

      {/* Fulfillment + payment badges */}
      <div className="flex items-center justify-between px-3 py-2 bg-slate-50 dark:bg-slate-800/50 rounded-xl">
        <span className="flex items-center gap-1.5 text-[11px] font-bold text-slate-600 dark:text-slate-300">
          {isDelivery
            ? <><Truck className="w-3.5 h-3.5 text-blue-500" /> Delivery</>
            : <><Store className="w-3.5 h-3.5 text-emerald-500" /> Pickup by student</>}
        </span>
        <span
          className={`text-[9px] font-black px-1.5 py-0.5 rounded-md ${
            order.payment_status === 'paid'
              ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
              : 'bg-amber-500/10 text-amber-600 dark:text-amber-400'
          }`}
        >
          {order.payment_status === 'paid' ? 'Paid' : 'Unpaid'}
        </span>
      </div>

      {/* Items — variant info (size/color) comes tagged in selected_extras
          as kind:'variant', alongside real add-on extras tagged kind:'extra' */}
      <div className="space-y-2">
        {(order.order_items || []).map((item) => {
          const extras = item.selected_extras || [];
          const size = extras.find((e) => e.kind === 'variant' && e.label === 'Size')?.name;
          const color = extras.find((e) => e.kind === 'variant' && e.label === 'Color')?.name;
          const sku = extras.find((e) => e.kind === 'sku')?.value;
          const realExtras = extras.filter((e) => e.kind === 'extra');

          return (
            <div key={item.id} className="flex items-start justify-between gap-2 text-[11px]">
              <div className="min-w-0">
                <p className="font-bold text-slate-700 dark:text-slate-300">
                  {item.quantity}x {item.name}
                </p>
                <div className="flex flex-wrap items-center gap-1 mt-0.5">
                  {size && (
                    <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-500">
                      Size: {size}
                    </span>
                  )}
                  {color && (
                    <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-500">
                      Color: {color}
                    </span>
                  )}
                  {sku && <span className="text-[9px] text-slate-300">SKU {sku}</span>}
                </div>
                {realExtras.length > 0 && (
                  <p className="text-[10px] text-slate-400 mt-0.5">
                    + {realExtras.map((e) => e.name || e.label).join(', ')}
                  </p>
                )}
              </div>
              <span className="text-slate-400 shrink-0">
                ₦{(Number(item.unit_price) * item.quantity).toLocaleString()}
              </span>
            </div>
          );
        })}
      </div>

      {/* Delivery reference — vendor doesn't handle the delivery leg itself,
          this is just so they can sanity-check the job before packing it */}
      {isDelivery && (
        <div className="flex items-center gap-1.5 text-[11px] text-slate-400 border-t border-slate-50 dark:border-slate-800 pt-2.5">
          <MapPin className="w-3 h-3" /> {order.delivery_hostel || order.delivery_address || 'Address on file'}
        </div>
      )}
      {/* Pickup contact — vendor needs to know who's collecting */}
{!isDelivery && order.student && (
  <div className="flex items-center gap-1.5 text-[11px] text-slate-500 border-t border-slate-50 dark:border-slate-800 pt-2.5">
    <User className="w-3 h-3 shrink-0" />
    <span className="font-bold text-slate-700 dark:text-slate-300 truncate">
      {order.student.full_name}
    </span>
    {order.student.phone && (
      <a
        href={`tel:${order.student.phone}`}
        className="ml-auto text-blue-500 dark:text-blue-400 font-black shrink-0"
      >
        {order.student.phone}
      </a>
    )}
  </div>
)}

      {order.note && (
        <p className="text-[11px] text-slate-400 italic border-t border-slate-50 dark:border-slate-800 pt-2.5">
          "{order.note}"
        </p>
      )}

      {/* Single action button — relabels itself as status advances */}
      {action && (
        <button
          onClick={() => onAdvance(order.id, action.next)}
          disabled={isBusy}
          className={`w-full h-9 rounded-xl disabled:opacity-50 text-white text-[11px] font-black tracking-tight transition-all flex items-center justify-center gap-2 ${
            order.status === 'pending' ? 'bg-blue-600 hover:bg-blue-700' : 'bg-emerald-600 hover:bg-emerald-700'
          }`}
        >
          {isBusy ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
          ) : (
            <>
              {order.status === 'confirmed' && (isDelivery ? <Truck className="w-3.5 h-3.5" /> : <Store className="w-3.5 h-3.5" />)}
              {action.label}
            </>
          )}
        </button>
      )}

      {!action && order.status === 'ready' && isDelivery && (
        <div className="flex items-center justify-center gap-1.5 text-blue-500 text-[11px] font-bold py-1.5 bg-blue-50 dark:bg-blue-500/10 rounded-xl">
          <Truck className="w-3.5 h-3.5" /> Waiting for a rider to pick it up
        </div>
      )}
      {!action && (order.status === 'picked_up' || order.status === 'delivered') && (
        <div className="flex items-center justify-center gap-1.5 text-emerald-500 text-[11px] font-bold py-1">
          <CheckCircle2 className="w-3.5 h-3.5" /> {order.status === 'delivered' ? 'Delivered' : 'Completed'}
        </div>
      )}
      {!action && order.status === 'cancelled' && (
        <div className="flex items-center justify-center gap-1.5 text-rose-500 text-[11px] font-bold py-1">
          Cancelled
        </div>
      )}
    </div>
  );
}

export default function RetailOrders({ vendorUserId }) {
  const supabase = createClient();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(null);
  const [activeTab, setActiveTab] = useState('active'); // 'active' | 'completed'

  const terminalStatuses = ['picked_up', 'delivered', 'cancelled'];

  useEffect(() => {
    fetchOrders();
    const channel = supabase
      .channel('retail-orders')
      .on('postgres_changes', {
        event: '*', schema: 'public', table: 'orders',
        filter: `vendor_id=eq.${vendorUserId}`,
      }, fetchOrders)
      .subscribe();
    return () => supabase.removeChannel(channel);
  }, []);

  const fetchOrders = async () => {
    const { data } = await supabase
      .from('orders')
      .select(`
        id, status, fulfillment_type, delivery_address, delivery_hostel,
        subtotal, delivery_fee, service_charge, total, payment_status,
        note, created_at, accepted_at, ready_at, picked_up_at,
        order_items(id, name, unit_price, quantity, selected_extras),
         student:student_profiles(full_name, phone)
      `)
      .eq('vendor_id', vendorUserId)
      .eq('order_type', 'standard')
      .order('created_at', { ascending: false });
    setOrders(data || []);
    setLoading(false);
  };

  // Routed through the server so the rider-notification step (needs the
  // Firebase Admin SDK, server-only) can fire on ready+delivery.
  const advanceStatus = async (orderId, newStatus) => {
    setBusy(orderId);

    try {
      const res = await fetch('/api/orders/update-status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderId, newStatus }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        console.error('Failed to update order status:', data.error || res.statusText);
      }
    } catch (err) {
      console.error('Failed to update order status:', err);
    }

    await fetchOrders();
    setBusy(null);
  };

  const activeOrders = orders.filter((o) => !terminalStatuses.includes(o.status));
  const completedOrders = orders.filter((o) => terminalStatuses.includes(o.status));

  const displayedOrders = activeTab === 'active' ? activeOrders : completedOrders;

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-sm font-black tracking-tight text-slate-900 dark:text-white">Orders</h2>
          <p className="text-[11px] text-slate-400 mt-0.5">Manage incoming orders</p>
        </div>
        {activeOrders.length > 0 && (
          <span className="px-2 py-1 bg-blue-500 text-white text-[10px] font-black rounded-full">
            {activeOrders.length} active
          </span>
        )}
      </div>

      {/* Tabs */}
      <div className="inline-flex items-center p-1 rounded-xl bg-slate-100 dark:bg-slate-800/60 gap-1">
        <button
          onClick={() => setActiveTab('active')}
          className={`relative flex items-center gap-1.5 px-3.5 h-8 rounded-lg text-[11px] font-black tracking-tight transition-all ${
            activeTab === 'active'
              ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-sm'
              : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-300'
          }`}
        >
          Active
          <span
            className={`min-w-[16px] h-4 px-1 rounded-full text-[9px] flex items-center justify-center ${
              activeTab === 'active'
                ? 'bg-blue-600 text-white'
                : 'bg-slate-200 dark:bg-slate-700 text-slate-500 dark:text-slate-400'
            }`}
          >
            {activeOrders.length}
          </span>
        </button>
        <button
          onClick={() => setActiveTab('completed')}
          className={`relative flex items-center gap-1.5 px-3.5 h-8 rounded-lg text-[11px] font-black tracking-tight transition-all ${
            activeTab === 'completed'
              ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-sm'
              : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-300'
          }`}
        >
          Finished
          <span
            className={`min-w-[16px] h-4 px-1 rounded-full text-[9px] flex items-center justify-center ${
              activeTab === 'completed'
                ? 'bg-blue-600 text-white'
                : 'bg-slate-200 dark:bg-slate-700 text-slate-500 dark:text-slate-400'
            }`}
          >
            {completedOrders.length}
          </span>
        </button>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-40 bg-slate-100 dark:bg-slate-800 rounded-2xl animate-pulse" />
          ))}
        </div>
      ) : displayedOrders.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center border border-dashed border-slate-200 dark:border-slate-800 rounded-2xl">
          <Package className="w-8 h-8 text-slate-300 mb-2" />
          <p className="text-xs font-black text-slate-400">
            {activeTab === 'active' ? 'No active orders' : 'No finished orders yet'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {displayedOrders.map((order) => (
            <OrderCard key={order.id} order={order} onAdvance={advanceStatus} busy={busy} />
          ))}
        </div>
      )}
    </div>
  );
}