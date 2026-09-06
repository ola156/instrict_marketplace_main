'use client';

import { useState } from 'react';
import { X, Loader2, AlertTriangle } from 'lucide-react';

export default function CancelOrderModal({ order, onConfirm, onClose, submitting }) {
  const [reason, setReason] = useState('');

  if (!order) return null;

  const trimmed = reason.trim();
  const canSubmit = trimmed.length > 0 && !submitting;

  const handleSubmit = () => {
    if (!canSubmit) return;
    onConfirm(order.id, trimmed);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40">
      <div className="bg-white dark:bg-slate-900 rounded-2xl w-full max-w-sm p-5 space-y-4 shadow-xl">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-rose-500/10 flex items-center justify-center shrink-0">
              <AlertTriangle className="w-4 h-4 text-rose-500" />
            </div>
            <div>
              <p className="text-sm font-black text-slate-900 dark:text-white">Cancel order</p>
              <p className="text-[11px] text-slate-400">
                #{order.id.slice(0, 8).toUpperCase()}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={submitting}
            className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 disabled:opacity-50"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="space-y-1.5">
          <label className="text-[11px] font-bold text-slate-500 dark:text-slate-400">
            Why are you cancelling this order?
          </label>
          <textarea
            autoFocus
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="e.g. Out of stock, closing early..."
            rows={3}
            disabled={submitting}
            className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 px-3 py-2 text-xs text-slate-700 dark:text-slate-200 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-rose-500/40 disabled:opacity-50"
          />
          <p className="text-[10px] text-slate-400">
            The student will see this reason. If the order was already paid for, they'll need to contact support for a refund.
          </p>
        </div>

        <div className="flex gap-2">
          <button
            onClick={onClose}
            disabled={submitting}
            className="flex-1 h-9 rounded-xl border border-slate-200 dark:border-slate-700 text-[11px] font-black text-slate-500 disabled:opacity-50"
          >
            Keep order
          </button>
          <button
            onClick={handleSubmit}
            disabled={!canSubmit}
            className="flex-1 h-9 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-[11px] font-black flex items-center justify-center gap-1.5 disabled:opacity-50"
          >
            {submitting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null}
            {submitting ? 'Cancelling...' : 'Cancel order'}
          </button>
        </div>
      </div>
    </div>
  );
}