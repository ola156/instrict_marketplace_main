'use client';

import { useVerificationStatus } from './useVerificationStatus';
import Link from 'next/link';
import { ShieldAlert, Clock, XCircle, ArrowRight } from 'lucide-react';

export default function VerificationBanner({ role, userId, verifyHref = '/verify' }) {
  const status = useVerificationStatus(role, userId);

  if (status === 'loading' || status === 'approved') return null;

  const config = {
    none: {
      icon: ShieldAlert,
      title: 'Verify your identity',
      text: 'Required to open your store, add menu items, and post in the community.',
      tone: 'bg-amber-500/10 border-amber-500/20',
      iconTone: 'bg-amber-500/15 text-amber-600 dark:text-amber-400',
      textTone: 'text-amber-700 dark:text-amber-400',
      btnTone: 'bg-amber-500 hover:bg-amber-600',
      cta: 'Verify now',
    },
    pending: {
      icon: Clock,
      title: 'Verification pending',
      text: 'Your store stays closed and your listings stay hidden until this is approved.',
      tone: 'bg-blue-500/10 border-blue-500/20',
      iconTone: 'bg-blue-500/15 text-blue-600 dark:text-blue-400',
      textTone: 'text-blue-700 dark:text-blue-400',
      btnTone: 'bg-blue-600 hover:bg-blue-700',
      cta: 'View status',
    },
    rejected: {
      icon: XCircle,
      title: 'Verification rejected',
      text: 'Resubmit your documents to unlock your store.',
      tone: 'bg-rose-500/10 border-rose-500/20',
      iconTone: 'bg-rose-500/15 text-rose-600 dark:text-rose-400',
      textTone: 'text-rose-700 dark:text-rose-400',
      btnTone: 'bg-rose-600 hover:bg-rose-700',
      cta: 'Resubmit',
    },
  }[status];

  const Icon = config.icon;

  return (
    <div className={`flex flex-col sm:flex-row sm:items-center gap-3 border rounded-2xl px-4 py-3.5 mb-4 ${config.tone}`}>
      <div className="flex items-start sm:items-center gap-3 min-w-0 flex-1">
        <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${config.iconTone}`}>
          <Icon className="w-4.5 h-4.5" />
        </div>
        <div className="min-w-0">
          <p className={`text-xs font-black leading-tight ${config.textTone}`}>{config.title}</p>
          <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-snug mt-0.5">
            {config.text}
          </p>
        </div>
      </div>

      <Link
        href={verifyHref}
        className={`flex items-center justify-center gap-1.5 shrink-0 text-white text-[11px] font-black tracking-tight rounded-xl px-4 py-2.5 sm:py-2 transition-colors ${config.btnTone}`}
      >
        {config.cta}
        <ArrowRight className="w-3.5 h-3.5" />
      </Link>
    </div>
  );
}