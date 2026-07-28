'use client';

import { useState } from 'react';
import { Bell, Send, Loader2 } from 'lucide-react';

const CATEGORIES = [
  { value: 'all', label: 'Everyone' },
  { value: 'students', label: 'Students' },
  { value: 'riders', label: 'Riders' },
  { value: 'vendors', label: 'Vendors' },
];

export default function NotificationComposer() {
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [category, setCategory] = useState('all');
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState(null);

  const handleSend = async () => {
    if (!title.trim() || !body.trim()) return;
    setSending(true);
    setResult(null);

    try {
      const res = await fetch('/api/notifications/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, body, category }),
      });
      const data = await res.json();

      if (!res.ok) {
        setResult({ error: data.error || 'Something went wrong' });
      } else {
        setResult({ sent: data.sent, failed: data.failed, totalTokens: data.totalTokens });
        setTitle('');
        setBody('');
      }
    } catch (err) {
      setResult({ error: 'Network error, please try again' });
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-white p-4 md:p-8">
      <div className="max-w-lg mx-auto">
        <div className="flex items-center gap-2 mb-6">
          <Bell className="w-4 h-4 text-emerald-400" />
          <h1 className="text-xs font-black tracking-widest uppercase text-slate-400">
            Push Notifications
          </h1>
        </div>

        <div className="p-5 rounded-lg bg-slate-900 border border-slate-800 space-y-5">
          <div>
            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">
              Send to
            </label>
            <div className="mt-2 grid grid-cols-4 gap-1.5">
              {CATEGORIES.map((c) => (
                <button
                  key={c.value}
                  type="button"
                  onClick={() => setCategory(c.value)}
                  className={`h-9 rounded-lg text-[11px] font-bold transition-colors ${
                    category === c.value
                      ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                      : 'bg-slate-950 text-slate-500 border border-slate-800 hover:text-slate-300'
                  }`}
                >
                  {c.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">
              Title
            </label>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Scheduled maintenance tonight"
              className="mt-2 w-full h-10 px-3 rounded-lg bg-slate-950 border border-slate-800 text-sm text-white placeholder:text-slate-600 outline-none focus:border-emerald-500/50"
            />
          </div>

          <div>
            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">
              Message
            </label>
            <textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder="Write the notification body..."
              rows={3}
              className="mt-2 w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-sm text-white placeholder:text-slate-600 outline-none focus:border-emerald-500/50 resize-none"
            />
          </div>

          <button
            onClick={handleSend}
            disabled={sending || !title.trim() || !body.trim()}
            className="w-full h-10 rounded-lg bg-emerald-500 text-slate-950 text-xs font-black uppercase tracking-widest flex items-center justify-center gap-2 disabled:opacity-30 disabled:cursor-not-allowed transition-opacity"
          >
            {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            {sending ? 'Sending...' : 'Send Notification'}
          </button>

          {result?.error && (
            <p className="text-xs font-bold text-rose-400">{result.error}</p>
          )}
          {result && !result.error && (
            <p className="text-xs font-bold text-emerald-400">
              Sent to {result.sent} of {result.totalTokens} devices
              {result.failed > 0 ? ` (${result.failed} failed)` : ''}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}