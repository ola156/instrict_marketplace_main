'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useRunner } from '../context/RunnerProvider';
import { RUNNER_NAV_ITEMS } from './navItems';

export default function RunnerBottomNav() {
  const pathname = usePathname();
  const { hasActiveJob } = useRunner();

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-20 bg-white dark:bg-slate-950 border-t border-slate-100 dark:border-slate-900 px-2 py-2 flex items-center justify-between">
      {RUNNER_NAV_ITEMS.filter(item => !item.desktopOnly).map(({ href, label, icon: Icon, badgeKey }) => {
        const isActive = pathname === href || pathname.startsWith(`${href}/`);
        const showBadge = badgeKey === 'hasActiveJob' && hasActiveJob;
        return (
          <Link
            key={href}
            href={href}
            className={`flex-1 flex flex-col items-center gap-0.5 py-1.5 rounded-lg ${
              isActive ? 'text-blue-600 dark:text-blue-400' : 'text-slate-400'
            }`}
          >
            <div className="relative">
              <Icon className="w-4.5 h-4.5" />
              {showBadge && (
                <span className="absolute -top-0.5 -right-0.5 w-1.5 h-1.5 rounded-full bg-emerald-500" />
              )}
            </div>
            <span className="text-[9px] font-black tracking-tight">{label}</span>
          </Link>
        );
      })}
    </nav>
  );
}