'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/utils/supabase/client';
import {
  FileText, Download, CheckCircle2, Clock, Truck, Store,
  MapPin, ClipboardList, Loader2, User
} from 'lucide-react';

function getNextAction(order) {
  const isDelivery = order.fulfillment_type === 'delivery';
  switch (order.status) {
    case 'pending':
      return { next: 'confirmed', label: 'Confirm Job' };
    case 'confirmed':
      return { next: 'preparing', label: 'Start Printing' };
    case 'preparing':
      return isDelivery
        ? { next: 'ready', label: 'Mark Ready & Notify Rider' }
        : { next: 'picked_up', label: 'Mark Completed' };
    default:
      return null;
  }
}

function fmtDate(d) {
  return new Date(d).toLocaleString('en-NG', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
}

function OrderCard({ order, onAdvance, busy }) {
  const files = order.file_urls?.length ? order.file_urls : (order.file_url ? [order.file_url] : []);
  const specs = (order.line_items || []).flatMap((li) => li?.breakdown || []);
  const isDelivery = order.fulfillment_type === 'delivery';
  const isBusy = busy === order.id;
  const action = getNextAction(order);

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl p-4 space-y-3">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-black text-slate-900 dark:text-white">
            Job #{order.id.slice(0, 8).toUpperCase()}
          </p>
          <p className="text-[11px] text-slate-400 mt-0.5 flex items-center gap-1">
            <Clock className="w-3 h-3" />
            {fmtDate(order.created_at)}
          </p>
        </div>
        {/* Vendor is only paid the subtotal — delivery fee goes to the rider
            and service charge is the platform's cut, so `total` would show
            the vendor money that isn't actually theirs. */}
        <span className="text-sm font-black text-blue-600 dark:text-blue-400">
          ₦{Number(order.subtotal).toLocaleString()}
        </span>
      </div>

      <div className="flex items-center justify-between px-3 py-2 bg-slate-50 dark:bg-slate-800/50 rounded-xl">
        <span className="flex items-center gap-1.5 text-[11px] font-bold text-slate-600 dark:text-slate-300">
          {isDelivery
            ? <><Truck className="w-3.5 h-3.5 text-blue-500" /> Delivery</>
            : <><Store className="w-3.5 h-3.5 text-blue-500" /> Pickup by student</>}
        </span>
        <span
          className={`text-[9px] font-black px-1.5 py-0.5 rounded-md ${
            order.payment_status === 'paid'
              ? 'bg-blue-500/10 text-blue-600 dark:text-blue-400'
              : 'bg-amber-500/10 text-amber-600 dark:text-amber-400'
          }`}
        >
          {order.payment_status === 'paid' ? 'Paid' : 'Unpaid'}
        </span>
      </div>

    {isDelivery && (
  <div className="flex items-start gap-2 text-[11px] text-slate-400 px-1">
    <MapPin className="w-3.5 h-3.5 mt-0.5 shrink-0" />
    <span>{order.delivery_hostel || order.delivery_address || 'Address on file'}</span>
  </div>
)}

{!isDelivery && order.student && (
  <div className="flex items-center gap-2 text-[11px] text-slate-500 px-1">
    <User className="w-3.5 h-3.5 shrink-0" />
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

    {files.length > 0 && (
        <div className="space-y-1.5">
          <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">Files</p>
          <div className="flex flex-col gap-1.5">
            {files.map((url, i) => (
              <a
                key={i}
                href={url}
                target="_blank"
                rel="noreferrer"
                download
                className="flex items-center gap-2 px-3 py-2 bg-slate-50 dark:bg-slate-800/50 rounded-xl text-[11px] font-bold text-blue-600 dark:text-blue-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              >
                <FileText className="w-3.5 h-3.5" /> File {i + 1}
                <Download className="w-3 h-3 ml-auto" />
              </a>
            ))}
          </div>
        </div>
      )}

      {specs.length > 0 && (
        <div className="space-y-1.5">
          <p className="text-[10px] font-black uppercase tracking-wider text-slate-400 flex items-center gap-1">
            <ClipboardList className="w-3 h-3" /> Specification
          </p>
          <div className="bg-slate-50 dark:bg-slate-800/50 rounded-xl p-2.5 space-y-1">
            {specs.map((line, i) => (
              <div key={i} className="flex items-center justify-between text-[11px]">
                <span className="text-slate-600 dark:text-slate-300">
                  {line.qty > 1 ? `${line.qty}x ` : ''}{line.label}
                  {line.unit ? ` (${line.unit})` : ''}
                </span>
                <span className="font-bold text-slate-500 shrink-0">
                  ₦{Number(line.subtotal || 0).toLocaleString()}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {order.description && (
        <div>
          <p className="text-[10px] font-black uppercase tracking-wider text-slate-400 mb-1">Description</p>
          <p className="text-[11px] text-slate-500 dark:text-slate-400 italic">"{order.description}"</p>
        </div>
      )}

      {order.note && order.note !== order.description && (
        <div>
          <p className="text-[10px] font-black uppercase tracking-wider text-slate-400 mb-1">Note to vendor</p>
          <p className="text-[11px] text-slate-500 dark:text-slate-400 italic">"{order.note}"</p>
        </div>
      )}

      {action && (
        <button
          onClick={() => onAdvance(order.id, action.next)}
          disabled={isBusy}
          className={`w-full h-9 rounded-xl disabled:opacity-50 text-white text-[11px] font-black tracking-tight transition-all flex items-center justify-center gap-2 ${
            order.status === 'pending'
              ? 'bg-blue-600 hover:bg-blue-700'
              : order.status === 'confirmed'
              ? 'bg-purple-600 hover:bg-purple-700'
              : 'bg-blue-600 hover:bg-blue-700'
          }`}
        >
          {isBusy ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
          ) : (
            <>
              {order.status === 'preparing' && (isDelivery ? <Truck className="w-3.5 h-3.5" /> : <Store className="w-3.5 h-3.5" />)}
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
        <div className="flex items-center justify-center gap-1.5 text-blue-500 text-[11px] font-bold py-1">
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

export default function IncomingOrders({ vendorUserId }) {
  const supabase = createClient();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(null);
  const [activeTab, setActiveTab] = useState('active'); // 'active' | 'completed'

  const terminalStatuses = ['picked_up', 'delivered', 'cancelled'];

  useEffect(() => {
    // Guard: if vendorUserId isn't resolved yet on first render, subscribing
    // now would lock the channel filter to `vendor_id=eq.undefined` forever
    // — this effect re-runs once vendorUserId actually arrives.
    if (!vendorUserId) return;

    fetchOrders();

    const channel = supabase
      .channel(`fixed-service-orders-${vendorUserId}`)
      .on('postgres_changes', {
        event: '*', schema: 'public', table: 'orders',
        filter: `vendor_id=eq.${vendorUserId}`,
      }, fetchOrders)
      .subscribe();

    return () => supabase.removeChannel(channel);
  }, [vendorUserId]);

  const fetchOrders = async () => {
    // Only paid orders should appear in the vendor's incoming queue —
    // an order the student never finished paying for isn't a real job yet.
    const { data } = await supabase
      .from('orders')
      .select(`
        id, status, fulfillment_type, delivery_address, delivery_hostel,
        subtotal, delivery_fee, service_charge, total, payment_status,
        note, description, line_items, file_urls, file_url,
        created_at, ready_at, accepted_at, picked_up_at,
         student:student_profiles(full_name, phone)
      `)
      .eq('vendor_id', vendorUserId)
      .eq('order_type', 'print')
      .eq('payment_status', 'paid')
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
          <h2 className="text-sm font-black tracking-tight text-slate-900 dark:text-white">Incoming Orders</h2>
          <p className="text-[11px] text-slate-400 mt-0.5">Print jobs submitted by students</p>
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
          <FileText className="w-8 h-8 text-slate-300 mb-2" />
          <p className="text-xs font-black text-slate-400">
            {activeTab === 'active' ? 'No active jobs' : 'No finished jobs yet'}
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