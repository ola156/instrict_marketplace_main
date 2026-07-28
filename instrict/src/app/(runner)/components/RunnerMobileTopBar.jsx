'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { MessageCircle, MessageSquare, Bell } from 'lucide-react';
import Image from 'next/image';
import { useRunner } from '../context/RunnerProvider';

export default function RunnerMobileTopBar() {
  const pathname = usePathname();
  const { showNotifications, toggleNotifications, unreadCount } = useRunner();
  const isCommunityActive = pathname === '/runner/community' || pathname.startsWith('/runner/community/');
  const isSupportActive = pathname === '/runner/help' || pathname.startsWith('/runner/help/');

  return (
    <header className="md:hidden sticky top-0 z-40 w-full bg-white dark:bg-slate-950 border-b border-slate-100 dark:border-slate-900 px-4 py-3 flex items-center justify-between">
      <div className="flex items-center gap-1">
        <div className="relative h-6 w-6 overflow-hidden rounded-md flex items-center justify-center">
          <Image src="/logo.svg" alt="Instrict Logo" width={20} height={18} className="object-contain" />
        </div>
        <span className="text-base font-black tracking-tighter text-slate-900 dark:text-white">
          Instrict <span className="text-blue-500">Runner.</span>
        </span>
      </div>

      <div className="flex items-center gap-1">
        <button
          onClick={toggleNotifications}
          className={`relative p-2 rounded-xl transition-colors ${
            showNotifications
              ? 'bg-blue-500/10 text-blue-600 dark:text-blue-400'
              : 'text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          <Bell className="w-5 h-5" />
          {unreadCount > 0 && (
            <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-rose-500 rounded-full" />
          )}
        </button>

        <Link
          href="/runner/help"
          className={`p-2 rounded-xl transition-colors ${
            isSupportActive
              ? 'bg-blue-500/10 text-blue-600 dark:text-blue-400'
              : 'text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          <MessageCircle className="w-5 h-5" />
        </Link>

        <Link
          href="/runner/community"
          className={`p-2 rounded-xl transition-colors ${
            isCommunityActive
              ? 'bg-blue-500/10 text-blue-600 dark:text-blue-400'
              : 'text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          <MessageSquare className="w-5 h-5" />
        </Link>
      </div>
    </header>
  );
}