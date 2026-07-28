// app/admin/dashboard/accounts/AccountRow.jsx
'use client';

import { useState } from 'react';
import { suspendAccount, reactivateAccount } from './actions';
import { Ban, RotateCcw, Loader2, ChevronDown } from 'lucide-react';

const statusStyles = {
  active:    'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
  suspended: 'bg-rose-500/10 text-rose-600 dark:text-rose-400',
  pending:   'bg-amber-500/10 text-amber-600 dark:text-amber-400',
  rejected:  'bg-slate-100 dark:bg-slate-800 text-slate-500',
};

export default function AccountRow({
  role, userId, name, subtitle, approved, accountStatus, suspendedReason, suspendedAt,
}) {
  const [expanded, setExpanded] = useState(false);
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [localStatus, setLocalStatus] = useState(accountStatus);
  const [localReason, setLocalReason] = useState(suspendedReason);

  const isSuspended = localStatus === 'suspended';

  const handleSuspend = async () => {
    if (!reason.trim()) { setError('A reason is required.'); return; }
    setBusy(true);
    setError('');
    const result = await suspendAccount(role, userId, reason);
    setBusy(false);
    if (!result.ok) { setError(result.message); return; }
    setLocalStatus('suspended');
    setLocalReason(reason.trim());
    setExpanded(false);
    setReason('');
  };

  const handleReactivate = async () => {
    setBusy(true);
    setError('');
    const result = await reactivateAccount(role, userId);
    setBusy(false);
    if (!result.ok) { setError(result.message); return; }
    setLocalStatus('active');
    setLocalReason(null);
  };

  return (
    <div className="rounded-2xl border border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 p-3.5">
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <p className="text-xs font-black text-slate-900 dark:text-white truncate">{name || 'Unnamed'}</p>
            <span className={`text-[9px] font-black px-1.5 py-0.5 rounded-md shrink-0 ${statusStyles[localStatus] || statusStyles.active}`}>
              {localStatus}
            </span>
            {!approved && (
              <span className="text-[9px] font-black px-1.5 py-0.5 rounded-md bg-amber-500/10 text-amber-600 dark:text-amber-400 shrink-0">
                not approved
              </span>
            )}
          </div>
          {subtitle && <p className="text-[11px] text-slate-400 truncate mt-0.5">{subtitle}</p>}
          {isSuspended && localReason && (
            <p className="text-[11px] text-rose-500 mt-1">Reason: {localReason}</p>
          )}
        </div>

        <div className="shrink-0">
          {isSuspended ? (
            <button
              onClick={handleReactivate}
              disabled={busy}
              className="flex items-center gap-1.5 h-8 px-3 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-[11px] font-black disabled:opacity-50"
            >
              {busy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RotateCcw className="w-3.5 h-3.5" />}
              Reactivate
            </button>
          ) : (
            <button
              onClick={() => setExpanded((v) => !v)}
              className="flex items-center gap-1.5 h-8 px-3 rounded-lg bg-rose-500/10 text-rose-600 dark:text-rose-400 text-[11px] font-black"
            >
              <Ban className="w-3.5 h-3.5" /> Suspend
              <ChevronDown className={`w-3 h-3 transition-transform ${expanded ? 'rotate-180' : ''}`} />
            </button>
          )}
        </div>
      </div>

      {expanded && !isSuspended && (
        <div className="mt-3 space-y-2 pt-3 border-t border-slate-100 dark:border-slate-800">
          <textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Reason for suspension (required, visible to the account holder)"
            className="w-full text-[11px] rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 px-2.5 py-2 resize-none"
            rows={2}
          />
          {error && <p className="text-[11px] font-bold text-rose-500">{error}</p>}
          <div className="flex gap-2">
            <button
              onClick={handleSuspend}
              disabled={busy || !reason.trim()}
              className="h-8 px-3 rounded-lg bg-rose-600 text-white text-[11px] font-black disabled:opacity-50 flex items-center gap-1.5"
            >
              {busy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : 'Confirm suspend'}
            </button>
            <button
              onClick={() => { setExpanded(false); setError(''); }}
              className="h-8 px-3 rounded-lg text-slate-400 text-[11px] font-bold"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}