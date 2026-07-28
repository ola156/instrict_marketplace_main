'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/utils/supabase/client';
import { useRouter, useSearchParams } from 'next/navigation';
import { ShoppingBag, Clock, CheckCircle2, XCircle, Truck, Store, ChevronRight } from 'lucide-react';

function timeAgo(d) {
  const s = (Date.now() - new Date(d)) / 1000;
  if (s < 60) return 'just now';
  if (s < 3600) return `${Math.floor(s/60)}m ago`;
  if (s < 86400) return `${Math.floor(s/3600)}h ago`;
  return new Date(d).toLocaleDateString('en-NG', { day:'numeric', month:'short', hour:'2-digit', minute:'2-digit' });
}

const statusConfig = {
  pending:   { label: 'Pending',   color: 'bg-amber-500/10 text-amber-600 dark:text-amber-400',    icon: Clock },
  confirmed: { label: 'Confirmed', color: 'bg-blue-500/10 text-blue-600 dark:text-blue-400',       icon: CheckCircle2 },
  preparing: { label: 'Preparing', color: 'bg-purple-500/10 text-purple-600 dark:text-purple-400', icon: Clock },
  ready:     { label: 'Ready',     color: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400', icon: CheckCircle2 },
  picked_up: { label: 'Picked up', color: 'bg-slate-100 dark:bg-slate-800 text-slate-500',         icon: Store },
  delivered: { label: 'Delivered', color: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400', icon: CheckCircle2 },
  cancelled: { label: 'Cancelled', color: 'bg-rose-500/10 text-rose-600 dark:text-rose-400',       icon: XCircle },
};

const activeStatuses  = ['pending','confirmed','preparing','ready'];
const doneStatuses    = ['picked_up','delivered','cancelled'];

// Every card — active or history — is a link into the live tracking page.
// This is the one place status updates actually stream in real time, so
// clicking a pending order takes you straight to its current state, not
// a stale snapshot from list-load time.
function OrderCard({ order, isNew, onOpen }) {
  const cfg = statusConfig[order.status] || statusConfig.pending;
  const Icon = cfg.icon;

  return (
    <button
      type="button"
      onClick={() => onOpen(order.id)}
      className={`w-full text-left bg-white dark:bg-slate-900 border rounded-2xl overflow-hidden transition-all hover:border-blue-300 dark:hover:border-blue-700 ${
        isNew ? 'border-blue-300 dark:border-blue-700 ring-2 ring-blue-500/20' : 'border-slate-100 dark:border-slate-800'
      }`}
    >
      <div className="flex items-center justify-between px-4 py-3.5">
        <div className="flex items-center gap-3">
          <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${cfg.color}`}>
            <Icon className="w-4 h-4" />
          </div>
          <div>
            <p className="text-xs font-black text-slate-900 dark:text-white">
              #{order.id.slice(0,8).toUpperCase()}
            </p>
            <p className="text-[10px] text-slate-400">{timeAgo(order.created_at)}</p>
          </div>
        </div>
        <div className="flex items-center gap-2.5">
          <div className="text-right">
            <p className="text-xs font-black text-slate-900 dark:text-white">₦{Number(order.total).toLocaleString()}</p>
            <span className={`text-[9px] font-black px-1.5 py-0.5 rounded-md ${cfg.color}`}>{cfg.label}</span>
          </div>
          <ChevronRight className="w-4 h-4 text-slate-300 dark:text-slate-600" />
        </div>
      </div>
    </button>
  );
}

export default function OrdersPage() {
  const supabase = createClient();
  const router = useRouter();
  const searchParams = useSearchParams();
  const newOrderId = searchParams.get('new');

  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('active');

  useEffect(() => {
    fetchOrders();

    // Real-time order status updates — keeps the list badges (status,
    // active-count) current even while sitting on this page.
    const channel = supabase
      .channel('student-orders')
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'orders' }, () => fetchOrders())
      .subscribe();

    return () => supabase.removeChannel(channel);
  }, []);

  const fetchOrders = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data: profile } = await supabase
      .from('student_profiles')
      .select('id')
      .eq('user_id', user.id)
      .single();

    // Match on requester_id too, so orders placed without a student
    // profile still show up here instead of vanishing from history.
    let query = supabase
      .from('orders')
      .select(`
        id, status, fulfillment_type, delivery_hostel, total, note, created_at, payment_status
      `)
      .order('created_at', { ascending: false });

    query = profile?.id
      ? query.or(`student_id.eq.${profile.id},requester_id.eq.${user.id}`)
      : query.eq('requester_id', user.id);

    const { data } = await query;

    setOrders(data || []);
    setLoading(false);
  };

  const openOrder = (id) => router.push(`/orders/${id}`);

  const active = orders.filter(o => activeStatuses.includes(o.status));
  const history = orders.filter(o => doneStatuses.includes(o.status));
  const displayed = tab === 'active' ? active : history;

  return (
    <div className="w-full space-y-5 max-w-xl px-4 sm:px-1">
      <div>
        <h1 className="text-base font-black tracking-tight text-slate-900 dark:text-white">My Orders</h1>
        <p className="text-[11px] text-slate-400 mt-0.5">Track and manage your orders</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 p-1 bg-slate-100 dark:bg-slate-800 rounded-xl w-fit">
        {[['active','Active'], ['history','History']].map(([key, label]) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={`px-4 py-1.5 rounded-lg text-[11px] font-black transition-all ${
              tab === key
                ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-300'
            }`}
          >
            {label}
            {key === 'active' && active.length > 0 && (
              <span className="ml-1.5 px-1.5 py-0.5 bg-blue-500 text-white text-[9px] font-black rounded-full">
                {active.length}
              </span>
            )}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="space-y-3 animate-pulse">
          {[1,2,3].map(i => (
            <div key={i} className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl p-4">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-xl bg-slate-200 dark:bg-slate-800" />
                <div className="flex-1 space-y-1.5">
                  <div className="h-3 w-1/3 bg-slate-200 dark:bg-slate-800 rounded" />
                  <div className="h-2 w-1/4 bg-slate-200 dark:bg-slate-800 rounded" />
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : displayed.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center border border-dashed border-slate-200 dark:border-slate-800 rounded-2xl">
          <ShoppingBag className="w-10 h-10 text-slate-300 dark:text-slate-700 mb-3" />
          <p className="text-xs font-black text-slate-400">
            {tab === 'active' ? 'No active orders' : 'No order history'}
          </p>
          <p className="text-[11px] text-slate-300 dark:text-slate-600 mt-1">
            {tab === 'active' ? 'Orders you place will appear here' : 'Completed orders will show here'}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {displayed.map(order => (
            <OrderCard
              key={order.id}
              order={order}
              isNew={order.id === newOrderId}
              onOpen={openOrder}
            />
          ))}
        </div>
      )}
    </div>
  );
}