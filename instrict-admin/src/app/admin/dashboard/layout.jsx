'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  ShieldCheck,
  ClipboardList,
  Map,
  Wallet,
  LogOut,
  Bell,
  LifeBuoy,
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { createClient } from '@/utils/supabase/client';
import { useRouter } from 'next/navigation';
import { useAdminPushNotifications } from '@/hooks/useAdminPushNotifications';

// Core ops nav — the only items that appear in the mobile bottom tab bar.
const NAV_ITEMS = [
  { href: '/admin/dashboard/approvals', label: 'Approvals', icon: ShieldCheck },
  { href: '/admin/dashboard/orders', label: 'Orders', icon: ClipboardList },
  { href: '/admin/dashboard/zones', label: 'Campuses & Zones', icon: Map },
  { href: '/admin/dashboard/wallets', label: 'Wallets', icon: Wallet },
  { href: '/admin/dashboard/accounts', label: 'Accounts', icon: ClipboardList },
];

// Secondary items — Support and Notifications sit together, side by side,
// in the sidebar (desktop) and the top bar (mobile). Never in the bottom
// tab bar.
const SECONDARY_ITEMS = [
  { href: '/admin/dashboard/support', label: 'Support', icon: LifeBuoy },
  { href: '/admin/dashboard/notifications', label: 'Notifications', icon: Bell },
];

export default function AdminLayout({ children }) {
  const pathname = usePathname();
  const router = useRouter();
  const supabase = createClient();
  const [adminUserId, setAdminUserId] = useState(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) setAdminUserId(user.id);
    });
  }, []);

  useAdminPushNotifications(adminUserId);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/admin/auth');
  };

  return (
    <div className="min-h-screen bg-slate-950 text-white flex">
      {/* Sidebar — visible md and up */}
      <aside className="hidden md:flex md:w-60 md:flex-col border-r border-slate-900 bg-slate-950 p-4 shrink-0">
        <div className="flex items-center gap-2 px-2 py-3 mb-4">
          <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          <span className="text-xs font-black tracking-widest uppercase text-slate-400">
            Instrict Admin
          </span>
        </div>

        <nav className="flex-1 space-y-1">
          {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
            const active = pathname.startsWith(href);
            return (
              <Link
                key={href}
                href={href}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-bold transition-colors ${
                  active
                    ? 'bg-emerald-500/10 text-emerald-400'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
                }`}
              >
                <Icon className="w-4 h-4" />
                {label}
              </Link>
            );
          })}

          {SECONDARY_ITEMS.map(({ href, label, icon: Icon }) => {
            const active = pathname.startsWith(href);
            return (
              <Link
                key={href}
                href={href}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-bold transition-colors ${
                  active
                    ? 'bg-emerald-500/10 text-emerald-400'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
                }`}
              >
                <Icon className="w-4 h-4" />
                {label}
              </Link>
            );
          })}
        </nav>

        <button
          onClick={handleLogout}
          className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-bold text-slate-500 hover:text-rose-400 hover:bg-slate-900 transition-colors"
        >
          <LogOut className="w-4 h-4" />
          Log out
        </button>
      </aside>

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top bar — mobile only, holds Support + Notifications side by side */}
        <div className="md:hidden flex items-center justify-between px-4 py-3 border-b border-slate-900 bg-slate-950 sticky top-0 z-40">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-xs font-black tracking-widest uppercase text-slate-400">
              Instrict Admin
            </span>
          </div>
          <div className="flex items-center gap-1">
            {SECONDARY_ITEMS.map(({ href, label, icon: Icon }) => {
              const active = pathname.startsWith(href);
              return (
                <Link
                  key={href}
                  href={href}
                  className={`p-2 rounded-lg transition-colors ${
                    active
                      ? 'bg-emerald-500/10 text-emerald-400'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
                  }`}
                >
                  <Icon className="w-5 h-5" />
                </Link>
              );
            })}
          </div>
        </div>

        <div className="flex-1 pb-20 md:pb-0 overflow-y-auto">{children}</div>

        {/* Bottom tab bar — mobile only, core ops nav only */}
        <nav className="md:hidden fixed bottom-0 left-0 right-0 border-t border-slate-900 bg-slate-950/95 backdrop-blur flex justify-around py-2 z-50">
          {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
            const active = pathname.startsWith(href);
            return (
              <Link
                key={href}
                href={href}
                className={`flex flex-col items-center gap-1 px-2 py-1 text-[10px] font-bold ${
                  active ? 'text-emerald-400' : 'text-slate-500'
                }`}
              >
                <Icon className="w-5 h-5" />
                {label}
              </Link>
            );
          })}
        </nav>
      </div>
    </div>
  );
}