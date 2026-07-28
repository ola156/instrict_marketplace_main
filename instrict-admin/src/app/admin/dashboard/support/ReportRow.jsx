'use client';

import { useState } from 'react';
import { resolveReport } from './actions';

const STATUS_COLORS = {
  open: 'text-amber-400',
  in_review: 'text-blue-400',
  resolved: 'text-emerald-400',
  dismissed: 'text-slate-500',
};

export default function ReportRow({ report }) {
  const [notes, setNotes] = useState(report.admin_notes || '');
  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState('');
  const [status, setStatus] = useState(report.status);

  const handleUpdate = async (newStatus) => {
    setIsPending(true);
    setError('');
    try {
      await resolveReport(report.id, newStatus, notes);
      setStatus(newStatus);
    } catch (e) {
      setError(e.message || 'Something went wrong.');
    } finally {
      setIsPending(false);
    }
  };

  return (
    <div className="rounded-lg border border-slate-800 bg-slate-900/50 p-4 space-y-3">
      <div className="flex justify-between items-start gap-3">
        <div>
          <span className={`text-xs font-bold uppercase ${STATUS_COLORS[status]}`}>{status}</span>
          <p className="text-sm text-slate-200 mt-1">{report.description}</p>
          <p className="text-[10px] text-slate-600 font-mono mt-1">
            Reported by {report.reporter_role} · {new Date(report.created_at).toLocaleDateString()}
            {report.order_id && ` · order #${report.order_id.slice(0, 8)}`}
          </p>
        </div>
      </div>

      {(status === 'open' || status === 'in_review') && (
        <div className="space-y-2 pt-2 border-t border-slate-800">
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Internal notes (optional)"
            rows={2}
            className="w-full text-xs bg-slate-950 border border-slate-800 rounded-md p-2 text-slate-200 font-mono outline-none focus:border-emerald-600"
          />
          <div className="flex gap-2">
            {status === 'open' && (
              <button
                onClick={() => handleUpdate('in_review')}
                disabled={isPending}
                className="px-3 py-1.5 rounded-md bg-blue-900/50 hover:bg-blue-900 disabled:opacity-50 text-blue-300 text-xs font-bold"
              >
                Mark in review
              </button>
            )}
            <button
              onClick={() => handleUpdate('resolved')}
              disabled={isPending}
              className="px-3 py-1.5 rounded-md bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white text-xs font-bold"
            >
              Resolve
            </button>
            <button
              onClick={() => handleUpdate('dismissed')}
              disabled={isPending}
              className="px-3 py-1.5 rounded-md bg-slate-800 hover:bg-slate-700 disabled:opacity-50 text-slate-300 text-xs font-bold"
            >
              Dismiss
            </button>
          </div>
        </div>
      )}

      {error && <p className="text-[10px] text-rose-400 font-mono">{error}</p>}
    </div>
  );
}