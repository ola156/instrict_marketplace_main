'use client';

// Now shows whichever active job(s) the rider has — an order (existing
// flow, unchanged), a claimed errand (new), or both at once. Nothing
// currently stops a rider from having one of each simultaneously, so
// this renders sections independently rather than assuming exactly one.
//
// Errand completion mirrors the order's dropoff-code pattern exactly,
// but calls complete_errand() instead of confirm_delivery() — that RPC
// is the only thing that can ever read the real code (it lives in a
// separate errand_codes table the rider's session has no access to).

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/utils/supabase/client';
import { useRunner } from '../context/RunnerProvider';
import OtpInput from '@/components/otp/OtpInput';
import {
  MapPin, Phone, Package, CheckCircle2, Loader2, ArrowLeft, ShieldCheck, Clock, Bike,
} from 'lucide-react';

export default function RunnerActiveDelivery() {
  const router = useRouter();
  const supabase = createClient();
  const { runner } = useRunner();

  const [order, setOrder] = useState(null);
  const [errand, setErrand] = useState(null);
  const [loading, setLoading] = useState(true);

  const [orderActionLoading, setOrderActionLoading] = useState(false);
  const [orderError, setOrderError] = useState('');
  const [delivered, setDelivered] = useState(false);
  const [codeDigits, setCodeDigits] = useState(['', '', '', '']);

  const [errandActionLoading, setErrandActionLoading] = useState(false);
  const [errandError, setErrandError] = useState('');
  const [errandCompleted, setErrandCompleted] = useState(false);
  const [errandCodeDigits, setErrandCodeDigits] = useState(['', '', '', '']);

  const fetchActiveOrder = async () => {
    // dropoff_code is deliberately never selected here — the rider's
    // client never receives it, confirmation happens via the RPC below.
    const { data, error: fetchError } = await supabase
      .from('orders')
      .select(`
        id,
        status,
        delivery_address,
        delivery_hostel,
        note,
        vendor:vendor_profiles!orders_vendor_id_fkey(
          legal_name,
          store_address,
          support_phone,
          pickup_zone:delivery_zones!vendor_profiles_current_zone_id_fkey(name)
        ),
        dropoff_zone:delivery_zones!orders_dropoff_zone_id_fkey(name),
        student:student_profiles!orders_student_id_fkey(full_name, phone),
        order_items(id, name, quantity)
      `)
      .eq('rider_id', runner.user_id)
      .not('status', 'in', '(delivered,cancelled)')
      .maybeSingle();

    if (fetchError) setOrderError('Could not load your active delivery.');
    return data || null;
  };

  const fetchActiveErrand = async () => {
    // confirmation_code lives in a separate errand_codes table this
    // query never touches — the rider genuinely has no path to it here.
    const { data, error: fetchError } = await supabase
      .from('errands')
      .select(`
        id,
        title,
        description,
        pickup_location,
        dropoff_location,
        reward,
        status,
        claimed_at,
        student:student_profiles!errands_student_id_fkey(full_name, phone)
      `)
      .eq('rider_id', runner.user_id)
      .eq('status', 'claimed')
      .maybeSingle();

    if (fetchError) setErrandError('Could not load your active errand.');
    return data || null;
  };

  useEffect(() => {
    if (!runner) return;
    (async () => {
      setLoading(true);
      const [o, e] = await Promise.all([fetchActiveOrder(), fetchActiveErrand()]);
      setOrder(o);
      setErrand(e);
      setLoading(false);
    })();
  }, [runner]);

  // Realtime for order stage transitions (vendor marking ready etc).
  // Errands don't need this — nothing external moves a claimed errand
  // forward, only the rider's own code confirmation does.
  useEffect(() => {
    if (!runner || !order) return;
    const channel = supabase
      .channel(`active-order-${order.id}`)
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'orders', filter: `id=eq.${order.id}` },
        (payload) => setOrder(prev => prev ? { ...prev, status: payload.new.status } : prev)
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [runner, order?.id, supabase]);

  // Once every active job this rider has is finished, bounce back to
  // the job pool — but only after both (if there were two) are done.
  useEffect(() => {
    const orderDone = !order || delivered;
    const errandDone = !errand || errandCompleted;
    if ((delivered || errandCompleted) && orderDone && errandDone) {
      const t = setTimeout(() => router.push('/jobs'), 1800);
      return () => clearTimeout(t);
    }
  }, [delivered, errandCompleted]);

  const markPickedUp = async () => {
    if (!order) return;
    setOrderActionLoading(true);
    setOrderError('');

    const { error: updateError } = await supabase
      .from('orders')
      .update({ status: 'picked_up', picked_up_at: new Date().toISOString() })
      .eq('id', order.id)
      .eq('rider_id', runner.user_id)
      .eq('status', 'ready');

    setOrderActionLoading(false);

    if (updateError) {
      setOrderError('Could not mark as picked up. Try again.');
      return;
    }
    setOrder(prev => ({ ...prev, status: 'picked_up' }));
  };

  const confirmDelivery = async () => {
    const code = codeDigits.join('');
    if (code.length < 4) return;

    setOrderActionLoading(true);
    setOrderError('');

    const { data: success, error: rpcError } = await supabase.rpc('confirm_delivery', {
      p_order_id: order.id,
      p_code: code,
    });

    setOrderActionLoading(false);

    if (rpcError) {
      setOrderError('Something went wrong confirming this delivery.');
      return;
    }

    if (!success) {
      setOrderError("That code doesn't match. Ask the student to confirm it and try again.");
      setCodeDigits(['', '', '', '']);
      return;
    }

    setDelivered(true);
  };

  const confirmErrand = async () => {
    const code = errandCodeDigits.join('');
    if (code.length < 4) return;

    setErrandActionLoading(true);
    setErrandError('');

    const { data, error: rpcError } = await supabase.rpc('complete_errand', {
      p_errand_id: errand.id,
      p_code: code,
    });

    setErrandActionLoading(false);
    const result = Array.isArray(data) ? data[0] : data;

    if (rpcError || !result?.success) {
      setErrandError(result?.message || "That code doesn't match. Ask the student to confirm it and try again.");
      setErrandCodeDigits(['', '', '', '']);
      return;
    }

    setErrandCompleted(true);
  };

  if (loading) {
    return (
      <main className="h-screen w-full flex items-center justify-center bg-slate-50 dark:bg-slate-950">
        <Loader2 className="w-6 h-6 text-blue-500 animate-spin" />
      </main>
    );
  }

  if (!order && !errand) {
    return (
      <main className="h-screen w-full flex flex-col items-center justify-center bg-slate-50 dark:bg-slate-950 px-6 space-y-4">
        <Package className="w-8 h-8 text-slate-300" />
        <p className="text-xs font-bold text-slate-400">No active job right now</p>
        <button
          onClick={() => router.push('/jobs')}
          className="h-10 px-5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-black text-xs tracking-tight transition-all"
        >
          Browse job pool
        </button>
      </main>
    );
  }

  const showBothLabels = !!order && !!errand;
  const isWaitingOnVendor = order && (order.status === 'confirmed' || order.status === 'preparing');
  const isReadyForPickup = order && order.status === 'ready';
  const isPickedUp = order && order.status === 'picked_up';

  return (
    <main className="min-h-screen w-full bg-slate-50 dark:bg-slate-950 pb-10">
      <div className="sticky top-0 z-10 bg-white dark:bg-slate-950 border-b border-slate-100 dark:border-slate-900 px-5 py-4 flex items-center gap-3">
        <button onClick={() => router.push('/jobs')} className="text-slate-400 hover:text-slate-900 dark:hover:text-white">
          <ArrowLeft className="w-4 h-4" />
        </button>
        <div>
          <h1 className="text-sm font-black tracking-tight">{showBothLabels ? 'Active Jobs' : 'Active Job'}</h1>
          {order && !errand && (
            <p className="text-[11px] text-slate-400">
              {isWaitingOnVendor ? 'Waiting for vendor to prepare' : isPickedUp ? 'Heading to dropoff' : 'Ready for pickup'}
            </p>
          )}
        </div>
      </div>

      <div className="px-5 py-5 max-w-lg mx-auto space-y-6">
        {/* ── Order section ── */}
        {order && (
          <section className="space-y-4">
            {showBothLabels && (
              <p className="text-[10px] font-black uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                <Package className="w-3 h-3" /> Delivery
              </p>
            )}

            {orderError && (
              <div className="rounded-2xl border border-rose-500/20 bg-rose-500/5 px-4 py-3">
                <p className="text-[11px] font-bold text-rose-500">{orderError}</p>
              </div>
            )}

            {delivered ? (
              <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/5 p-5 text-center space-y-2">
                <CheckCircle2 className="w-6 h-6 text-emerald-500 mx-auto" />
                <p className="text-xs font-black text-emerald-600 dark:text-emerald-400">Delivered!</p>
              </div>
            ) : (
              <>
                <div className="flex items-center gap-2">
                  <div className={`flex-1 h-1.5 rounded-full ${isWaitingOnVendor ? 'bg-blue-500' : 'bg-emerald-500'}`} />
                  <div className={`flex-1 h-1.5 rounded-full ${isReadyForPickup || isPickedUp ? 'bg-blue-500' : 'bg-slate-200 dark:bg-slate-800'}`} />
                  <div className={`flex-1 h-1.5 rounded-full ${isPickedUp ? 'bg-emerald-500' : 'bg-slate-200 dark:bg-slate-800'}`} />
                </div>

                {(isWaitingOnVendor || isReadyForPickup) && (
                  <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 space-y-4">
                    <div className="flex items-start gap-3">
                      <div className="w-9 h-9 rounded-lg bg-blue-500/10 text-blue-500 flex items-center justify-center shrink-0">
                        <MapPin className="w-4 h-4" />
                      </div>
                      <div>
                        <h3 className="text-xs font-black tracking-tight">{order.vendor?.legal_name}</h3>
                        <p className="text-[11px] text-slate-400 mt-0.5">{order.vendor?.store_address}</p>
                        <p className="text-[11px] text-slate-400">{order.vendor?.pickup_zone?.name}</p>
                      </div>
                    </div>

                    {order.vendor?.support_phone && (
                      <a href={`tel:${order.vendor.support_phone}`} className="flex items-center gap-2 text-[11px] font-bold text-blue-500">
                        <Phone className="w-3.5 h-3.5" /> {order.vendor.support_phone}
                      </a>
                    )}

                    <div className="border-t border-slate-100 dark:border-slate-900 pt-3 space-y-1.5">
                      <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">Items to collect</p>
                      {order.order_items?.map((item) => (
                        <p key={item.id} className="text-[11px] text-slate-600 dark:text-slate-300">
                          {item.quantity}x {item.name}
                        </p>
                      ))}
                    </div>

                    {isWaitingOnVendor ? (
                      <div className="flex items-center gap-2 text-[11px] font-bold text-amber-600 dark:text-amber-400 bg-amber-500/5 border border-amber-500/20 rounded-xl px-3 py-2.5">
                        <Clock className="w-3.5 h-3.5 shrink-0" />
                        Waiting for the vendor to mark this order ready. You'll be notified here automatically.
                      </div>
                    ) : (
                      <button
                        onClick={markPickedUp}
                        disabled={orderActionLoading}
                        className="w-full h-11 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-black text-xs tracking-tight transition-all"
                      >
                        {orderActionLoading ? 'Updating...' : "I've picked up the order"}
                      </button>
                    )}
                  </div>
                )}

                {isPickedUp && (
                  <>
                    <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 space-y-4">
                      <div className="flex items-start gap-3">
                        <div className="w-9 h-9 rounded-lg bg-emerald-500/10 text-emerald-500 flex items-center justify-center shrink-0">
                          <MapPin className="w-4 h-4" />
                        </div>
                        <div>
                          <h3 className="text-xs font-black tracking-tight">{order.student?.full_name}</h3>
                          <p className="text-[11px] text-slate-400 mt-0.5">{order.delivery_address}</p>
                          <p className="text-[11px] text-slate-400">{order.delivery_hostel || order.dropoff_zone?.name}</p>
                          {order.note && <p className="text-[11px] text-slate-400 mt-1 italic">"{order.note}"</p>}
                        </div>
                      </div>

                      {order.student?.phone && (
                        <a href={`tel:${order.student.phone}`} className="flex items-center gap-2 text-[11px] font-bold text-blue-500">
                          <Phone className="w-3.5 h-3.5" /> {order.student.phone}
                        </a>
                      )}
                    </div>

                    <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 space-y-4">
                      <div className="flex items-start gap-3">
                        <div className="w-9 h-9 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-500 flex items-center justify-center shrink-0">
                          <ShieldCheck className="w-4 h-4" />
                        </div>
                        <div>
                          <h4 className="text-xs font-black tracking-tight">Confirm delivery</h4>
                          <p className="text-[11px] text-slate-400 mt-0.5">Ask the student for their 4-digit dropoff code.</p>
                        </div>
                      </div>

                      <OtpInput
                        length={4}
                        digits={codeDigits}
                        onChange={setCodeDigits}
                        colorClass="text-blue-500 focus:ring-blue-500"
                      />

                      <button
                        onClick={confirmDelivery}
                        disabled={orderActionLoading || codeDigits.some(d => d === '')}
                        className="w-full h-11 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-black text-xs tracking-tight transition-all"
                      >
                        {orderActionLoading ? 'Confirming...' : 'Confirm delivery'}
                      </button>
                    </div>
                  </>
                )}
              </>
            )}
          </section>
        )}

        {/* ── Errand section ── */}
        {errand && (
          <section className={`space-y-4 ${showBothLabels ? 'pt-2 border-t border-slate-100 dark:border-slate-900' : ''}`}>
            {showBothLabels && (
              <p className="text-[10px] font-black uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                <Bike className="w-3 h-3" /> Errand
              </p>
            )}

            {errandError && (
              <div className="rounded-2xl border border-rose-500/20 bg-rose-500/5 px-4 py-3">
                <p className="text-[11px] font-bold text-rose-500">{errandError}</p>
              </div>
            )}

            {errandCompleted ? (
              <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/5 p-5 text-center space-y-2">
                <CheckCircle2 className="w-6 h-6 text-emerald-500 mx-auto" />
                <p className="text-xs font-black text-emerald-600 dark:text-emerald-400">Errand completed!</p>
              </div>
            ) : (
              <>
                <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 space-y-4">
                  <div className="flex items-start gap-3">
                    <div className="w-9 h-9 rounded-lg bg-purple-500/10 text-purple-500 flex items-center justify-center shrink-0">
                      <Phone className="w-4 h-4" />
                    </div>
                    <div>
                      <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">Posted by</p>
                      <h3 className="text-xs font-black tracking-tight">{errand.student?.full_name || 'Student'}</h3>
                      {errand.student?.phone && (
                        <a href={`tel:${errand.student.phone}`} className="flex items-center gap-1 text-[11px] font-bold text-blue-500 mt-0.5">
                          <Phone className="w-3 h-3" /> {errand.student.phone}
                        </a>
                      )}
                    </div>
                  </div>

                  <div className="border-t border-slate-100 dark:border-slate-900 pt-3">
                    <h4 className="text-xs font-black tracking-tight">{errand.title}</h4>
                    <p className="text-[11px] text-slate-400 mt-0.5">{errand.description}</p>
                  </div>

                  <div className="space-y-1.5 bg-slate-50 dark:bg-slate-800/50 rounded-xl p-3">
                    <div className="flex items-center gap-2 text-[11px] text-slate-500 dark:text-slate-400">
                      <MapPin className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                      <span className="font-medium">From:</span> {errand.pickup_location}
                    </div>
                    <div className="flex items-center gap-2 text-[11px] text-slate-500 dark:text-slate-400">
                      <MapPin className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                      <span className="font-medium">To:</span> {errand.dropoff_location}
                    </div>
                  </div>
                </div>

                <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 space-y-4">
                  <div className="flex items-start gap-3">
                    <div className="w-9 h-9 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-500 flex items-center justify-center shrink-0">
                      <ShieldCheck className="w-4 h-4" />
                    </div>
                    <div>
                      <h4 className="text-xs font-black tracking-tight">Confirm delivery</h4>
                      <p className="text-[11px] text-slate-400 mt-0.5">Ask the student for their 4-digit delivery code.</p>
                    </div>
                  </div>

                  <OtpInput
                    length={4}
                    digits={errandCodeDigits}
                    onChange={setErrandCodeDigits}
                    colorClass="text-purple-500 focus:ring-purple-500"
                  />

                  <button
                    onClick={confirmErrand}
                    disabled={errandActionLoading || errandCodeDigits.some(d => d === '')}
                    className="w-full h-11 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-black text-xs tracking-tight transition-all"
                  >
                    {errandActionLoading ? 'Confirming...' : 'Confirm delivery'}
                  </button>
                </div>
              </>
            )}
          </section>
        )}
      </div>
    </main>
  );
}