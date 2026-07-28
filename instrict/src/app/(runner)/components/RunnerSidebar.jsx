'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Power, Bell } from 'lucide-react';
import { useRunner } from '../context/RunnerProvider';
import { RUNNER_NAV_ITEMS } from './navItems';
import Image from 'next/image';

export default function RunnerSidebar() {
  const pathname = usePathname();
  const { runner, hasActiveJob, toggleOnline, togglingOnline, showNotifications, toggleNotifications, unreadCount } = useRunner();

  return (
    <aside className="hidden md:flex w-60 shrink-0 h-screen sticky top-0 flex-col border-r border-slate-100 dark:border-slate-900 bg-white dark:bg-slate-950 px-4 py-6">
      <div className="flex items-center justify-between gap-1 px-2 mb-8">
        <div className="flex items-center gap-1">
          <div className="relative h-6 w-6 overflow-hidden rounded-md flex items-center justify-center transition-transform duration-500 group-hover:rotate-[15deg]">
            <Image
              src="/logo.svg"
              alt="Instrict Logo"
              width={20}
              height={18}
              className="object-contain"
            />
          </div>
          <span className="text-lg font-black tracking-tighter">
            Instrict <span className="text-blue-500">Runner.</span>
          </span>
        </div>

        <button
          onClick={toggleNotifications}
          className={`relative p-2 rounded-xl transition-colors ${
            showNotifications
              ? 'bg-blue-500/10 text-blue-600 dark:text-blue-400'
              : 'text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          <Bell className="w-4 h-4" />
          {unreadCount > 0 && (
            <span className="absolute top-1 right-1 w-2 h-2 bg-rose-500 rounded-full" />
          )}
        </button>
      </div>

      <nav className="flex-1 space-y-1">
        {RUNNER_NAV_ITEMS.map(({ href, label, icon: Icon, badgeKey }) => {
          const isActive = !showNotifications && (pathname === href || pathname.startsWith(`${href}/`));
          const showBadge = badgeKey === 'hasActiveJob' && hasActiveJob;
          return (
            <Link
              key={href}
              href={href}
              onClick={() => { if (showNotifications) toggleNotifications(); }}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-black tracking-tight transition-all relative ${
                isActive
                  ? 'bg-blue-500/10 text-blue-600 dark:text-blue-400'
                  : 'text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-900 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <Icon className="w-4 h-4" />
              {label}
              {showBadge && (
                <span className="absolute right-3 top-1/2 -translate-y-1/2 w-1.5 h-1.5 rounded-full bg-emerald-500" />
              )}
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-slate-100 dark:border-slate-900 pt-4 space-y-3">
        <div className="px-2">
          <p className="text-xs font-black tracking-tight truncate">{runner?.full_name}</p>
          <p className="text-[10px] text-slate-400">{runner?.is_active ? 'Online' : 'Offline'}</p>
        </div>
        <button
          onClick={toggleOnline}
          disabled={togglingOnline || !runner?.approved}
          title={!runner?.approved ? 'Available once your application is approved' : undefined}
          className={`w-full flex items-center justify-center gap-1.5 h-9 rounded-xl text-[11px] font-black tracking-tight transition-all disabled:opacity-50 ${
            runner?.is_active
              ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
              : 'bg-slate-100 dark:bg-slate-800 text-slate-500'
          }`}
        >
          <Power className="w-3.5 h-3.5" />
          {!runner?.approved ? 'Pending approval' : runner?.is_active ? 'Go offline' : 'Go online'}
        </button>
      </div>
    </aside>
  );
}