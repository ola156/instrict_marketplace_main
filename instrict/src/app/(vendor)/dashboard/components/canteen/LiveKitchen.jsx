'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/utils/supabase/client';
import {
  Clock, CheckCircle2, ChefHat, Bell, Truck, Store, X, MapPin, Loader2,
} from 'lucide-react';

const statusBadge = {
  pending:   { label: 'New order', color: 'bg-amber-500/10 text-amber-600 dark:text-amber-400' },
  confirmed: { label: 'Confirmed', color: 'bg-blue-500/10 text-blue-600 dark:text-blue-400' },
  preparing: { label: 'Cooking',   color: 'bg-purple-500/10 text-purple-600 dark:text-purple-400' },
  ready:     { label: 'Ready',     color: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400' },
  picked_up: { label: 'Picked up', color: 'bg-slate-100 dark:bg-slate-800 text-slate-500' },
  delivered: { label: 'Delivered', color: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400' },
  cancelled: { label: 'Cancelled', color: 'bg-rose-500/10 text-rose-600 dark:text-rose-400' },
};

// The vendor only ever drives pending -> confirmed -> preparing -> ready.
// Past ready: a pickup order is closed out by the vendor directly
// (picked_up). A delivery order is NOT the vendor's to finish — a rider
// has to claim it and carry it through picked_up -> delivered. Marking
// a delivery order "delivered" here would skip the rider entirely and
// never generate/confirm the dropoff_code.
function getAction(order) {
  const isDelivery = order.fulfillment_type === 'delivery';
  switch (order.status) {
    case 'pending':
      return { label: 'Confirm order', next: 'confirmed', icon: Bell, tone: 'blue' };
    case 'confirmed':
      return { label: 'Start cooking', next: 'preparing', icon: ChefHat, tone: 'purple' };
    case 'preparing':
      return {
        label: isDelivery ? 'Mark ready & notify rider' : 'Mark as ready',
        next: 'ready',
        icon: isDelivery ? Truck : ChefHat,
        tone: 'emerald',
      };
    case 'ready':
      return isDelivery
        ? null
        : { label: 'Mark picked up', next: 'picked_up', icon: CheckCircle2, tone: 'emerald' };
    default:
      return null;
  }
}

const toneClasses = {
  blue: 'bg-blue-600 hover:bg-blue-700',
  purple: 'bg-purple-600 hover:bg-purple-700',
  emerald: 'bg-emerald-600 hover:bg-emerald-700',
};

function fmtTime(d) {
  return new Date(d).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function OrderCard({ order, onStatusChange, busy }) {
  const badge = statusBadge[order.status] || statusBadge.pending;
  const action = getAction(order);
  const isDelivery = order.fulfillment_type === 'delivery';
  const waitingOnRider = order.status === 'ready' && isDelivery;
  const isBusy = busy === order.id;
  const isTerminal = ['picked_up', 'delivered', 'cancelled'].includes(order.status);

  const handleAdvance = () => action?.next && onStatusChange(order.id, action.next);
  const handleCancel = () => onStatusChange(order.id, 'cancelled');

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl p-4 space-y-3 shadow-sm">
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div className="space-y-1">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="text-xs font-black text-slate-900 dark:text-white">
              #{order.id.slice(0, 8).toUpperCase()}
            </p>
            <span className={`text-[9px] font-black px-2 py-0.5 rounded-md ${badge.color}`}>
              {badge.label}
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
          <p className="text-[11px] text-slate-400 flex items-center gap-1">
            <Clock className="w-3 h-3" /> {fmtTime(order.created_at)}
          </p>
        </div>
        <p className="text-sm font-black text-slate-900 dark:text-white shrink-0">
          ₦{Number(order.total).toLocaleString()}
        </p>
      </div>

      {/* Fulfillment */}
      <div className="flex items-center justify-between px-3 py-2 bg-slate-50 dark:bg-slate-800/50 rounded-xl">
        <span className="flex items-center gap-1.5 text-[11px] font-bold text-slate-600 dark:text-slate-300">
          {isDelivery
            ? <><Truck className="w-3.5 h-3.5 text-blue-500" /> Delivery</>
            : <><Store className="w-3.5 h-3.5 text-emerald-500" /> Pickup</>}
        </span>
        {isDelivery && (
          <span className="flex items-center gap-1 text-[10px] text-slate-400 max-w-[60%] justify-end text-right">
            <MapPin className="w-3 h-3 shrink-0" />
            <span className="truncate">{order.delivery_hostel || 'Hostel TBD'}</span>
          </span>
        )}
      </div>

      {/* Items */}
      {order.order_items && order.order_items.length > 0 && (
        <div className="bg-slate-50 dark:bg-slate-800/50 rounded-xl px-3 py-2.5 space-y-1.5">
          {order.order_items.map(item => (
            <div key={item.id} className="flex items-start justify-between gap-2">
              <div className="space-y-0.5">
                <p className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  {item.quantity}× {item.name}
                </p>
                {item.selected_extras && item.selected_extras.length > 0 && (
                  <p className="text-[10px] text-slate-400">
                    + {item.selected_extras.map(e => e.name || e.label).join(', ')}
                  </p>
                )}
              </div>
              <p className="text-[11px] font-bold text-slate-500 dark:text-slate-400 shrink-0">
                ₦{(Number(item.unit_price) * item.quantity).toLocaleString()}
              </p>
            </div>
          ))}
        </div>
      )}

      {/* Note */}
      {order.note && (
        <p className="text-[11px] text-slate-500 dark:text-slate-400 italic bg-slate-50 dark:bg-slate-800/30 rounded-lg px-3 py-2">
          "{order.note}"
        </p>
      )}

      {/* Action */}
      {action ? (
        <button
          onClick={handleAdvance}
          disabled={isBusy}
          className={`w-full h-9 rounded-xl text-white text-[11px] font-black tracking-tight transition-all flex items-center justify-center gap-1.5 disabled:opacity-50 ${toneClasses[action.tone]}`}
        >
          {isBusy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <action.icon className="w-3.5 h-3.5" />}
          {isBusy ? 'Updating...' : action.label}
        </button>
      ) : waitingOnRider ? (
        <div className="w-full h-9 rounded-xl bg-blue-50 dark:bg-blue-500/10 text-blue-500 text-[11px] font-bold flex items-center justify-center gap-1.5">
          <Truck className="w-3.5 h-3.5" /> Waiting for a rider to pick it up
        </div>
      ) : isTerminal ? (
        <div
          className={`w-full h-9 rounded-xl text-[11px] font-bold flex items-center justify-center gap-1.5 ${
            order.status === 'cancelled'
              ? 'bg-rose-50 dark:bg-rose-500/10 text-rose-500'
              : 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-500'
          }`}
        >
          <CheckCircle2 className="w-3.5 h-3.5" />
          {order.status === 'delivered' ? 'Delivered' : order.status === 'picked_up' ? 'Completed' : 'Cancelled'}
        </div>
      ) : null}

      {order.status === 'pending' && (
        <button
          onClick={handleCancel}
          disabled={isBusy}
          className="w-full h-8 rounded-xl border border-rose-200 dark:border-rose-800 text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-500/10 transition-all flex items-center justify-center gap-1.5 text-[10px] font-bold disabled:opacity-50"
        >
          <X className="w-3.5 h-3.5" /> Cancel order
        </button>
      )}
    </div>
  );
}

export default function LiveKitchen({ vendorUserId }) {
  const supabase = createClient();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(null);
  const [activeTab, setActiveTab] = useState('active'); // 'active' | 'completed'

  const terminalStatuses = ['picked_up', 'delivered', 'cancelled'];

  useEffect(() => {
    fetchOrders();
    const channel = supabase
      .channel('kitchen-orders')
      .on('postgres_changes', {
        event: '*', schema: 'public', table: 'orders',
        filter: `vendor_id=eq.${vendorUserId}`,
      }, () => fetchOrders())
      .subscribe();
    return () => supabase.removeChannel(channel);
  }, []);

  const fetchOrders = async () => {
    const { data } = await supabase
      .from('orders')
      .select(`
        id, status, fulfillment_type, delivery_hostel, total, note, created_at, payment_status,
        order_items (id, name, quantity, unit_price, selected_extras)
      `)
      .eq('vendor_id', vendorUserId)
      .eq('order_type', 'standard')
      .order('created_at', { ascending: false });

    setOrders(data || []);
    setLoading(false);
  };

  // Routed through the server so the rider-notification step (which needs
  // the Firebase Admin SDK — server-only, never exposed to the browser)
  // can fire on the ready+delivery transition.
  const handleStatusChange = async (orderId, newStatus) => {
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
          <h2 className="text-sm font-black tracking-tight text-slate-900 dark:text-white">Live Kitchen</h2>
          <p className="text-[11px] text-slate-400 mt-0.5">Real-time order queue</p>
        </div>
        {activeOrders.length > 0 && (
          <span className="flex items-center gap-1.5 text-[10px] font-black px-2.5 py-1 rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400">
            <span className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-pulse" />
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
            <div key={i} className="bg-slate-100 dark:bg-slate-800 rounded-2xl h-56 animate-pulse" />
          ))}
        </div>
      ) : displayedOrders.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center border border-dashed border-slate-200 dark:border-slate-800 rounded-2xl">
          <div className="w-12 h-12 bg-slate-100 dark:bg-slate-800 rounded-2xl flex items-center justify-center mb-3">
            <ChefHat className="w-6 h-6 text-slate-400" />
          </div>
          <p className="text-xs font-black text-slate-400">
            {activeTab === 'active' ? 'Kitchen is quiet' : 'No finished orders yet'}
          </p>
          <p className="text-[11px] text-slate-300 dark:text-slate-600 mt-1">
            {activeTab === 'active'
              ? 'New orders will appear here automatically'
              : 'Completed and cancelled orders will show up here'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {displayedOrders.map(order => (
            <OrderCard key={order.id} order={order} onStatusChange={handleStatusChange} busy={busy} />
          ))}
        </div>
      )}
    </div>
  );
}