'use client';

import { useVerificationStatus } from './useVerificationStatus';
import { Lock } from 'lucide-react';

/**
 * variant="block"  — a dashed card explaining why (good standalone, e.g. above a form)
 * variant="inline" — a compact locked pill sized like a normal button (good inside a header row)
 */
export default function VerificationGate({ role, userId, action = 'do this', variant = 'block', children }) {
  const status = useVerificationStatus(role, userId);

  if (status === 'loading') return null;
  if (status === 'approved') return children;

  if (variant === 'inline') {
    return (
      <div
        title={`Verify your identity to ${action}.`}
        className="flex items-center gap-1.5 h-9 px-4 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-400 text-xs font-black cursor-not-allowed select-none shrink-0"
      >
        <Lock className="w-3.5 h-3.5" />
        Locked
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2 rounded-xl border border-dashed border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/40 px-3.5 py-2.5">
      <Lock className="w-3.5 h-3.5 text-slate-400 shrink-0" />
      <p className="text-[11px] font-bold text-slate-400">
        Verify your identity to {action}.
      </p>
    </div>
  );
}