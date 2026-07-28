'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ChevronLeft, MapPin, Store, Loader2, FileText, CreditCard, Ban, AlertTriangle } from 'lucide-react';
import { useCartStore } from '@/store/useCartStore';
import { createClient } from '@/utils/supabase/client';

const inputClass = "w-full h-11 px-3 text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 transition-all";

const SERVICE_CHARGE_PERCENT = 0.05;

export default function CheckoutPage() {
  const router = useRouter();
  const supabase = createClient();

  // ── Hydration guard ──
  // The cart store persists to localStorage, which doesn't exist during
  // SSR/first paint. Reading `items` before hydration would either throw
  // or briefly show a stale/empty cart. We wait one tick for the client
  // to mount before trusting anything from the store.
  const [hydrated, setHydrated] = useState(false);
  useEffect(() => {
    setHydrated(true);
  }, []);

  const items = useCartStore((s) => s.items);
  const vendorId = useCartStore((s) => s.vendorId);
  const vendorName = useCartStore((s) => s.vendorName);
  const total = useCartStore((s) => s.total());
  const clearCart = useCartStore((s) => s.clearCart); // was s.clear — didn't exist, so cart never actually cleared

  const isPrintOrder = items.length > 0 && items[0].type === 'service_fixed';

  const [vendorInfo, setVendorInfo] = useState(null);
  const [studentZoneId, setStudentZoneId] = useState(null);
  const [studentHostel, setStudentHostel] = useState(null);
  const [studentSuspended, setStudentSuspended] = useState(false);
  const [loadingVendor, setLoadingVendor] = useState(true);

  const [fulfillmentType, setFulfillmentType] = useState(null);
  const [address, setAddress] = useState('');
  const [note, setNote] = useState('');
  const [placing, setPlacing] = useState(false);
  const [error, setError] = useState('');

  // Resolved delivery fee — null until we've actually looked it up, so we
  // never accidentally charge a placeholder number before it's ready.
  const [deliveryFee, setDeliveryFee] = useState(null);
  const [feeLoading, setFeeLoading] = useState(false);

  useEffect(() => {
    if (!hydrated) return; // wait for cart state to be trustworthy
    let active = true;

    (async () => {
      if (!vendorId) { setLoadingVendor(false); return; }

      const [{ data: vendor }, { data: { user } }] = await Promise.all([
        supabase
          .from('vendor_profiles')
          .select('fulfillment_method, store_address, landmark, campus_id, current_zone_id, is_open, account_status')
          .eq('user_id', vendorId)
          .single(),
        supabase.auth.getUser(),
      ]);

      let student = null;
      if (user?.id) {
        const { data } = await supabase
          .from('student_profiles')
          .select('hostel, delivery_address, delivery_type, zone_id, account_status')
          .eq('user_id', user.id)
          .single();
        student = data;
      }

      if (!active) return;

      const method = vendor?.fulfillment_method || 'both';
      setVendorInfo(vendor || { fulfillment_method: 'both', store_address: '', landmark: '' });
      setStudentZoneId(student?.zone_id || null);
      setStudentHostel(student?.hostel || null);
      setStudentSuspended(student?.account_status === 'suspended');

      setAddress(student?.delivery_address || student?.hostel || '');

      if (method === 'pickup') setFulfillmentType('pickup');
      else if (method === 'delivery') setFulfillmentType('delivery');

      setLoadingVendor(false);
    })();

    return () => { active = false; };
  }, [hydrated, vendorId]);

  // Resolve the actual delivery fee whenever delivery becomes the active
  // fulfillment type and both zones are known. Checks for an explicit
  // vendor-zone <-> student-zone override first, falls back to the
  // campus's default_delivery_fee otherwise.
  useEffect(() => {
    let active = true;

    (async () => {
      if (fulfillmentType !== 'delivery') {
        setDeliveryFee(0);
        return;
      }
      if (!vendorInfo?.campus_id || !vendorInfo?.current_zone_id || !studentZoneId) {
        // Missing zone data on one side — nothing to resolve yet.
        setDeliveryFee(null);
        return;
      }

      setFeeLoading(true);

      const [{ data: override }, { data: campus }] = await Promise.all([
        supabase
          .from('delivery_zone_fees')
          .select('fee')
          .eq('vendor_zone_id', vendorInfo.current_zone_id)
          .eq('student_zone_id', studentZoneId)
          .maybeSingle(),
        supabase
          .from('campuses')
          .select('default_delivery_fee')
          .eq('id', vendorInfo.campus_id)
          .single(),
      ]);

      if (!active) return;

      const resolvedFee = override?.fee ?? campus?.default_delivery_fee ?? 300;
      setDeliveryFee(resolvedFee);
      setFeeLoading(false);
    })();

    return () => { active = false; };
  }, [fulfillmentType, vendorInfo, studentZoneId]);

  const subtotal = total;
  const serviceCharge = Math.round(subtotal * SERVICE_CHARGE_PERCENT);
  const grandTotal = subtotal + serviceCharge + (deliveryFee || 0);

  // Last-line-of-defense guard before an order is actually created: the cart
  // may have been built while the vendor was open and the student was in
  // good standing, but either could have changed since. This is a CLIENT
  // check for UX only — /api/checkout must re-validate both server-side
  // too, since anyone can hit that endpoint directly and skip this page.
  const vendorSuspended = vendorInfo?.account_status === 'suspended';
  const vendorClosed = vendorInfo != null && !vendorInfo.is_open;
  const canOrder = !loadingVendor && !vendorSuspended && !vendorClosed && !studentSuspended;

  const orderingBlockedReason = studentSuspended
    ? { icon: Ban, text: 'Your account is suspended — contact support to place orders.' }
    : vendorSuspended
    ? { icon: Ban, text: `${vendorName} is no longer available.` }
    : vendorClosed
    ? { icon: AlertTriangle, text: `${vendorName} is closed right now — you can't place this order until they reopen.` }
    : null;

  const canPlace =
    canOrder &&
    items.length > 0 &&
    !loadingVendor &&
    fulfillmentType !== null &&
    (fulfillmentType === 'pickup' ||
      (fulfillmentType === 'delivery' && address.trim() && deliveryFee !== null && !feeLoading));

 const handlePlaceOrder = async () => {
  if (!canPlace) return;
  setError('');
  setPlacing(true);

  try {
    const res = await fetch('/api/checkout', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
         isPrintOrder,
        vendorId,
        items,
        fulfillmentType,
        deliveryAddress: fulfillmentType === 'delivery' ? address : null,
        deliveryHostel: fulfillmentType === 'delivery' ? studentHostel : null,
        dropoffZoneId: fulfillmentType === 'delivery' ? studentZoneId : null,
        note,
        subtotal,
        serviceCharge,
        deliveryFee: deliveryFee || 0,
        total: grandTotal,
      }),
    });

    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to place order.');

    // Send them to Paystack's hosted payment page. Cart is cleared here
    // since the order + order_items already exist server-side at this
    // point — payment completing just flips payment_status, it doesn't
    // create anything new.
    clearCart();
    window.location.href = data.authorization_url;
  } catch (err) {
    setError(err.message || 'Something went wrong.');
    setPlacing(false);
  }
};

  // ── Loading skeleton while cart rehydrates from localStorage ──
  // Prevents a flash of "cart is empty" on refresh before persisted
  // items have actually loaded back in.
  if (!hydrated) {
    return (
      <div className="w-full max-w-lg mx-auto px-4 pt-5 pb-10">
        <div className="h-9 w-9 rounded-full bg-slate-100 dark:bg-slate-800 animate-pulse mb-5" />
        <div className="h-32 rounded-2xl bg-slate-100 dark:bg-slate-800 animate-pulse mb-4" />
        <div className="h-24 rounded-2xl bg-slate-100 dark:bg-slate-800 animate-pulse mb-4" />
        <div className="h-32 rounded-2xl bg-slate-100 dark:bg-slate-800 animate-pulse" />
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center px-4">
        <span className="text-4xl mb-3">🛒</span>
        <p className="text-sm font-black text-slate-900 dark:text-white">Your cart is empty</p>
        <button onClick={() => router.push('/home')} className="mt-4 text-xs font-black text-blue-500">
          Back to home
        </button>
      </div>
    );
  }

  const vendorAllows = vendorInfo?.fulfillment_method || 'both';
  const showPickupOption = vendorAllows === 'pickup' || vendorAllows === 'both';
  const showDeliveryOption = vendorAllows === 'delivery' || vendorAllows === 'both';
  const mustChoose = showPickupOption && showDeliveryOption;

  // If delivery is possible but either side hasn't set a zone yet, surface
  // that clearly instead of silently falling back to a fee of 0.
  const missingZoneData =
    fulfillmentType === 'delivery' &&
    (!vendorInfo?.current_zone_id || !studentZoneId);

  return (
    <div className="w-full max-w-lg mx-auto px-4 pt-5 pb-10">
      <div className="flex items-center gap-3 mb-5">
        <button
          onClick={() => router.back()}
          className="w-9 h-9 rounded-full flex items-center justify-center text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>
        <h1 className="text-sm font-black tracking-tight text-slate-900 dark:text-white">Checkout</h1>
      </div>

      {/* Ordering blocked banner — closed/suspended vendor OR suspended student.
          Shown up top since it overrides everything below it. */}
      {!loadingVendor && orderingBlockedReason && (
        <div className="flex items-start gap-2.5 rounded-2xl border border-rose-500/20 bg-rose-500/5 px-4 py-3.5 mb-4">
          <orderingBlockedReason.icon className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
          <p className="text-xs font-bold text-rose-600 dark:text-rose-400">{orderingBlockedReason.text}</p>
        </div>
      )}

      {/* Order summary */}
      <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl p-4 space-y-3 mb-4">
        <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">
          {isPrintOrder ? `Print job with ${vendorName}` : `Order from ${vendorName}`}
        </p>

        {isPrintOrder ? (
          <div className="space-y-3">
            {items.map((item) => (
              <div key={item.id} className="space-y-2">
                {item.meta?.files?.length > 0 && (
                  <div className="flex flex-wrap gap-1.5">
                    {item.meta.files.map((url, i) => (
                      <span
                        key={i}
                        className="flex items-center gap-1 text-[10px] font-bold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-500/10 px-2 py-1 rounded-lg"
                      >
                        <FileText className="w-3 h-3" />
                        File {i + 1}
                      </span>
                    ))}
                  </div>
                )}

                {item.meta?.breakdown?.map((line, i) => (
                  <div key={i} className="flex items-center justify-between gap-3 text-xs">
                    <span className="text-slate-600 dark:text-slate-300">
                      {line.qty > 1 ? `${line.qty}x ` : ''}{line.label}
                      {line.unit ? ` (${line.unit})` : ''}
                    </span>
                    <span className="font-bold text-slate-900 dark:text-white shrink-0">
                      ₦{line.subtotal.toLocaleString()}
                    </span>
                  </div>
                ))}

                {item.meta?.notes && (
                  <p className="text-[11px] text-slate-400 italic pt-1 border-t border-slate-100 dark:border-slate-800">
                    "{item.meta.notes}"
                  </p>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className="space-y-2.5">
            {items.map((item) => (
              <div key={item.id} className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-xs font-bold text-slate-900 dark:text-white truncate">
                    {item.quantity}x {item.name}
                  </p>
                  {item.meta?.size || item.meta?.color ? (
                    <p className="text-[10px] text-slate-400">
                      {[item.meta.size, item.meta.color].filter(Boolean).join(' · ')}
                    </p>
                  ) : null}
                  {item.meta?.extras?.length > 0 && (
                    <p className="text-[10px] text-slate-400">
                      + {item.meta.extras.map((e) => e.label).join(', ')}
                    </p>
                  )}
                </div>
                <p className="text-xs font-bold text-slate-900 dark:text-white shrink-0">
                  ₦{(item.unitPrice * item.quantity).toLocaleString()}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Fulfillment — driven purely by vendor.fulfillment_method */}
      {loadingVendor ? (
        <div className="h-24 rounded-2xl bg-slate-100 dark:bg-slate-800 animate-pulse mb-4" />
      ) : (
        <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl p-4 space-y-3 mb-4">
          <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">
            {mustChoose ? 'How do you want this?' : 'Fulfillment'}
          </p>

          {mustChoose ? (
            <>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setFulfillmentType('pickup')}
                  className={`h-16 rounded-xl border-2 flex flex-col items-center justify-center gap-1 transition-all ${
                    fulfillmentType === 'pickup'
                      ? 'border-blue-600 bg-blue-50 dark:bg-blue-500/10'
                      : 'border-slate-200 dark:border-slate-700'
                  }`}
                >
                  <Store className="w-4 h-4 text-slate-600 dark:text-slate-300" />
                  <span className="text-[11px] font-black text-slate-700 dark:text-slate-200">Pickup</span>
                </button>
                <button
                  type="button"
                  onClick={() => setFulfillmentType('delivery')}
                  className={`h-16 rounded-xl border-2 flex flex-col items-center justify-center gap-1 transition-all ${
                    fulfillmentType === 'delivery'
                      ? 'border-blue-600 bg-blue-50 dark:bg-blue-500/10'
                      : 'border-slate-200 dark:border-slate-700'
                  }`}
                >
                  <MapPin className="w-4 h-4 text-slate-600 dark:text-slate-300" />
                  <span className="text-[11px] font-black text-slate-700 dark:text-slate-200">Delivery</span>
                </button>
              </div>
              {fulfillmentType === null && (
                <p className="text-[10px] font-bold text-amber-500">Pick one to continue</p>
              )}
            </>
          ) : showPickupOption ? (
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-blue-50 dark:bg-blue-500/10 flex items-center justify-center shrink-0">
                <Store className="w-4 h-4 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <p className="text-xs font-black text-slate-900 dark:text-white">Pickup only</p>
                <p className="text-[11px] text-slate-400">
                  {vendorInfo?.store_address}{vendorInfo?.landmark ? ` · Near ${vendorInfo.landmark}` : ''}
                </p>
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-blue-50 dark:bg-blue-500/10 flex items-center justify-center shrink-0">
                <MapPin className="w-4 h-4 text-blue-600 dark:text-blue-400" />
              </div>
              <p className="text-xs font-black text-slate-900 dark:text-white">Delivery only</p>
            </div>
          )}

          {fulfillmentType === 'delivery' && (
            <div className="space-y-2 pt-1">
              <div className="space-y-1.5">
                <label className="text-[10px] font-black uppercase tracking-wider text-slate-400">Delivery Address *</label>
                <input
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="e.g. Alexander Brown Hall, Room 204"
                  className={inputClass}
                />
              </div>

              {missingZoneData && (
                <p className="text-[10px] font-bold text-amber-500">
                  We couldn't resolve a delivery fee — make sure your zone is set in your profile, then refresh.
                </p>
              )}
            </div>
          )}
        </div>
      )}

      {/* Note */}
      <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl p-4 space-y-2 mb-4">
        <label className="text-[10px] font-black uppercase tracking-wider text-slate-400">Note to vendor (optional)</label>
        <textarea
          value={note}
          onChange={(e) => setNote(e.target.value)}
          rows={2}
          placeholder="Any special instructions..."
          className="w-full px-3 py-2.5 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 resize-none"
        />
      </div>

      {/* Price breakdown */}
      <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl p-4 space-y-2 mb-4">
        <div className="flex items-center justify-between text-xs">
          <span className="text-slate-400 font-bold">Subtotal</span>
          <span className="font-bold text-slate-900 dark:text-white">₦{subtotal.toLocaleString()}</span>
        </div>
        <div className="flex items-center justify-between text-xs">
          <span className="text-slate-400 font-bold">Service charge ({(SERVICE_CHARGE_PERCENT * 100).toFixed(0)}%)</span>
          <span className="font-bold text-slate-900 dark:text-white">₦{serviceCharge.toLocaleString()}</span>
        </div>
        <div className="flex items-center justify-between text-xs">
          <span className="text-slate-400 font-bold">Delivery fee</span>
          <span className="font-bold text-slate-900 dark:text-white">
            {fulfillmentType !== 'delivery'
              ? 'Free'
              : feeLoading
              ? 'Calculating...'
              : deliveryFee !== null
              ? `₦${deliveryFee.toLocaleString()}`
              : '—'}
          </span>
        </div>
        <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-800">
          <span className="text-sm font-black text-slate-900 dark:text-white">Total</span>
          <span className="text-sm font-black text-blue-600 dark:text-blue-400">₦{grandTotal.toLocaleString()}</span>
        </div>
      </div>

      {error && <p className="text-[11px] font-bold text-rose-500 mb-4">{error}</p>}

      <button
        onClick={handlePlaceOrder}
        disabled={!canPlace || placing}
        className="w-full h-12 rounded-xl text-white text-sm font-black tracking-tight transition-all flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed hover:brightness-110 active:scale-[0.99]"
        style={{ backgroundColor: '#2563eb', boxShadow: '0 4px 14px rgba(37, 99, 235, 0.35)' }}
      >
        {placing ? (
          <><Loader2 className="w-4 h-4 animate-spin" /> Placing order...</>
        ) : (
          <><CreditCard className="w-4 h-4" /> Place order (₦{grandTotal.toLocaleString()})</>
        )}
      </button>
      {mustChoose && fulfillmentType === null && (
        <p className="text-center text-[10px] font-bold text-amber-500 mt-2">
          Choose pickup or delivery above
        </p>
      )}
    </div>
  );
}