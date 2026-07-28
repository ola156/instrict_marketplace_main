'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/utils/supabase/client';
import { MessageSquare, Briefcase, TrendingUp, Calendar } from 'lucide-react';

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

export default function VariableServiceOverview({ vendorUserId }) {
  const supabase = createClient();
  const [stats, setStats] = useState({
    pendingQuotes: 0,
    activeProjects: 0,
    todayRevenue: 0,
    availableSlots: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => { fetchStats(); }, []);

  const fetchStats = async () => {
    const today = new Date().toISOString().split('T')[0];

    const [
      { count: pendingQuotes },
      { count: activeProjects },
      { data: completedToday },
      { count: availableSlots },
    ] = await Promise.all([
      supabase.from('quote_requests').select('*', { count: 'exact', head: true }).eq('vendor_id', vendorUserId).eq('status', 'pending'),
      supabase.from('quote_requests').select('*', { count: 'exact', head: true }).eq('vendor_id', vendorUserId).in('status', ['accepted', 'in_progress']),
      supabase.from('quote_requests').select('quoted_price').eq('vendor_id', vendorUserId).eq('status', 'completed').gte('updated_at', today),
      supabase.from('availability_slots').select('*', { count: 'exact', head: true }).eq('vendor_id', vendorUserId).eq('is_booked', false).gte('date', today),
    ]);

    setStats({
      pendingQuotes: pendingQuotes || 0,
      activeProjects: activeProjects || 0,
      todayRevenue: (completedToday || []).reduce((sum, q) => sum + Number(q.quoted_price || 0), 0),
      availableSlots: availableSlots || 0,
    });
    setLoading(false);
  };

  if (loading) {
    return (
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => <div key={i} className="h-24 bg-slate-100 dark:bg-slate-800 rounded-2xl animate-pulse" />)}
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-sm font-black tracking-tight text-slate-900 dark:text-white">Overview</h2>
        <p className="text-[11px] text-slate-400 mt-0.5">Today's snapshot</p>
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Pending Quotes" value={stats.pendingQuotes} icon={MessageSquare} color="bg-amber-500/10 text-amber-500" />
        <StatCard label="Active Projects" value={stats.activeProjects} icon={Briefcase} color="bg-indigo-500/10 text-indigo-500" />
        <StatCard label="Today's Revenue" value={`₦${stats.todayRevenue.toLocaleString()}`} icon={TrendingUp} color="bg-emerald-500/10 text-emerald-500" />
        <StatCard label="Open Slots" value={stats.availableSlots} icon={Calendar} color="bg-blue-500/10 text-blue-500" />
      </div>
    </div>
  );
}