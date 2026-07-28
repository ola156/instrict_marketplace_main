'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/utils/supabase/client';
import {
  Bell,
  ShoppingBag,
  CheckCircle2,
  RefreshCw,
  BellOff,
  Trash2,
} from 'lucide-react';

const typeConfig = {
  new_order: {
    icon: ShoppingBag,
    color: 'bg-blue-500/10 text-blue-500',
    dot: 'bg-blue-500',
  },
  payment_confirmed: {
    icon: CheckCircle2,
    color: 'bg-emerald-500/10 text-emerald-500',
    dot: 'bg-emerald-500',
  },
  status_changed: {
    icon: RefreshCw,
    color: 'bg-purple-500/10 text-purple-500',
    dot: 'bg-purple-500',
  },
};

function NotificationRow({ notification, onRead, onDelete }) {
  const cfg = typeConfig[notification.type] || typeConfig.new_order;
  const Icon = cfg.icon;

  return (
    <div
      className={`flex items-start gap-3 px-5 py-4 hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors group ${
        !notification.is_read ? 'bg-blue-500/[0.02]' : ''
      }`}
    >
      {/* Icon */}
      <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 mt-0.5 ${cfg.color}`}>
        <Icon className="w-4 h-4" />
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0" onClick={() => !notification.is_read && onRead(notification.id)}>
        <div className="flex items-start justify-between gap-2">
          <p className={`text-xs leading-snug ${
            notification.is_read
              ? 'font-medium text-slate-600 dark:text-slate-400'
              : 'font-black text-slate-900 dark:text-white'
          }`}>
            {notification.title}
          </p>
          {!notification.is_read && (
            <span className={`w-2 h-2 rounded-full shrink-0 mt-1 ${cfg.dot}`} />
          )}
        </div>
        <p className="text-[11px] text-slate-400 mt-0.5 leading-relaxed">{notification.body}</p>
        <p className="text-[10px] text-slate-300 dark:text-slate-600 mt-1.5">
          {new Date(notification.created_at).toLocaleDateString('en-NG', {
            day: 'numeric', month: 'short',
            hour: '2-digit', minute: '2-digit',
          })}
        </p>
      </div>

      {/* Delete */}
      <button
        onClick={() => onDelete(notification.id)}
        className="opacity-0 group-hover:opacity-100 p-1.5 rounded-lg text-slate-300 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-500/10 transition-all shrink-0"
      >
        <Trash2 className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}

export default function VendorNotifications({ vendor }) {
  const supabase = createClient();
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all'); // all | unread

  useEffect(() => {
    fetchNotifications();

    // Real-time: new notifications pop in instantly
    const channel = supabase
      .channel('vendor-notifications')
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'notifications',
        filter: `vendor_id=eq.${vendor.user_id}`,
      }, payload => {
        setNotifications(prev => [payload.new, ...prev]);
      })
      .subscribe();

    return () => supabase.removeChannel(channel);
  }, []);

  const fetchNotifications = async () => {
    const { data } = await supabase
      .from('notifications')
      .select('*')
      .eq('vendor_id', vendor.user_id)
      .order('created_at', { ascending: false })
      .limit(100);

    setNotifications(data || []);
    setLoading(false);
  };

  const markRead = async (id) => {
    await supabase.from('notifications').update({ is_read: true }).eq('id', id);
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n));
  };

  const markAllRead = async () => {
    await supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('vendor_id', vendor.user_id)
      .eq('is_read', false);
    setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
  };

  const deleteNotification = async (id) => {
    await supabase.from('notifications').delete().eq('id', id);
    setNotifications(prev => prev.filter(n => n.id !== id));
  };

  const clearAll = async () => {
    await supabase.from('notifications').delete().eq('vendor_id', vendor.user_id);
    setNotifications([]);
  };

  const unreadCount = notifications.filter(n => !n.is_read).length;
  const filtered = filter === 'unread'
    ? notifications.filter(n => !n.is_read)
    : notifications;

  return (
    <div className="space-y-5 max-w-2xl">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-sm font-black tracking-tight text-slate-900 dark:text-white">Notifications</h2>
          <p className="text-[11px] text-slate-400 mt-0.5">
            {unreadCount > 0 ? `${unreadCount} unread` : 'All caught up'}
          </p>
        </div>
        {notifications.length > 0 && (
          <div className="flex items-center gap-2">
            {unreadCount > 0 && (
              <button
                onClick={markAllRead}
                className="text-[11px] font-bold text-blue-500 hover:text-blue-600 transition-colors"
              >
                Mark all read
              </button>
            )}
            <button
              onClick={clearAll}
              className="text-[11px] font-bold text-slate-400 hover:text-rose-500 transition-colors"
            >
              Clear all
            </button>
          </div>
        )}
      </div>

      {/* Filter tabs */}
      <div className="flex gap-1 p-1 bg-slate-100 dark:bg-slate-800 rounded-xl w-fit">
        {['all', 'unread'].map(tab => (
          <button
            key={tab}
            onClick={() => setFilter(tab)}
            className={`px-4 py-1.5 rounded-lg text-[11px] font-black tracking-tight capitalize transition-all ${
              filter === tab
                ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-300'
            }`}
          >
            {tab}
            {tab === 'unread' && unreadCount > 0 && (
              <span className="ml-1.5 px-1.5 py-0.5 bg-blue-500 text-white text-[9px] font-black rounded-full">
                {unreadCount}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* List */}
      <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl overflow-hidden">
        {loading ? (
          <div className="space-y-px">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="flex items-start gap-3 px-5 py-4">
                <div className="w-9 h-9 bg-slate-100 dark:bg-slate-800 rounded-xl animate-pulse shrink-0" />
                <div className="flex-1 space-y-2">
                  <div className="h-3 bg-slate-100 dark:bg-slate-800 rounded-lg w-1/2 animate-pulse" />
                  <div className="h-2.5 bg-slate-100 dark:bg-slate-800 rounded-lg w-3/4 animate-pulse" />
                </div>
              </div>
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="w-12 h-12 bg-slate-100 dark:bg-slate-800 rounded-2xl flex items-center justify-center mb-3">
              {filter === 'unread' ? (
                <CheckCircle2 className="w-6 h-6 text-slate-400" />
              ) : (
                <BellOff className="w-6 h-6 text-slate-400" />
              )}
            </div>
            <p className="text-xs font-black text-slate-400">
              {filter === 'unread' ? 'No unread notifications' : 'No notifications yet'}
            </p>
            <p className="text-[11px] text-slate-300 dark:text-slate-600 mt-1">
              {filter === 'unread' ? 'You\'re all caught up' : 'Order activity will appear here'}
            </p>
          </div>
        ) : (
          <div className="divide-y divide-slate-50 dark:divide-slate-800">
            {filtered.map(notification => (
              <NotificationRow
                key={notification.id}
                notification={notification}
                onRead={markRead}
                onDelete={deleteNotification}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}