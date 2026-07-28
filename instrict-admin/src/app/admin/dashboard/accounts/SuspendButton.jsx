// app/admin/dashboard/accounts/SuspendButton.jsx
'use client';

import { useState } from 'react';
import { suspendAccount } from './actions';
import { Ban, Loader2 } from 'lucide-react';

export default function SuspendButton({ role, userId }) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const handleSuspend = async () => {
    setBusy(true);
    setError('');
    const result = await suspendAccount(role, userId, reason);
    setBusy(false);
    if (!result.ok) {
      setError(result.message);
      return;
    }
    setOpen(false);
    setReason('');
  };

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-1.5 h-8 px-3 rounded-lg bg-rose-500/10 text-rose-600 dark:text-rose-400 text-[11px] font-black"
      >
        <Ban className="w-3.5 h-3.5" /> Suspend
      </button>
    );
  }

  return (
    <div className="space-y-2 p-3 rounded-xl border border-rose-200 dark:border-rose-800 bg-rose-50 dark:bg-rose-500/5">
      <textarea
        value={reason}
        onChange={(e) => setReason(e.target.value)}
        placeholder="Reason for suspension (shown internally, required)"
        className="w-full text-[11px] rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-2.5 py-2 resize-none"
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
          onClick={() => setOpen(false)}
          className="h-8 px-3 rounded-lg text-slate-400 text-[11px] font-bold"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}