'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { createClient } from '@/utils/supabase/client';
import {
  ChevronLeft, Clock, CheckCircle2, XCircle, Truck, Store,
  FileText, Copy, Check, MapPin, Phone, Bike, ShoppingBag,
} from 'lucide-react';

function cn(...c) { return c.filter(Boolean).join(' '); }

const statusConfig = {
  pending:   { label: 'Pending',   color: 'bg-amber-500/10 text-amber-600 dark:text-amber-400',      icon: Clock },
  confirmed: { label: 'Confirmed', color: 'bg-blue-500/10 text-blue-600 dark:text-blue-400',         icon: CheckCircle2 },
  preparing: { label: 'Preparing', color: 'bg-purple-500/10 text-purple-600 dark:text-purple-400',   icon: Clock },
  ready:     { label: 'Ready',     color: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400', icon: CheckCircle2 },
  picked_up: { label: 'Picked up', color: 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400',   icon: Bike },
  delivered: { label: 'Delivered', color: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400', icon: CheckCircle2 },
  cancelled: { label: 'Cancelled', color: 'bg-rose-500/10 text-rose-600 dark:text-rose-400',         icon: XCircle },
};

const activeStatuses = ['pending', 'confirmed', 'preparing', 'ready'];

// Progress steps differ slightly by vendor category — a retail order
// doesn't "cook", and a delivery order has a rider leg the others don't.
function getProgressSteps(category, fulfillmentType) {
  if (fulfillmentType === 'delivery') {
    if (category === 'retail') {
      return [
        { key: 'pending', label: 'Placed' },
        { key: 'confirmed', label: 'Confirmed' },
        { key: 'ready', label: 'Packed' },
        { key: 'picked_up', label: 'Out for delivery' },
        { key: 'delivered', label: 'Delivered' },
      ];
    } else if (category === 'service') {
       return [
        { key: 'pending', label: 'Placed' },
        { key: 'confirmed', label: 'Confirmed' },
        { key: 'ready', label: 'Packed' },
        { key: 'picked_up', label: 'Picked Up' },
        { key: 'delivered', label: 'Delivered' },
      ];
    }
    return [
      { key: 'pending', label: 'Placed' },
      { key: 'confirmed', label: 'Confirmed' },
      { key: 'preparing', label: 'Preparing' },
      { key: 'ready', label: 'Ready' },
      { key: 'picked_up', label: 'Out for delivery' },
      { key: 'delivered', label: 'Delivered' },
    ];
  }
  if (category === 'retail') {
    return [
      { key: 'pending', label: 'Placed' },
      { key: 'confirmed', label: 'Confirmed' },
      { key: 'ready', label: 'Ready for pickup' },
      { key: 'picked_up', label: 'Picked up' },
    ];
  } else if (category === 'service') {
       return [
        { key: 'pending', label: 'Placed' },
        { key: 'confirmed', label: 'Confirmed' },
        { key: 'ready', label: 'Ready' },
        { key: 'picked_up', label: 'Picked Up' },
      ];
    }
  return [
    { key: 'pending', label: 'Placed' },
    { key: 'confirmed', label: 'Confirmed' },
    { key: 'preparing', label: 'Preparing' },
    { key: 'ready', label: 'Ready for pickup' },
    { key: 'picked_up', label: 'Picked up' },
  ];
}

function fmtDate(d) {
  return new Date(d).toLocaleString('en-NG', {
    day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit',
  });
}

// Adds minutes to a date/timestamp and returns a new Date.
function addMinutes(date, minutes) {
  return new Date(new Date(date).getTime() + minutes * 60000);
}

// Formats a Date as a full weekday + day + month, e.g. "Thursday, 7 Aug".
function fmtDay(d) {
  return new Date(d).toLocaleDateString('en-NG', {
    weekday: 'long', day: 'numeric', month: 'short',
  });
}

export default function OrderDetailPage() {
  const router = useRouter();
  const params = useParams();
  const orderId = params?.id;
  const supabase = createClient();

  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!orderId) return;
    let active = true;

    const fetchOrder = async () => {
      const { data, error } = await supabase
        .from('orders')
        .select(`
          id, status, fulfillment_type, delivery_address, delivery_hostel,
          subtotal, delivery_fee, service_charge, total,
          payment_status, note, created_at, dropoff_code, rider_id,
          order_type, description, line_items, file_urls,
          vendor:vendor_id(legal_name, avatar_url, store_address, landmark, category, support_phone),
          rider:rider_id(full_name, phone),
          order_items(id, name, quantity, unit_price, selected_extras, menu_item_id, menu_items(estimated_duration_minutes))
        `)
        .eq('id', orderId)
        .single();

      if (!active) return;
      if (error || !data) {
        setNotFound(true);
      } else {
        setOrder(data);
      }
      setLoading(false);
    };

    fetchOrder();

    // Realtime: any UPDATE on this row (status change, rider assignment,
    // dropoff code generation, etc.) re-fetches so the UI reflects it live
    // without the student needing to refresh the page.
    const channel = supabase
      .channel(`order-${orderId}`)
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'orders', filter: `id=eq.${orderId}` },
        () => fetchOrder()
      )
      .subscribe();

    return () => {
      active = false;
      supabase.removeChannel(channel);
    };
  }, [orderId]);

  const copyCode = async () => {
    if (!order?.dropoff_code) return;
    await navigator.clipboard.writeText(order.dropoff_code);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  if (loading) {
    return (
      <div className="w-full max-w-lg mx-auto px-4 pt-5 pb-10">
        <div className="h-9 w-9 rounded-full bg-slate-100 dark:bg-slate-800 animate-pulse mb-5" />
        <div className="h-24 rounded-2xl bg-slate-100 dark:bg-slate-800 animate-pulse mb-4" />
        <div className="h-40 rounded-2xl bg-slate-100 dark:bg-slate-800 animate-pulse mb-4" />
        <div className="h-32 rounded-2xl bg-slate-100 dark:bg-slate-800 animate-pulse" />
      </div>
    );
  }

  if (notFound || !order) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center px-4">
        <span className="text-4xl mb-3">🧾</span>
        <p className="text-sm font-black text-slate-900 dark:text-white">Order not found</p>
        <p className="text-[11px] text-slate-400 mt-1">
          This order doesn't exist, or you don't have access to it.
        </p>
        <button
          onClick={() => router.push('/orders')}
          className="mt-4 text-xs font-black text-blue-500"
        >
          Back to my orders
        </button>
      </div>
    );
  }

  const cfg = statusConfig[order.status] || statusConfig.pending;
  const Icon = cfg.icon;
  const category = order.order_type === 'print' ? 'service' : (order.vendor?.category || 'canteen');
  const isService = category === 'service';
  const isRetail = category === 'retail';
  const isCanteen = category === 'canteen';

  const progressSteps = getProgressSteps(category, order.fulfillment_type);
  const stepIndex = progressSteps.findIndex((s) => s.key === order.status);
  const showProgress = order.status !== 'cancelled';

  const showRiderCard = order.fulfillment_type === 'delivery' && order.rider && !!order.rider_id;

  // Estimated arrival for retail orders — sourced from each line item's
  // menu_items.estimated_duration_minutes, taken from the slowest item
  // in the order (the order isn't complete until every item is ready)
  // and added on top of when the order was placed.
  const estimatedArrivalDate = isRetail
    ? (() => {
        const durations = (order.order_items || [])
          .map((item) => item.menu_items?.estimated_duration_minutes)
          .filter((m) => typeof m === 'number' && m > 0);
        if (durations.length === 0) return null;
        const maxMinutes = Math.max(...durations);
        return addMinutes(order.created_at, maxMinutes);
      })()
    : null;

  const showVendorPickupPhone =
    order.fulfillment_type === 'pickup' && !!order.vendor?.support_phone;

  return (
    <div className="w-full max-w-lg mx-auto px-4 pt-5 pb-10">
      <div className="flex items-center gap-3 mb-5">
        <button
          onClick={() => router.push('/orders')}
          className="w-9 h-9 rounded-full flex items-center justify-center text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>
        <div>
          <h1 className="text-sm font-black tracking-tight text-slate-900 dark:text-white">
            Order #{order.id.slice(0, 8).toUpperCase()}
          </h1>
          <p className="text-[11px] text-slate-400">{fmtDate(order.created_at)}</p>
        </div>
      </div>

      {/* Status banner */}
      <div className={`rounded-2xl p-4 flex items-center gap-3 mb-4 ${cfg.color}`}>
        <div className="w-10 h-10 rounded-xl bg-white/60 dark:bg-black/20 flex items-center justify-center shrink-0">
          <Icon className="w-5 h-5" />
        </div>
        <div>
          <p className="text-sm font-black">{cfg.label}</p>
          <p className="text-[11px] opacity-80">
            {order.status === 'cancelled'
              ? 'This order was cancelled.'
              : order.status === 'delivered' || (order.status === 'picked_up' && order.fulfillment_type === 'pickup')
              ? 'This order is complete.'
              : "We'll update this in real time as things change."}
          </p>
        </div>
      </div>

      {/* Dropoff code — shown once vendor marks ready for a delivery order */}
      {order.fulfillment_type === 'delivery' && order.dropoff_code && order.status !== 'cancelled' && (
        <div className="relative rounded-2xl mb-4 overflow-hidden bg-gradient-to-br from-blue-600 to-blue-800 p-5">
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="text-[10px] font-black uppercase tracking-wider text-blue-100/90">
                Dropoff code
              </p>
              <p className="text-3xl font-black tracking-[0.15em] text-white mt-1">
                {order.dropoff_code}
              </p>
              <p className="text-[10px] text-blue-100/80 mt-1.5">
                Give this to your rider to confirm delivery
              </p>
            </div>
            <button
              onClick={copyCode}
              className="w-10 h-10 rounded-xl bg-white/15 hover:bg-white/25 flex items-center justify-center text-white shrink-0 transition-colors"
            >
              {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
            </button>
          </div>
        </div>
      )}

      {/* Estimated arrival — retail orders only, derived from
          menu_items.estimated_duration_minutes for the items ordered */}
      {isRetail && estimatedArrivalDate && order.status !== 'cancelled' && (
        <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl p-4 mb-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-500/10 flex items-center justify-center shrink-0">
            <Truck className="w-5 h-5 text-blue-600 dark:text-blue-400" />
          </div>
          <div>
            <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">
              Estimated arrival
            </p>
            <p className="text-xs font-black text-slate-900 dark:text-white mt-0.5">
              {fmtDay(estimatedArrivalDate)}
            </p>
          </div>
        </div>
      )}

      {/* Progress tracker — horizontal. The connecting line and dot colors
          transition smoothly, and the current step gets a soft pulsing ring
          so a live status change is visibly noticeable, not just a silent
          re-render. Realtime updates come from the postgres_changes
          subscription above, which re-fetches on every UPDATE. */}
      {showProgress && (
        <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl p-4 mb-4">
          <p className="text-[10px] font-black uppercase tracking-wider text-slate-400 mb-4">
            Order progress
          </p>
          <div className="flex items-start">
            {progressSteps.map((s, i, arr) => {
              const reached = stepIndex >= i;
              const isCurrent = stepIndex === i;
              const isLast = i === arr.length - 1;
              return (
                <div key={s.key} className={cn('flex items-center', !isLast && 'flex-1')}>
                  <div className="flex flex-col items-center shrink-0">
                    <div className="relative flex items-center justify-center">
                      {isCurrent && (
                        <span className="absolute inline-flex h-full w-full rounded-full bg-blue-500 opacity-40 animate-ping" />
                      )}
                      <div
                        className={cn(
                          'relative w-6 h-6 rounded-full flex items-center justify-center shrink-0 transition-colors duration-500',
                          reached
                            ? 'bg-blue-600 text-white'
                            : 'bg-slate-100 dark:bg-slate-800 text-slate-300 dark:text-slate-600'
                        )}
                      >
                        {reached ? (
                          <Check className="w-3.5 h-3.5 stroke-[3]" />
                        ) : (
                          <div className="w-1.5 h-1.5 rounded-full bg-current" />
                        )}
                      </div>
                    </div>
                    <p
                      className={cn(
                        'text-[9px] font-bold leading-tight text-center mt-2 w-16',
                        reached ? 'text-slate-700 dark:text-slate-200' : 'text-slate-300 dark:text-slate-600'
                      )}
                    >
                      {s.label}
                    </p>
                  </div>
                  {!isLast && (
                    <div className="flex-1 h-0.5 -mt-6 rounded-full overflow-hidden bg-slate-100 dark:bg-slate-800">
                      <div
                        className={cn(
                          'h-full bg-blue-600 transition-all duration-700 ease-out',
                          stepIndex > i ? 'w-full' : 'w-0'
                        )}
                      />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Rider card — appears once a rider has claimed the order */}
      {showRiderCard && (
        <div className="bg-white dark:bg-slate-900 border border-indigo-100 dark:border-indigo-500/20 rounded-2xl p-4 mb-4">
          <p className="text-[10px] font-black uppercase tracking-wider text-indigo-500 mb-2.5">
            Your rider
          </p>
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-indigo-50 dark:bg-indigo-500/10 flex items-center justify-center shrink-0">
              <Bike className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-black text-slate-900 dark:text-white truncate">
                {order.rider.full_name || 'Rider assigned'}
              </p>
              {order.rider.phone && (
                <p className="text-[11px] text-slate-400">{order.rider.phone}</p>
              )}
            </div>
            {order.rider.phone && (
              <a
                href={`tel:${order.rider.phone}`}
                className="w-9 h-9 rounded-xl bg-indigo-600 flex items-center justify-center shrink-0"
              >
                <Phone className="w-4 h-4 text-white" />
              </a>
            )}
          </div>
        </div>
      )}

      {/* Vendor */}
      {order.vendor && (
        <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl p-4 mb-4 flex items-center gap-3">
          {order.vendor.avatar_url ? (
            <img
              src={order.vendor.avatar_url}
              alt={order.vendor.legal_name}
              className="w-10 h-10 rounded-xl object-cover"
            />
          ) : (
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center">
              <span className="text-white text-xs font-black">{order.vendor.legal_name?.[0]}</span>
            </div>
          )}
          <div className="min-w-0 flex-1">
            <p className="text-xs font-black text-slate-900 dark:text-white truncate">
              {order.vendor.legal_name}
            </p>
            {order.fulfillment_type === 'pickup' && order.vendor.store_address && (
              <p className="text-[10px] text-slate-400 truncate">
                {order.vendor.store_address}
                {order.vendor.landmark ? ` · Near ${order.vendor.landmark}` : ''}
              </p>
            )}
          </div>
          {showVendorPickupPhone && (
            <a
              href={`tel:${order.vendor.support_phone}`}
              className="w-9 h-9 rounded-xl bg-blue-600 flex items-center justify-center shrink-0"
            >
              <Phone className="w-4 h-4 text-white" />
            </a>
          )}
        </div>
      )}

      {/* Items — layout depends on vendor category */}
      <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl p-4 mb-4 space-y-3">
        <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">
          {isService ? 'Print job' : isRetail ? 'Order items' : 'Items'}
        </p>

        {isService && (
          <div className="space-y-3">
            {order.file_urls?.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {order.file_urls.map((url, i) => (
                  <a
                    key={i}
                    href={url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1 text-[10px] font-bold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-500/10 px-2 py-1 rounded-lg"
                  >
                    <FileText className="w-3 h-3" />
                    File {i + 1}
                  </a>
                ))}
              </div>
            )}

            {order.line_items?.map((li, i) =>
              li?.breakdown?.map((line, j) => (
                <div key={`${i}-${j}`} className="flex items-center justify-between gap-3 text-xs">
                  <span className="text-slate-600 dark:text-slate-300">
                    {line.qty > 1 ? `${line.qty}x ` : ''}{line.label}
                    {line.unit ? ` (${line.unit})` : ''}
                  </span>
                  <span className="font-bold text-slate-900 dark:text-white shrink-0">
                    ₦{Number(line.subtotal).toLocaleString()}
                  </span>
                </div>
              ))
            )}

            {order.description && (
              <p className="text-[11px] text-slate-400 italic pt-1 border-t border-slate-100 dark:border-slate-800">
                "{order.description}"
              </p>
            )}
          </div>
        )}

        {isRetail && (
          <div className="space-y-3">
            {order.order_items?.map((item) => {
              const extras = Array.isArray(item.selected_extras) ? item.selected_extras : [];
              const size = extras.find((e) => e.kind === 'variant' && e.label === 'Size')?.name;
              const color = extras.find((e) => e.kind === 'variant' && e.label === 'Color')?.name;
              const sku = extras.find((e) => e.kind === 'sku')?.value;
              const realExtras = extras.filter((e) => e.kind === 'extra');

              return (
                <div
                  key={item.id}
                  className="flex items-start gap-3 pb-3 border-b border-slate-50 dark:border-slate-800 last:border-0 last:pb-0"
                >
                  <div className="w-10 h-10 rounded-xl bg-slate-50 dark:bg-slate-800 flex items-center justify-center shrink-0">
                    <ShoppingBag className="w-4 h-4 text-slate-400" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-bold text-slate-900 dark:text-white truncate">
                      {item.name}
                    </p>
                    <div className="flex flex-wrap items-center gap-1 mt-0.5">
                      {size && (
                        <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-md bg-slate-50 dark:bg-slate-800 text-slate-500">
                          Size: {size}
                        </span>
                      )}
                      {color && (
                        <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-md bg-slate-50 dark:bg-slate-800 text-slate-500">
                          Color: {color}
                        </span>
                      )}
                      {sku && (
                        <span className="text-[9px] font-medium text-slate-300 dark:text-slate-600">
                          SKU {sku}
                        </span>
                      )}
                    </div>
                    {realExtras.length > 0 && (
                      <p className="text-[10px] text-slate-400 mt-0.5">
                        + {realExtras.map((e) => e.name || e.label).join(', ')}
                      </p>
                    )}
                    <p className="text-[10px] text-slate-400 mt-0.5">Qty {item.quantity}</p>
                  </div>
                  <p className="text-xs font-bold text-slate-900 dark:text-white shrink-0">
                    ₦{(Number(item.unit_price) * item.quantity).toLocaleString()}
                  </p>
                </div>
              );
            })}
          </div>
        )}

        {isCanteen && (
          <div className="space-y-2.5">
            {order.order_items?.map((item) => {
              const rawExtras = Array.isArray(item.selected_extras) ? item.selected_extras : [];
              const extras = rawExtras.filter((e) => !e.kind || e.kind === 'extra');
              return (
                <div key={item.id} className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-slate-900 dark:text-white truncate">
                      {item.quantity}x {item.name}
                    </p>
                    {extras.length > 0 && (
                      <p className="text-[10px] text-slate-400">
                        + {extras.map((e) => e.name || e.label).join(', ')}
                      </p>
                    )}
                  </div>
                  <p className="text-xs font-bold text-slate-900 dark:text-white shrink-0">
                    ₦{(Number(item.unit_price) * item.quantity).toLocaleString()}
                  </p>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Fulfillment details */}
      <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl p-4 mb-4 space-y-2">
        <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">Fulfillment</p>
        <div className="flex items-center gap-2 text-xs font-bold text-slate-700 dark:text-slate-300">
          {order.fulfillment_type === 'delivery' ? (
            <>
              <Truck className="w-4 h-4 text-blue-500 shrink-0" />
              <span>Delivery to {order.delivery_hostel || order.delivery_address || 'your address'}</span>
            </>
          ) : (
            <>
              <Store className="w-4 h-4 text-emerald-500 shrink-0" />
              <span>Store pickup</span>
            </>
          )}
        </div>
        {order.fulfillment_type === 'delivery' && order.delivery_address && (
          <div className="flex items-start gap-2 text-[11px] text-slate-400">
            <MapPin className="w-3.5 h-3.5 mt-0.5 shrink-0" />
            <span>{order.delivery_address}</span>
          </div>
        )}
        {order.note && (
          <p className="text-[11px] text-slate-400 italic pt-1 border-t border-slate-100 dark:border-slate-800">
            "{order.note}"
          </p>
        )}
      </div>

      {/* Price breakdown */}
      <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl p-4 space-y-2">
        <div className="flex items-center justify-between text-xs">
          <span className="text-slate-400 font-bold">Subtotal</span>
          <span className="font-bold text-slate-900 dark:text-white">
            ₦{Number(order.subtotal).toLocaleString()}
          </span>
        </div>
        <div className="flex items-center justify-between text-xs">
          <span className="text-slate-400 font-bold">Service charge</span>
          <span className="font-bold text-slate-900 dark:text-white">
            ₦{Number(order.service_charge || 0).toLocaleString()}
          </span>
        </div>
        <div className="flex items-center justify-between text-xs">
          <span className="text-slate-400 font-bold">Delivery fee</span>
          <span className="font-bold text-slate-900 dark:text-white">
            {order.fulfillment_type === 'delivery'
              ? `₦${Number(order.delivery_fee || 0).toLocaleString()}`
              : 'Free'}
          </span>
        </div>
        <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-800">
          <span className="text-sm font-black text-slate-900 dark:text-white">Total</span>
          <span className="text-sm font-black text-blue-600 dark:text-blue-400">
            ₦{Number(order.total).toLocaleString()}
          </span>
        </div>
        <div className="flex items-center justify-between pt-2">
          <span className="text-[10px] text-slate-400 font-bold">Payment</span>
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
      </div>
    </div>
  );
}