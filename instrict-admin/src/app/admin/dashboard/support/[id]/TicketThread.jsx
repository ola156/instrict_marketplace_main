'use client';

import { useState, useTransition } from 'react';
import { sendAdminReply, updateTicketStatus } from '../actions';

const STATUS_OPTIONS = ['open', 'in_progress', 'resolved', 'closed'];

export default function TicketThread({ ticket, messages, requesterName }) {
  const [isPending, startTransition] = useTransition();
  const [reply, setReply] = useState('');
  const [error, setError] = useState('');
  const [status, setStatus] = useState(ticket.status);

  function handleSend() {
    if (!reply.trim()) {
      setError('Message cannot be empty.');
      return;
    }
    setError('');
    startTransition(async () => {
      const res = await sendAdminReply(ticket.id, reply);
      if (res?.error) return setError(res.error);
      setReply('');
      if (status === 'open') setStatus('in_progress');
      window.location.reload();
    });
  }

  function handleStatusChange(e) {
    const newStatus = e.target.value;
    setStatus(newStatus);
    startTransition(async () => {
      const res = await updateTicketStatus(ticket.id, newStatus);
      if (res?.error) setError(res.error);
    });
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-start gap-4 flex-wrap">
        <div>
          <h1 className="text-xl font-black tracking-tight text-slate-100">{ticket.subject}</h1>
          <p className="text-sm text-slate-500 mt-1">
            {requesterName || ticket.user_id} · {ticket.user_role}
            {ticket.order_id ? ` · order #${ticket.order_id.slice(0, 8)}` : ''}
          </p>
        </div>
        <select
          value={status}
          onChange={handleStatusChange}
          disabled={isPending}
          className="bg-slate-900 border border-slate-800 rounded-md px-3 py-2 text-xs font-mono text-slate-200 outline-none focus:border-emerald-600"
        >
          {STATUS_OPTIONS.map((s) => (
            <option key={s} value={s}>
              {s.replace('_', ' ')}
            </option>
          ))}
        </select>
      </div>

      <div className="space-y-3">
        {messages.map((m) => (
          <div
            key={m.id}
            className={`rounded-lg p-3 max-w-lg ${
              m.sender_type === 'admin'
                ? 'bg-emerald-950/30 border border-emerald-900 ml-auto'
                : 'bg-slate-900/50 border border-slate-800'
            }`}
          >
            <p className="text-[10px] font-bold uppercase tracking-wide text-slate-500 mb-1">
              {m.sender_type === 'admin' ? 'Admin' : requesterName || 'User'}
            </p>
            <p className="text-sm text-slate-200 whitespace-pre-wrap">{m.message}</p>
            <p className="text-[10px] text-slate-600 font-mono mt-1">
              {new Date(m.created_at).toLocaleString()}
            </p>
          </div>
        ))}
        {messages.length === 0 && (
          <p className="text-slate-600 text-sm">No messages yet.</p>
        )}
      </div>

      <div className="space-y-2 pt-4 border-t border-slate-800">
        <textarea
          value={reply}
          onChange={(e) => { setReply(e.target.value); setError(''); }}
          placeholder="Write a reply…"
          rows={3}
          className="w-full text-sm bg-slate-900 border border-slate-800 rounded-md p-3 text-slate-200 outline-none focus:border-emerald-600"
        />
        {error && <p className="text-xs text-rose-400 font-mono">{error}</p>}
        <button
          onClick={handleSend}
          disabled={isPending}
          className="px-4 py-2 rounded-md bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white text-sm font-bold"
        >
          Send reply
        </button>
      </div>
    </div>
  );
}