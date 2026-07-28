'use client';

// Combined history of past jobs — orders (delivered/cancelled) and
// errands (completed/cancelled) — merged into one reverse-chronological
// feed, same "kind" tagging pattern used in the job pool.
//
// NOTE: orders doesn't have a confirmed delivered_at column in what
// we've queried so far, so this sorts/displays by accepted_at as a
// stand-in. Swap `accepted_at` for a real completion timestamp (e.g.
// `delivered_at`) if one exists on your orders table.

import { useState, useEffect, useCallback, useMemo } from 'react';
import { createClient } from '@/utils/supabase/client';
import { useRunner } from '../../context/RunnerProvider';
import { Package, Bike, MapPin, Wallet, CheckCircle2, XCircle, Loader2, RefreshCw } from 'lucide-react';

const cardClass = "rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4";

function formatDate(dateStr) {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleDateString('en-NG', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

function toHistoryOrder(o) {
  return {
    kind: 'order',
    id: o.id,
    at: o.accepted_at,
    title: o.vendor?.legal_name || 'Vendor',
    dropoff: o.dropoff_zone?.name || o.delivery_hostel || '—',
    fee: o.delivery_fee,
    feeLabel: 'Earned',
    status: o.status,
    isSuccess: o.status === 'delivered',
  };
}

function toHistoryErrand(e) {
  return {
    kind: 'errand',
    id: e.id,
    at: e.completed_at || e.claimed_at || e.created_at,
    title: e.title,
    dropoff: e.dropoff_location,
    fee: e.reward,
    feeLabel: 'Reward',
    status: e.status,
    isSuccess: e.status === 'completed',
  };
}

export default function RunnerHistory() {
  const supabase = createClient();
  const { runner } = useRunner();

  const [orders, setOrders] = useState([]);
  const [errands, setErrands] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all'); // all | orders | errands

  const fetchHistory = useCallback(async () => {
    if (!runner) return;
    setLoading(true);

    const [{ data: orderData, error: orderErr }, { data: errandData, error: errandErr }] = await Promise.all([
      supabase
        .from('orders')
        .select(`
          id,
          status,
          delivery_fee,
          delivery_hostel,
          accepted_at,
          vendor:vendor_profiles!orders_vendor_id_fkey(legal_name),
          dropoff_zone:delivery_zones!orders_dropoff_zone_id_fkey(name)
        `)
        .eq('rider_id', runner.user_id)
        .in('status', ['delivered', 'cancelled'])
        .order('accepted_at', { ascending: false }),
      supabase
        .from('errands')
        .select('id, title, dropoff_location, reward, status, created_at, claimed_at, completed_at')
        .eq('rider_id', runner.user_id)
        .in('status', ['completed', 'cancelled'])
        .order('created_at', { ascending: false }),
    ]);

    if (orderErr) console.error('Order history fetch error:', orderErr);
    if (errandErr) console.error('Errand history fetch error:', errandErr);

    setOrders(orderData || []);
    setErrands(errandData || []);
    setLoading(false);
  }, [runner, supabase]);

  useEffect(() => { fetchHistory(); }, [fetchHistory]);

  const items = useMemo(() => {
    const combined = [...orders.map(toHistoryOrder), ...errands.map(toHistoryErrand)];
    const filtered = filter === 'all' ? combined : combined.filter(i => i.kind === filter.slice(0, -1));
    return filtered.sort((a, b) => new Date(b.at) - new Date(a.at));
  }, [orders, errands, filter]);

  const totalEarned = useMemo(
    () => items.filter(i => i.isSuccess).reduce((sum, i) => sum + Number(i.fee || 0), 0),
    [items]
  );

  return (
    <main className="min-h-screen w-full bg-slate-50 dark:bg-slate-950 pb-10">
      <div className="sticky top-0 z-10 bg-white dark:bg-slate-950 border-b border-slate-100 dark:border-slate-900 px-5 py-4">
        <h1 className="text-sm font-black tracking-tight">History</h1>
        <p className="text-[11px] text-slate-400">Your past deliveries and errands</p>
      </div>

      <div className="px-5 py-4 max-w-lg md:max-w-3xl mx-auto space-y-4">
        <div className={`${cardClass} flex items-center justify-between`}>
          <div>
            <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">Total earned (completed)</p>
            <p className="text-lg font-black tracking-tight text-emerald-600 dark:text-emerald-400">₦{totalEarned.toLocaleString()}</p>
          </div>
          <button onClick={fetchHistory} className="text-slate-400 hover:text-blue-500 transition-colors">
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>

        <div className="flex gap-2">
          {[
            { key: 'all', label: 'All' },
            { key: 'orders', label: 'Deliveries' },
            { key: 'errands', label: 'Errands' },
          ].map(t => (
            <button
              key={t.key}
              onClick={() => setFilter(t.key)}
              className={`px-3 py-1.5 rounded-xl text-[11px] font-black transition-all ${
                filter === t.key
                  ? 'bg-blue-600 text-white'
                  : 'bg-white dark:bg-slate-900 text-slate-500 border border-slate-200 dark:border-slate-800'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {loading && items.length === 0 && (
          <div className="flex justify-center py-16">
            <Loader2 className="w-5 h-5 text-slate-300 animate-spin" />
          </div>
        )}

        {!loading && items.length === 0 && (
          <div className="text-center py-16 space-y-2">
            <Package className="w-8 h-8 text-slate-300 mx-auto" />
            <p className="text-xs font-bold text-slate-400">No history yet</p>
            <p className="text-[11px] text-slate-400">Completed deliveries and errands will show up here.</p>
          </div>
        )}

        <div className="space-y-2.5">
          {items.map((item) => (
            <div key={`${item.kind}-${item.id}`} className={cardClass}>
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-3">
                  <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${
                    item.kind === 'order' ? 'bg-blue-500/10 text-blue-500' : 'bg-purple-500/10 text-purple-500'
                  }`}>
                    {item.kind === 'order' ? <Package className="w-4 h-4" /> : <Bike className="w-4 h-4" />}
                  </div>
                  <div>
                    <h3 className="text-xs font-black tracking-tight">{item.title}</h3>
                    <p className="text-[11px] text-slate-400 flex items-center gap-1 mt-0.5">
                      <MapPin className="w-3 h-3" /> {item.dropoff}
                    </p>
                    <p className="text-[10px] text-slate-400 mt-0.5">{formatDate(item.at)}</p>
                  </div>
                </div>

                <div className="text-right shrink-0">
                  <div className={`flex items-center gap-1 justify-end text-[10px] font-black uppercase tracking-wider ${
                    item.isSuccess ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-500'
                  }`}>
                    {item.isSuccess ? <CheckCircle2 className="w-3 h-3" /> : <XCircle className="w-3 h-3" />}
                    {item.status}
                  </div>
                  {item.isSuccess && (
                    <p className="flex items-center gap-1 justify-end text-xs font-black text-slate-700 dark:text-slate-300 mt-1">
                      <Wallet className="w-3 h-3" /> ₦{Number(item.fee || 0).toLocaleString()}
                    </p>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}