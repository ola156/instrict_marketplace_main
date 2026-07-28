'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/utils/supabase/client';
import {
  TrendingUp,
  ShoppingBag,
  Clock,
  CheckCircle2,
  AlertCircle,
  ArrowUpRight,
} from 'lucide-react';

function StatCard({ label, value, sub, icon: Icon, color }) {
  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl p-4 space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">{label}</span>
        <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${color}`}>
          <Icon className="w-4 h-4" />
        </div>
      </div>
      <div>
        <p className="text-2xl font-black tracking-tight text-slate-900 dark:text-white">{value}</p>
        {sub && <p className="text-[11px] text-slate-400 mt-0.5">{sub}</p>}
      </div>
    </div>
  );
}

export default function CanteenOverview({ vendorUserId }) {
  const supabase = createClient();
  const [stats, setStats] = useState({
    todayEarnings: 0,
    totalOrders: 0,
    pendingOrders: 0,
    completedOrders: 0,
  });
  const [recentOrders, setRecentOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const { data: orders } = await supabase
      .from('orders')
      .select('id, status, total, created_at, payment_status')
      .eq('vendor_id', vendorUserId)
      .gte('created_at', today.toISOString())
      .order('created_at', { ascending: false });

    if (orders) {
      const paid = orders.filter(o => o.payment_status === 'paid');
      const todayEarnings = paid.reduce((sum, o) => sum + Number(o.total), 0);
      const pending = orders.filter(o => ['pending', 'confirmed', 'preparing'].includes(o.status));
      const completed = orders.filter(o => ['delivered', 'picked_up'].includes(o.status));

      setStats({
        todayEarnings,
        totalOrders: orders.length,
        pendingOrders: pending.length,
        completedOrders: completed.length,
      });
      setRecentOrders(orders.slice(0, 5));
    }

    setLoading(false);
  };

  const statusConfig = {
    pending:   { label: 'Pending',   color: 'text-amber-500 bg-amber-500/10' },
    confirmed: { label: 'Confirmed', color: 'text-blue-500 bg-blue-500/10' },
    preparing: { label: 'Preparing', color: 'text-purple-500 bg-purple-500/10' },
    ready:     { label: 'Ready',     color: 'text-emerald-500 bg-emerald-500/10' },
    delivered: { label: 'Delivered', color: 'text-slate-400 bg-slate-100 dark:bg-slate-800' },
    picked_up: { label: 'Picked up', color: 'text-slate-400 bg-slate-100 dark:bg-slate-800' },
    cancelled: { label: 'Cancelled', color: 'text-rose-500 bg-rose-500/10' },
  };

  if (loading) {
    return (
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="bg-slate-100 dark:bg-slate-800 rounded-2xl h-28 animate-pulse" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Today's earnings"
          value={`₦${stats.todayEarnings.toLocaleString()}`}
          sub="Paid orders only"
          icon={TrendingUp}
          color="bg-blue-500/10 text-blue-500"
        />
        <StatCard
          label="Total orders"
          value={stats.totalOrders}
          sub="Since midnight"
          icon={ShoppingBag}
          color="bg-purple-500/10 text-purple-500"
        />
        <StatCard
          label="In progress"
          value={stats.pendingOrders}
          sub="Needs attention"
          icon={Clock}
          color="bg-amber-500/10 text-amber-500"
        />
        <StatCard
          label="Completed"
          value={stats.completedOrders}
          sub="Today"
          icon={CheckCircle2}
          color="bg-emerald-500/10 text-emerald-500"
        />
      </div>

      {/* Recent orders */}
      <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 dark:border-slate-800">
          <h3 className="text-xs font-black uppercase tracking-widest text-slate-900 dark:text-white">
            Today's orders
          </h3>
          <span className="text-[10px] text-slate-400 font-medium">{stats.totalOrders} total</span>
        </div>

        {recentOrders.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <div className="w-10 h-10 bg-slate-100 dark:bg-slate-800 rounded-xl flex items-center justify-center mb-3">
              <ShoppingBag className="w-5 h-5 text-slate-400" />
            </div>
            <p className="text-xs font-bold text-slate-400">No orders yet today</p>
            <p className="text-[11px] text-slate-300 dark:text-slate-600 mt-1">Orders will appear here when students place them</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-50 dark:divide-slate-800">
            {recentOrders.map(order => {
              const cfg = statusConfig[order.status] || statusConfig.pending;
              return (
                <div key={order.id} className="flex items-center justify-between px-5 py-3.5">
                  <div className="space-y-0.5">
                    <p className="text-xs font-bold text-slate-900 dark:text-white">
                      Order #{order.id.slice(0, 8).toUpperCase()}
                    </p>
                    <p className="text-[11px] text-slate-400">
                      {new Date(order.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className={`text-[10px] font-black px-2 py-1 rounded-lg ${cfg.color}`}>
                      {cfg.label}
                    </span>
                    <span className="text-xs font-black text-slate-900 dark:text-white">
                      ₦{Number(order.total).toLocaleString()}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}