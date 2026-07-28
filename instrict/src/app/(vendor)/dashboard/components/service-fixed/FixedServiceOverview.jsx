'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/utils/supabase/client';
import { ClipboardList, TrendingUp, Tags } from 'lucide-react';

function StatCard({ label, value, icon: Icon, color }) {
  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl p-4 space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">{label}</span>
        <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${color}`}>
          <Icon className="w-4 h-4" />
        </div>
      </div>
      <p className="text-2xl font-black tracking-tight text-slate-900 dark:text-white">{value}</p>
    </div>
  );
}

export default function FixedServiceOverview({ vendorUserId }) {
  const supabase = createClient();
  const [stats, setStats] = useState({ newJobs: 0, ratesCount: 0, todayRevenue: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Guard: subscribing before vendorUserId resolves would lock the
    // channel filter to `vendor_id=eq.undefined` forever — re-run once
    // the real id lands.
    if (!vendorUserId) return;

    fetchStats();

    // Realtime: any change on this vendor's orders (new job placed, status
    // flipped, paid marked) refreshes the stat cards live instead of only
    // on page load.
    const channel = supabase
      .channel(`fixed-service-overview-${vendorUserId}`)
      .on('postgres_changes', {
        event: '*', schema: 'public', table: 'orders',
        filter: `vendor_id=eq.${vendorUserId}`,
      }, fetchStats)
      .subscribe();

    return () => supabase.removeChannel(channel);
  }, [vendorUserId]);

 const fetchStats = async () => {
  const todayStart = new Date(); todayStart.setHours(0, 0, 0, 0);

  const [{ count: newJobs }, { count: ratesCount }, { data: todayOrders }] = await Promise.all([
    // Orders are only ever created after payment succeeds, starting at
    // status 'confirmed' — there's no separate 'pending, unpaid' stage
    // to filter out anymore, so "new" means confirmed and not yet started.
    supabase.from('orders').select('*', { count: 'exact', head: true }).eq('vendor_id', vendorUserId).eq('order_type', 'print').eq('status', 'confirmed'),
    supabase.from('service_price_matrix').select('*', { count: 'exact', head: true }).eq('vendor_id', vendorUserId),
    // Revenue should reflect what the vendor is actually paid — subtotal
    // only, not delivery_fee (rider's cut) or service_charge (platform's cut).
    supabase.from('orders').select('subtotal').eq('vendor_id', vendorUserId).eq('order_type', 'print').eq('payment_status', 'paid').gte('created_at', todayStart.toISOString()),
  ]);

  setStats({
    newJobs: newJobs || 0,
    ratesCount: ratesCount || 0,
    todayRevenue: (todayOrders || []).reduce((sum, o) => sum + Number(o.subtotal), 0),
  });
  setLoading(false);
};

  if (loading) {
    return (
      <div className="grid grid-cols-3 gap-4">
        {[...Array(3)].map((_, i) => <div key={i} className="h-24 bg-slate-100 dark:bg-slate-800 rounded-2xl animate-pulse" />)}
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-sm font-black tracking-tight text-slate-900 dark:text-white">Overview</h2>
        <p className="text-[11px] text-slate-400 mt-0.5">Today's snapshot</p>
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
        <StatCard label="New Jobs" value={stats.newJobs} icon={ClipboardList} color="bg-blue-500/10 text-blue-500" />
        <StatCard label="Rates Listed" value={stats.ratesCount} icon={Tags} color="bg-purple-500/10 text-purple-500" />
        <StatCard label="Today's Revenue" value={`₦${stats.todayRevenue.toLocaleString()}`} icon={TrendingUp} color="bg-emerald-500/10 text-emerald-500" />
      </div>
    </div>
  );
}