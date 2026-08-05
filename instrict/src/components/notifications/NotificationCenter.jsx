'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/utils/supabase/client';
import { Bell, ShoppingBag, CheckCircle2, RefreshCw, BellOff, Trash2, MessageCircle, Heart } from 'lucide-react';

const typeConfig = {
  new_order:         { icon: ShoppingBag,   color: 'bg-blue-500/10 text-blue-500',    dot: 'bg-blue-500' },
  payment_confirmed: { icon: CheckCircle2,  color: 'bg-emerald-500/10 text-emerald-500', dot: 'bg-emerald-500' },
  status_changed:    { icon: RefreshCw,     color: 'bg-purple-500/10 text-purple-500', dot: 'bg-purple-500' },
  errand_accepted:   { icon: Bell,          color: 'bg-amber-500/10 text-amber-500',   dot: 'bg-amber-500' },
  community_tag:     { icon: MessageCircle, color: 'bg-pink-500/10 text-pink-500',     dot: 'bg-pink-500' },
  community_comment: { icon: MessageCircle, color: 'bg-pink-500/10 text-pink-500',     dot: 'bg-pink-500' },
  community_like:    { icon: Heart,         color: 'bg-rose-500/10 text-rose-500',     dot: 'bg-rose-500' },
};

// Route shape differs per portal (student vs rider currently share this
// component). Add an entry here rather than hardcoding paths inline —
// vendor doesn't belong in this map at all since it has no routes (see
// VendorNotifications.js, which resolves to a section instead of a URL).
//
// Every entry MUST be a function, even ones that ignore the id — order and
// community are both called as routes.order(id) / routes.community(id) in
// resolveDestination below. A plain string here throws a TypeError the
// moment someone clicks that notification type.
const PORTAL_ROUTES = {
  student: {
    order: (id) => `/orders/${id}`,
    community: (id) => `/community?highlight=${id}`,
  },
  rider: {
    // NOTE: assumed /jobs has no per-job detail route yet (never confirmed) —
    // change to `(id) => \`/jobs/${id}\`` once that route exists.
    order: () => `/jobs`,
    community: (id) => `/runner/community?highlight=${id}`,
  },
};

// Where a tap should land, based on what the notification is actually about.
// order_id wins if present (order-related types); related_post_id otherwise.
function resolveDestination(n, portal) {
  const routes = PORTAL_ROUTES[portal] || PORTAL_ROUTES.student;
  if (n.order_id) return routes.order(n.order_id);
  if (n.related_post_id) return routes.community(n.related_post_id);
  return null;
}

export default function NotificationCenter({ onNavigate, portal = 'student' } = {}) {
  const supabase = createClient();
  const router = useRouter();
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);

  // This component now mounts more than once at the same time (e.g. desktop
  // sidebar + mobile top bar, one just hidden via CSS, not unmounted).
  // Supabase dedupes channels by name, so a shared fixed name causes the
  // second instance's `.on()` call to hit an already-subscribing channel
  // and throw. A random suffix per instance keeps them independent.
  const channelNameRef = useRef(`student-notifications-${crypto.randomUUID()}`);

  useEffect(() => {
    fetchNotifications();
    const channel = supabase
      .channel(channelNameRef.current)
      .on('postgres_changes', {
        event: 'INSERT', schema: 'public', table: 'notifications',
      }, payload => setNotifications(prev => [payload.new, ...prev]))
      .subscribe();
    return () => supabase.removeChannel(channel);
  }, []);

  const fetchNotifications = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { data } = await supabase
      .from('notifications')
      .select('*')
      .eq('vendor_id', user.id)
      .order('created_at', { ascending: false })
      .limit(50);
    setNotifications(data || []);
    setLoading(false);
  };

  const markRead = async (id) => {
    await supabase.from('notifications').update({ is_read: true }).eq('id', id);
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n));
  };

  const handleClick = (n) => {
    if (!n.is_read) markRead(n.id);
    const dest = resolveDestination(n, portal);
    if (dest) {
      onNavigate?.();
      router.push(dest);
    }
  };

  const deleteOne = async (id) => {
    await supabase.from('notifications').delete().eq('id', id);
    setNotifications(prev => prev.filter(n => n.id !== id));
  };

  const markAllRead = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    await supabase.from('notifications').update({ is_read: true }).eq('vendor_id', user.id).eq('is_read', false);
    setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
  };

  const unread = notifications.filter(n => !n.is_read).length;

  if (loading) return (
    <div className="space-y-3 animate-pulse">
      {[1,2,3].map(i => (
        <div key={i} className="flex gap-3 p-3">
          <div className="w-9 h-9 bg-slate-200 dark:bg-slate-800 rounded-xl" />
          <div className="flex-1 space-y-2">
            <div className="h-3 w-1/2 bg-slate-200 dark:bg-slate-800 rounded" />
            <div className="h-2 w-3/4 bg-slate-200 dark:bg-slate-800 rounded" />
          </div>
        </div>
      ))}
    </div>
  );

  return (
    <div className="space-y-4 px-4 sm:px-1">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-sm font-black tracking-tight text-slate-900 dark:text-white">Notifications</h2>
          <p className="text-[11px] text-slate-400">{unread > 0 ? `${unread} unread` : 'All caught up'}</p>
        </div>
        {unread > 0 && (
          <button onClick={markAllRead} className="text-[11px] font-bold text-blue-500 hover:text-blue-600 transition-colors">
            Mark all read
          </button>
        )}
      </div>

      {notifications.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <div className="w-12 h-12 bg-slate-100 dark:bg-slate-800 rounded-2xl flex items-center justify-center mb-3">
            <BellOff className="w-6 h-6 text-slate-400" />
          </div>
          <p className="text-xs font-black text-slate-400">No notifications yet</p>
          <p className="text-[11px] text-slate-300 dark:text-slate-600 mt-1">Order updates will appear here</p>
        </div>
      ) : (
        <div className="space-y-1">
          {notifications.map(n => {
            const cfg = typeConfig[n.type] || typeConfig.new_order;
            const Icon = cfg.icon;
            const clickable = !!resolveDestination(n, portal);
            return (
              <div
                key={n.id}
                onClick={() => handleClick(n)}
                className={`flex items-start gap-3 p-3 rounded-xl ${clickable ? 'cursor-pointer' : 'cursor-default'} hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors group ${!n.is_read ? 'bg-blue-500/[0.02]' : ''}`}
              >
                <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${cfg.color}`}>
                  <Icon className="w-4 h-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-1">
                    <p className={`text-[11px] leading-snug ${n.is_read ? 'font-medium text-slate-500 dark:text-slate-400' : 'font-black text-slate-900 dark:text-white'}`}>
                      {n.title}
                    </p>
                    {!n.is_read && <span className={`w-2 h-2 rounded-full shrink-0 mt-1 ${cfg.dot}`} />}
                  </div>
                  <p className="text-[10px] text-slate-400 mt-0.5">{n.body}</p>
                  <p className="text-[10px] text-slate-300 dark:text-slate-600 mt-1">
                    {new Date(n.created_at).toLocaleDateString('en-NG', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>
                <button
                  onClick={e => { e.stopPropagation(); deleteOne(n.id); }}
                  className="opacity-0 group-hover:opacity-100 p-1 rounded-lg text-slate-300 hover:text-rose-500 transition-all"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}