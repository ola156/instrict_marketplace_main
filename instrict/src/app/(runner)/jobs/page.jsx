'use client';

// Unified job pool: shows both vendor delivery orders (orders table)
// and student errands (errands table) in one list, scoped to the
// rider's campus. Claiming branches by job kind since the two tables
// have different shapes and different claim semantics:
//   - orders: claim only sets rider_id (status stays 'ready' — a later
//     screen/action moves it forward, unchanged from before).
//   - errands: claim sets rider_id AND flips status to 'claimed', since
//     errands don't have a separate "picked up" step before that.
// Completing an errand (entering the delivery code) still happens on
// the Errands page for now — there's no /active-equivalent for errands
// yet, so we point the rider there instead of guessing a route.
//
// Suspension: approved=true just means "cleared onboarding, ever."
// account_status='active' is the live day-to-day gate — a suspended
// rider stays approved (so their history/verification isn't wiped) but
// can't go online or claim jobs, and suspended vendors' orders are
// excluded from the pool entirely.

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/utils/supabase/client';
import { useRunner } from '../context/RunnerProvider';
import { Package, MapPin, Wallet, Clock, RefreshCw, Loader2, ShoppingBag, Bike, Ban } from 'lucide-react';
import VerificationGate from '@/components/verification/VerificationGate';

const cardClass = "rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4";

function timeSince(dateStr) {
  if (!dateStr) return '';
  const mins = Math.floor((Date.now() - new Date(dateStr).getTime()) / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  return `${Math.floor(mins / 60)}h ${mins % 60}m ago`;
}

// Print/service orders never populate order_items — their contents live
// in line_items (jsonb breakdown) instead. Standard orders (canteen,
// retail) do use order_items. Count from whichever one the order type
// actually uses, so the item count is never falsely zero.
function getItemCount(job) {
  if (job.order_type === 'print') {
    return (job.line_items || []).reduce(
      (sum, li) => sum + (li?.breakdown?.length || (li ? 1 : 0)),
      0
    );
  }
  return job.order_items?.length || 0;
}

function toUnifiedOrderJob(o) {
  const itemCount = getItemCount(o);
  return {
    kind: 'order',
    id: o.id,
    queuedAt: o.accepted_at,
    title: o.vendor?.legal_name || 'Vendor',
    subtitle: o.order_type === 'print' ? 'Print job' : `${itemCount} item${itemCount === 1 ? '' : 's'}`,
    fee: o.delivery_fee,
    feeLabel: 'Delivery fee',
    pickup: o.vendor?.pickup_zone?.name || '—',
    dropoff: o.dropoff_zone?.name || o.delivery_hostel || '—',
    raw: o,
  };
}

function toUnifiedErrandJob(e) {
  return {
    kind: 'errand',
    id: e.id,
    queuedAt: e.created_at,
    title: e.title,
    subtitle: e.description,
    fee: e.reward,
    feeLabel: 'Reward',
    pickup: e.pickup_location,
    dropoff: e.dropoff_location,
    raw: e,
  };
}

export default function RunnerJobPool() {
  const router = useRouter();
  const supabase = createClient();
  const { runner, hasActiveJob, toggleOnline, togglingOnline } = useRunner();

  const [orderJobs, setOrderJobs] = useState([]);
  const [errandJobs, setErrandJobs] = useState([]);
  const [jobsLoading, setJobsLoading] = useState(true);
  const [claimingId, setClaimingId] = useState(null);
  const [error, setError] = useState('');

  // NOTE: assumes account_status on vendor_profiles is typed like
  // role_status ('active' | 'pending' | 'rejected' | 'suspended').
  // Confirm this matches your actual column before shipping.
  const isSuspended = runner?.account_status === 'suspended';
  const canOperate = runner?.approved && !isSuspended;

  const fetchOrderJobs = useCallback(async () => {
    if (!runner) return [];
    const { data, error: jobsError } = await supabase
      .from('orders')
      .select(`
        id,
        order_type,
        delivery_fee,
        delivery_hostel,
        accepted_at,
        status,
        vendor:vendor_profiles!orders_vendor_id_fkey!inner(
          legal_name,
          campus_id,
          account_status,
          pickup_zone:delivery_zones!vendor_profiles_current_zone_id_fkey(name)
        ),
        dropoff_zone:delivery_zones!orders_dropoff_zone_id_fkey(name),
        order_items(id, name, quantity),
        line_items
      `)
      .eq('fulfillment_type', 'delivery')
      .eq('status', 'ready')
      .is('rider_id', null)
      .eq('vendor.campus_id', runner.campus_id)
      .eq('vendor.account_status', 'active') // exclude suspended vendors' orders
      .order('accepted_at', { ascending: true });

    if (jobsError) { console.error('Order job fetch error:', jobsError); return []; }
    return data || [];
  }, [runner, supabase]);

  const fetchErrandJobs = useCallback(async () => {
    if (!runner) return [];
    const { data, error: errandsError } = await supabase
      .from('errands')
      .select('id, title, description, pickup_location, dropoff_location, reward, created_at, campus_id')
      .eq('status', 'open')
      .is('rider_id', null)
      .eq('campus_id', runner.campus_id)
      .order('created_at', { ascending: true });

    if (errandsError) { console.error('Errand job fetch error:', errandsError); return []; }
    return data || [];
  }, [runner, supabase]);

  const fetchAllJobs = useCallback(async () => {
    setJobsLoading(true);
    const [orders, errands] = await Promise.all([fetchOrderJobs(), fetchErrandJobs()]);
    setOrderJobs(orders);
    setErrandJobs(errands);
    setJobsLoading(false);
  }, [fetchOrderJobs, fetchErrandJobs]);

  useEffect(() => { fetchAllJobs(); }, [fetchAllJobs]);

  // Realtime: listen for changes on both tables, re-run the real
  // (campus + status) filtering via fetchAllJobs rather than trying
  // to patch state in place.
  useEffect(() => {
    if (!runner) return;
    const channel = supabase
      .channel('runner-job-pool')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'orders', filter: `fulfillment_type=eq.delivery` }, () => fetchAllJobs())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'errands' }, () => fetchAllJobs())
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [runner, fetchAllJobs, supabase]);

  const jobs = useMemo(() => {
    const combined = [
      ...orderJobs.map(toUnifiedOrderJob),
      ...errandJobs.map(toUnifiedErrandJob),
    ];
    return combined.sort((a, b) => new Date(a.queuedAt) - new Date(b.queuedAt));
  }, [orderJobs, errandJobs]);

  const claimOrder = async (job) => {
    const { data, error: claimError } = await supabase
      .from('orders')
      .update({ rider_id: runner.user_id })
      .eq('id', job.id)
      .is('rider_id', null)
      .eq('status', 'ready')
      .select();

    if (claimError) return { ok: false, message: 'Something went wrong claiming this job. Try again.' };
    if (!data || data.length === 0) return { ok: false, message: 'Someone else just claimed this one.' };
    return { ok: true };
  };

  const claimErrand = async (job) => {
    const { data, error: claimError } = await supabase
      .from('errands')
      .update({ rider_id: runner.user_id, status: 'claimed', claimed_at: new Date().toISOString() })
      .eq('id', job.id)
      .is('rider_id', null)
      .eq('status', 'open')
      .select();

    if (claimError) return { ok: false, message: 'Something went wrong claiming this errand. Try again.' };
    if (!data || data.length === 0) return { ok: false, message: 'Someone else just claimed this one.' };
    return { ok: true };
  };

  const claimJob = async (job) => {
    if (!canOperate) return; // defense-in-depth — button should already be disabled
    setError('');
    setClaimingId(job.id);
    const result = job.kind === 'order' ? await claimOrder(job) : await claimErrand(job);
    setClaimingId(null);

    if (!result.ok) {
      setError(result.message);
      fetchAllJobs();
      return;
    }

    router.push('/active');
  };

  return (
    <main className="min-h-screen w-full bg-slate-50 dark:bg-slate-950">
      <div className="sticky top-0 z-10 bg-white dark:bg-slate-950 border-b border-slate-100 dark:border-slate-900 px-5 py-4 flex items-center justify-between md:hidden">
        <div>
          <h1 className="text-sm font-black tracking-tight">Job Pool</h1>
          <p className="text-[11px] text-slate-400">{runner?.is_active ? 'You are online' : 'You are offline'}</p>
        </div>
        <button
          onClick={toggleOnline}
          disabled={togglingOnline || !canOperate}
          className={`px-3 py-2 rounded-xl text-xs font-black transition-all disabled:opacity-50 ${
            runner?.is_active
              ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
              : 'bg-slate-100 dark:bg-slate-800 text-slate-500'
          }`}
        >
          {isSuspended ? 'Suspended' : !runner?.approved ? 'Pending' : runner?.is_active ? 'Online' : 'Offline'}
        </button>
      </div>

      <div className="px-5 py-4 space-y-3 max-w-lg md:max-w-5xl mx-auto">
        <div className="hidden md:block">
          <h1 className="text-base font-black tracking-tight">Job Pool</h1>
          <p className="text-[11px] text-slate-400 mb-2">{runner?.is_active ? 'You are online' : 'You are offline'}</p>
        </div>

        {hasActiveJob && (
          <button
            onClick={() => router.push('/active')}
            className="w-full text-left rounded-2xl border border-blue-500/20 bg-blue-500/5 px-4 py-3 hover:bg-blue-500/10 transition-colors"
          >
            <p className="text-[11px] font-bold text-blue-600 dark:text-blue-400">
              You have a delivery in progress — tap to view it
            </p>
          </button>
        )}

        {isSuspended && (
          <div className="flex items-start gap-2 rounded-2xl border border-rose-500/20 bg-rose-500/5 px-4 py-3">
            <Ban className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
            <div>
              <p className="text-[11px] font-black text-rose-600 dark:text-rose-400">Your account is suspended</p>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                {runner?.suspended_reason || 'Contact support for more information.'}
              </p>
            </div>
          </div>
        )}

        {!isSuspended && !runner?.approved && (
          <div className="rounded-2xl border border-amber-500/20 bg-amber-500/5 px-4 py-3">
            <p className="text-[11px] font-bold text-amber-600 dark:text-amber-400">
              Your rider application is under review. You can look around, but you won't be able to go online or claim jobs until you're approved.
            </p>
          </div>
        )}

        {!isSuspended && runner?.approved && !runner?.is_active && (
          <div className="rounded-2xl border border-amber-500/20 bg-amber-500/5 px-4 py-3">
            <p className="text-[11px] font-bold text-amber-600 dark:text-amber-400">
              You're offline — go online to see and claim jobs.
            </p>
          </div>
        )}

        {error && (
          <div className="rounded-2xl border border-rose-500/20 bg-rose-500/5 px-4 py-3">
            <p className="text-[11px] font-bold text-rose-500">{error}</p>
          </div>
        )}

        <div className="flex items-center justify-between">
          <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">
            {jobs.length} {jobs.length === 1 ? 'job' : 'jobs'} available
          </span>
          <button onClick={fetchAllJobs} className="text-slate-400 hover:text-blue-500 transition-colors">
            <RefreshCw className={`w-3.5 h-3.5 ${jobsLoading ? 'animate-spin' : ''}`} />
          </button>
        </div>

        {jobsLoading && jobs.length === 0 && (
          <div className="flex justify-center py-16">
            <Loader2 className="w-5 h-5 text-slate-300 animate-spin" />
          </div>
        )}

        {!jobsLoading && canOperate && runner?.is_active && jobs.length === 0 && (
          <div className="text-center py-16 space-y-2">
            <Package className="w-8 h-8 text-slate-300 mx-auto" />
            <p className="text-xs font-bold text-slate-400">No jobs right now</p>
            <p className="text-[11px] text-slate-400">New deliveries and errands will show up here as they come in.</p>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
          {jobs.map((job) => (
            <div key={`${job.kind}-${job.id}`} className={cardClass}>
              <div className="flex items-start justify-between mb-3">
                <div>
                  <div className="flex items-center gap-1.5 mb-0.5">
                    {job.kind === 'order'
                      ? <ShoppingBag className="w-3 h-3 text-blue-500" />
                      : <Bike className="w-3 h-3 text-purple-500" />}
                    <span className="text-[9px] font-black uppercase tracking-wider text-slate-400">
                      {job.kind === 'order' ? 'Delivery' : 'Errand'}
                    </span>
                  </div>
                  <h3 className="text-xs font-black tracking-tight">{job.title}</h3>
                  <p className="text-[10px] text-slate-400 flex items-center gap-1 mt-0.5">
                    <Clock className="w-3 h-3" /> {job.kind === 'order' ? 'Accepted' : 'Posted'} {timeSince(job.queuedAt)}
                  </p>
                </div>
                <div className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400 font-black text-xs shrink-0">
                  <Wallet className="w-3 h-3" /> ₦{job.fee ?? '—'}
                </div>
                <span className="text-[9px] font-bold text-slate-400">
      {job.kind === 'order' ? '5%' : '3%'} platform fee applies
    </span>

              </div>

              <div className="space-y-1.5 mb-4">
                <div className="flex items-center gap-2 text-[11px] text-slate-500 dark:text-slate-400">
                  <MapPin className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                  <span className="font-bold text-slate-700 dark:text-slate-300">Pickup:</span> {job.pickup}
                </div>
                <div className="flex items-center gap-2 text-[11px] text-slate-500 dark:text-slate-400">
                  <MapPin className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                  <span className="font-bold text-slate-700 dark:text-slate-300">Dropoff:</span> {job.dropoff}
                </div>
                <div className="flex items-center gap-2 text-[11px] text-slate-400">
                  <Package className="w-3.5 h-3.5 shrink-0" />
                  {job.subtitle}
                </div>
              </div>

              <VerificationGate
                role="rider"
                userId={runner?.user_id}
                action="claim jobs"
                variant="inline"
              >
                <button
                  onClick={() => claimJob(job)}
                  disabled={claimingId === job.id || !canOperate}
                  title={
                    isSuspended
                      ? 'Your account is suspended'
                      : !runner?.approved
                      ? 'You can claim jobs once your rider application is approved'
                      : undefined
                  }
                  className="w-full h-10 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-black text-xs tracking-tight transition-all"
                >
                  {isSuspended
                    ? 'Account suspended'
                    : !runner?.approved
                    ? 'Pending approval'
                    : claimingId === job.id ? 'Claiming...' : 'Claim this job'}
                </button>
              </VerificationGate>
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}