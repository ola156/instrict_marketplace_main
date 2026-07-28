'use client';

// Reusable across every actor type — mount as:
//   <HelpDesk authorType="student" />   (student portal, /home)
//   <HelpDesk authorType="vendor" />    (vendor portal, /dashboard)
//   <HelpDesk authorType="rider" />     (rider portal, /jobs)
//
// Deliberately NOT gated behind VerificationGate and NOT blocked for
// suspended accounts (unlike CommunityFeed) — a suspended or unverified
// user is often exactly who most needs to reach support.
//
// Realtime: messages in the currently-open thread subscribe live, same
// pattern as CommunityFeed's per-post comment threads — only pay for a
// subscription while that specific thread is actually open.

import { useEffect, useState } from 'react';
import { createClient } from '@/utils/supabase/client';
import { LifeBuoy, Send, Loader2, ChevronLeft, Plus } from 'lucide-react';

const ROLE_PROFILE = {
  student: { table: 'student_profiles', badgeClass: 'from-blue-500 to-blue-600' },
  vendor: { table: 'vendor_profiles', badgeClass: 'from-emerald-500 to-emerald-600' },
  rider: { table: 'rider_profiles', badgeClass: 'from-amber-500 to-amber-600' },
};

const STATUS_STYLES = {
  open: 'text-amber-500 bg-amber-500/10',
  in_progress: 'text-blue-500 bg-blue-500/10',
  resolved: 'text-emerald-500 bg-emerald-500/10',
  closed: 'text-slate-400 bg-slate-400/10',
};

function timeAgo(dateStr) {
  const diff = (Date.now() - new Date(dateStr)) / 1000;
  if (diff < 60) return 'just now';
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

function NewTicketForm({ onCancel, submitting, onSubmit }) {
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl p-4 space-y-3">
      <input
        value={subject}
        onChange={(e) => setSubject(e.target.value)}
        placeholder="What's this about? (e.g. 'Order not delivered')"
        className="w-full h-10 px-3 text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 text-slate-900 dark:text-white placeholder:text-slate-400 outline-none focus:border-blue-500 transition-colors"
      />
      <textarea
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        placeholder="Describe the issue…"
        rows={4}
        className="w-full px-3 py-2.5 text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 text-slate-900 dark:text-white placeholder:text-slate-400 outline-none focus:border-blue-500 resize-none transition-colors"
      />
      <div className="flex justify-end gap-2">
        <button
          onClick={onCancel}
          className="h-9 px-4 rounded-xl text-xs font-black text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all"
        >
          Cancel
        </button>
        <button
          onClick={() => onSubmit(subject, message)}
          disabled={submitting || !subject.trim() || !message.trim()}
          className="h-9 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-40 text-white text-xs font-black transition-all flex items-center gap-1.5"
        >
          {submitting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
          Submit
        </button>
      </div>
    </div>
  );
}

function TicketThread({ ticket, currentUserId, authorType, onBack }) {
  const supabase = createClient();
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [reply, setReply] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const config = ROLE_PROFILE[authorType] || ROLE_PROFILE.student;

  const fetchMessages = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('support_ticket_messages')
      .select('*')
      .eq('ticket_id', ticket.id)
      .order('created_at', { ascending: true });
    if (error) console.error('fetchMessages error:', error);
    setMessages(data || []);
    setLoading(false);
  };

  useEffect(() => { fetchMessages(); }, [ticket.id]);

  // Only subscribed while this thread is open — same instinct as
  // CommunityFeed's per-post comment subscription.
  useEffect(() => {
    const channel = supabase
      .channel(`support-ticket-${ticket.id}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'support_ticket_messages', filter: `ticket_id=eq.${ticket.id}` },
        (payload) => {
          const row = payload.new;
          setMessages((prev) => (prev.some((m) => m.id === row.id) ? prev : [...prev, row]));
        }
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [ticket.id]);

  const sendReply = async () => {
    if (!reply.trim() || submitting) return;
    setSubmitting(true);

    const { data, error } = await supabase
      .from('support_ticket_messages')
      .insert({ ticket_id: ticket.id, sender_id: currentUserId, sender_type: 'user', message: reply.trim() })
      .select()
      .single();

    if (error) {
      console.error('sendReply error:', error);
      setSubmitting(false);
      return;
    }

    // Append right away rather than waiting on the realtime round-trip —
    // the dedupe guard above means it's harmless if that event also
    // arrives shortly after.
    setMessages((prev) => (prev.some((m) => m.id === data.id) ? prev : [...prev, data]));

    // If the ticket had been resolved/closed, a new message from the
    // user reopens it — they clearly have more to say.
    if (ticket.status === 'resolved' || ticket.status === 'closed') {
      await supabase
        .from('support_tickets')
        .update({ status: 'open', last_message_at: new Date().toISOString() })
        .eq('id', ticket.id);
    } else {
      await supabase.from('support_tickets').update({ last_message_at: new Date().toISOString() }).eq('id', ticket.id);
    }

    setReply('');
    setSubmitting(false);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <button onClick={onBack} className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all">
          <ChevronLeft className="w-4 h-4" />
        </button>
        <div className="min-w-0">
          <p className="text-sm font-black text-slate-900 dark:text-white truncate">{ticket.subject}</p>
          <span className={`inline-block text-[9px] font-black uppercase tracking-wide px-2 py-0.5 rounded-full mt-0.5 ${STATUS_STYLES[ticket.status]}`}>
            {ticket.status.replace('_', ' ')}
          </span>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-8"><Loader2 className="w-5 h-5 text-slate-400 animate-spin" /></div>
      ) : (
        <div className="space-y-2.5">
          {messages.map((m) => (
            <div
              key={m.id}
              className={`rounded-2xl px-3.5 py-2.5 max-w-[85%] ${
                m.sender_type === 'admin'
                  ? 'bg-slate-100 dark:bg-slate-800 mr-auto'
                  : `bg-gradient-to-br ${config.badgeClass} text-white ml-auto`
              }`}
            >
              <p className="text-[9px] font-black uppercase tracking-wide opacity-70 mb-0.5">
                {m.sender_type === 'admin' ? 'Support' : 'You'}
              </p>
              <p className="text-sm whitespace-pre-wrap">{m.message}</p>
              <p className="text-[9px] opacity-60 mt-1">{timeAgo(m.created_at)}</p>
            </div>
          ))}
        </div>
      )}

      <div className="flex gap-2 pt-2">
        <input
          value={reply}
          onChange={(e) => setReply(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && sendReply()}
          placeholder="Write a message…"
          className="flex-1 h-10 px-3 text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white outline-none focus:border-blue-500 transition-colors"
        />
        <button
          onClick={sendReply}
          disabled={submitting || !reply.trim()}
          className="w-10 h-10 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-40 text-white flex items-center justify-center transition-all shrink-0"
        >
          {submitting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
        </button>
      </div>
    </div>
  );
}

export default function HelpDesk({ authorType = 'student' }) {
  const supabase = createClient();
  const [currentUserId, setCurrentUserId] = useState(null);
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedTicket, setSelectedTicket] = useState(null);
  const [showNewForm, setShowNewForm] = useState(false);
  const [creating, setCreating] = useState(false);

  useEffect(() => { init(); }, [authorType]);

  const init = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) setCurrentUserId(user.id);
    await fetchTickets(user?.id);
  };

  const fetchTickets = async (userId) => {
    const uid = userId || currentUserId;
    if (!uid) return setLoading(false);
    const { data, error } = await supabase
      .from('support_tickets')
      .select('*')
      .eq('user_id', uid)
      .order('last_message_at', { ascending: false });
    if (error) console.error('fetchTickets error:', error);
    setTickets(data || []);
    setLoading(false);
  };

  const createTicket = async (subject, message) => {
    if (!currentUserId) return;
    setCreating(true);

    const { data: ticket, error: ticketError } = await supabase
      .from('support_tickets')
      .insert({ user_id: currentUserId, user_role: authorType, subject: subject.trim(), status: 'open' })
      .select()
      .single();

    if (ticketError) {
      console.error('createTicket error:', ticketError);
      setCreating(false);
      return;
    }

    const { error: msgError } = await supabase
      .from('support_ticket_messages')
      .insert({ ticket_id: ticket.id, sender_id: currentUserId, sender_type: 'user', message: message.trim() });

    if (msgError) console.error('create first message error:', msgError);

    setCreating(false);
    setShowNewForm(false);
    await fetchTickets();
    setSelectedTicket(ticket);
  };

  if (selectedTicket) {
    return (
      <div className="w-full max-w-xl px-4 sm:px-1">
        <TicketThread
          ticket={selectedTicket}
          currentUserId={currentUserId}
          authorType={authorType}
          onBack={() => { setSelectedTicket(null); fetchTickets(); }}
        />
      </div>
    );
  }

  return (
    <div className="w-full space-y-5 max-w-xl px-4 sm:px-1">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-base font-black tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
            <LifeBuoy className="w-4 h-4" /> Help Desk
          </h1>
          <p className="text-[11px] text-slate-400 mt-0.5">Get help with an order or account issue</p>
        </div>
        {!showNewForm && (
          <button
            onClick={() => setShowNewForm(true)}
            className="h-9 px-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-black flex items-center gap-1.5 transition-all"
          >
            <Plus className="w-3.5 h-3.5" /> New
          </button>
        )}
      </div>

      {showNewForm && (
        <NewTicketForm
          submitting={creating}
          onSubmit={createTicket}
          onCancel={() => setShowNewForm(false)}
        />
      )}

      {loading ? (
        <div className="flex justify-center py-8"><Loader2 className="w-5 h-5 text-slate-400 animate-spin" /></div>
      ) : tickets.length === 0 && !showNewForm ? (
        <div className="flex flex-col items-center justify-center py-16 text-center border border-dashed border-slate-200 dark:border-slate-800 rounded-2xl">
          <LifeBuoy className="w-8 h-8 text-slate-300 dark:text-slate-700 mb-3" />
          <p className="text-xs font-black text-slate-400">No support tickets yet</p>
          <p className="text-[11px] text-slate-300 dark:text-slate-600 mt-1">Tap "New" if you run into an issue</p>
        </div>
      ) : (
        <div className="space-y-2">
          {tickets.map((t) => (
            <button
              key={t.id}
              onClick={() => setSelectedTicket(t)}
              className="w-full text-left bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl p-4 hover:border-slate-200 dark:hover:border-slate-700 transition-colors"
            >
              <div className="flex justify-between items-start gap-3">
                <p className="text-sm font-bold text-slate-800 dark:text-slate-200 truncate">{t.subject}</p>
                <span className={`shrink-0 text-[9px] font-black uppercase tracking-wide px-2 py-0.5 rounded-full ${STATUS_STYLES[t.status]}`}>
                  {t.status.replace('_', ' ')}
                </span>
              </div>
              <p className="text-[10px] text-slate-400 mt-1">Last activity {timeAgo(t.last_message_at)}</p>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}