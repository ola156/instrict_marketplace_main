'use client';

import { useEffect, useState, useRef } from 'react';
import { createClient } from '@/utils/supabase/client';
import {
  MapPin, Plus, X, Loader2, Bike, Clock, CreditCard,
  Send, Image as ImageIcon, KeyRound, ShieldCheck,
} from 'lucide-react';

const CLOUD_NAME    = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
const UPLOAD_PRESET = process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET;

// Kept in sync with ERRAND_SERVICE_CHARGE_PERCENT in
// /api/errands/checkout/route.js — the server is the source of truth for
// the actual amount charged, this is only used to render the button label.
const ERRAND_SERVICE_CHARGE_PERCENT = 3;

// Statuses that belong on the "Active" tab (still in progress / on the
// open marketplace). Everything else (completed, cancelled) goes on the
// "Completed" tab.
const ACTIVE_STATUSES = ['pending_payment', 'open', 'claimed'];

function timeAgo(d) {
  const s = (Date.now() - new Date(d)) / 1000;
  if (s < 60) return 'just now';
  if (s < 3600) return `${Math.floor(s / 60)}m`;
  if (s < 86400) return `${Math.floor(s / 3600)}h`;
  return `${Math.floor(s / 86400)}d`;
}

// Ordered lifecycle stages an errand moves through — used to draw the
// in-card tracker. Cancelled is handled separately since it's a branch,
// not a further stage.
const STAGES = [
  { key: 'pending_payment', label: 'Posted' },
  { key: 'open',            label: 'Open' },
  { key: 'claimed',         label: 'Claimed' },
  { key: 'completed',       label: 'Done' },
];

function StatusTracker({ status }) {
  if (status === 'cancelled') {
    return (
      <span className="text-[10px] font-black px-2 py-0.5 rounded-lg bg-rose-500/10 text-rose-600 dark:text-rose-400 inline-block">
        Cancelled
      </span>
    );
  }

  const currentIndex = STAGES.findIndex(s => s.key === status);

  return (
    <div className="space-y-1.5">
      <div className="flex items-center gap-1">
        {STAGES.map((s, i) => (
          <div
            key={s.key}
            className={`flex-1 h-1.5 rounded-full transition-all ${
              i <= currentIndex ? 'bg-blue-500' : 'bg-slate-200 dark:bg-slate-800'
            }`}
          />
        ))}
      </div>
      <div className="flex justify-between">
        {STAGES.map((s, i) => (
          <span
            key={s.key}
            className={`text-[9px] font-black uppercase tracking-wide ${
              i === currentIndex ? 'text-blue-600 dark:text-blue-400' : 'text-slate-300 dark:text-slate-600'
            }`}
          >
            {s.label}
          </span>
        ))}
      </div>
    </div>
  );
}

// ── Errand card ──────────────────────────────────────────────────────────
function ErrandCard({ errand, currentStudentId, currentUserId, onClaim, onPay, onCancel, onComplete }) {
  const isOwner = errand.student_id === currentStudentId;
  const isAssignedRider = errand.rider_id === currentUserId;

  const [code, setCode] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [codeError, setCodeError] = useState('');
  const [paying, setPaying] = useState(false);

  const submitCode = async () => {
    if (!code.trim()) return;
    setSubmitting(true);
    setCodeError('');
    const { ok, message } = await onComplete(errand.id, code.trim());
    setSubmitting(false);
    if (!ok) setCodeError(message);
  };

  const handlePayClick = async () => {
    setPaying(true);
    await onPay(errand.id);
    // No setPaying(false) on success — the browser is about to navigate
    // away to Paystack's hosted page. If onPay fails and returns without
    // navigating, reset so the button isn't stuck disabled forever.
    setPaying(false);
  };

  // Shown on the pay button — reward + 3% service charge, rounded the
  // same way the checkout route rounds it server-side.
  const totalToPay = Math.round(Number(errand.reward) * (1 + ERRAND_SERVICE_CHARGE_PERCENT / 100));

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl overflow-hidden">
      {errand.image_url && <img src={errand.image_url} alt="Errand" className="w-full h-36 object-cover" />}
      <div className="p-4 space-y-3">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <p className="text-xs font-black text-slate-900 dark:text-white">{errand.title}</p>
            <p className="text-[11px] text-slate-400 mt-0.5 leading-relaxed">{errand.description}</p>
          </div>
          <div className="text-right shrink-0">
            <p className="text-sm font-black text-slate-900 dark:text-white">₦{Number(errand.reward).toLocaleString()}</p>
            <p className="text-[10px] text-slate-400">reward</p>
          </div>
        </div>

        <div className="space-y-1.5 bg-slate-50 dark:bg-slate-800/50 rounded-xl p-3">
          <div className="flex items-center gap-2 text-[11px] text-slate-500 dark:text-slate-400">
            <MapPin className="w-3.5 h-3.5 text-blue-500 shrink-0" />
            <span className="font-medium">From:</span>
            <span className="truncate">{errand.pickup_location}</span>
          </div>
          <div className="flex items-center gap-2 text-[11px] text-slate-500 dark:text-slate-400">
            <MapPin className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
            <span className="font-medium">To:</span>
            <span className="truncate">{errand.dropoff_location}</span>
          </div>
        </div>

        <div className="flex items-center justify-between gap-3">
          <div className="flex-1"><StatusTracker status={errand.status} /></div>
          <span className="flex items-center gap-0.5 text-[10px] text-slate-400 shrink-0"><Clock className="w-3 h-3" />{timeAgo(errand.created_at)}</span>
        </div>

        {/* Owner: pay to post — button shows reward + 3% service charge,
            since that's the actual amount Paystack will charge. */}
        {isOwner && errand.status === 'pending_payment' && (
          <button onClick={handlePayClick} disabled={paying}
            className="w-full h-9 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-[11px] font-black transition-all flex items-center justify-center gap-1.5">
            {paying ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CreditCard className="w-3.5 h-3.5" />}
            {paying ? 'Starting payment...' : `Pay ₦${totalToPay.toLocaleString()} to post`}
          </button>
        )}

        {/* Owner: cancel before it's claimed */}
        {isOwner && (errand.status === 'pending_payment' || errand.status === 'open') && (
          <button onClick={() => onCancel(errand.id)}
            className="w-full h-8 rounded-xl border border-rose-200 dark:border-rose-900/40 text-rose-500 text-[11px] font-bold transition-all">
            Cancel errand
          </button>
        )}

        {/* Non-owner: claim an open errand */}
        {!isOwner && errand.status === 'open' && (
          <button onClick={() => onClaim(errand.id)}
            className="w-full h-9 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-[11px] font-black transition-all flex items-center justify-center gap-1.5">
            <Bike className="w-3.5 h-3.5" /> Claim errand
          </button>
        )}

        {/* Owner: show the delivery code + who claimed it */}
        {isOwner && errand.status === 'claimed' && (
          <div className="rounded-xl border border-amber-200 dark:border-amber-900/40 bg-amber-50 dark:bg-amber-500/5 p-3 space-y-3">
            <div className="flex items-center gap-2.5">
              <ShieldCheck className="w-4 h-4 text-amber-500 shrink-0" />
              <div>
                <p className="text-[10px] text-amber-600 dark:text-amber-400 font-bold">Give this code to your rider on delivery</p>
                <p className="text-lg font-black tracking-[0.3em] text-slate-900 dark:text-white">{errand.confirmation_code || '····'}</p>
              </div>
            </div>
            {errand.rider && (
              <div className="flex items-center gap-2.5 pt-2 border-t border-amber-200/60 dark:border-amber-900/40">
                <Bike className="w-4 h-4 text-amber-500 shrink-0" />
                <div>
                  <p className="text-[10px] text-amber-600 dark:text-amber-400 font-bold">Your rider</p>
                  <p className="text-xs font-black text-slate-900 dark:text-white">{errand.rider.full_name || 'Rider'}</p>
                  {errand.rider.phone && (
                    <a href={`tel:${errand.rider.phone}`} className="text-[11px] font-bold text-blue-500">{errand.rider.phone}</a>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Assigned rider: enter the code to confirm completion */}
        {isAssignedRider && errand.status === 'claimed' && (
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                <input
                  value={code}
                  onChange={e => setCode(e.target.value)}
                  placeholder="Enter delivery code"
                  maxLength={4}
                  className="w-full h-9 pl-8 pr-3 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white outline-none focus:border-blue-500 transition-all tracking-widest"
                />
              </div>
              <button onClick={submitCode} disabled={submitting || !code.trim()}
                className="h-9 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-[11px] font-black transition-all flex items-center gap-1.5 shrink-0">
                {submitting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : 'Confirm'}
              </button>
            </div>
            {codeError && <p className="text-[11px] font-bold text-rose-500">{codeError}</p>}
          </div>
        )}

        {/* Claimed by someone else — just show status */}
        {!isOwner && !isAssignedRider && errand.status === 'claimed' && (
          <p className="text-[11px] text-slate-400 italic">Already claimed by another rider.</p>
        )}
      </div>
    </div>
  );
}

// ── Post errand form ─────────────────────────────────────────────────────
function PostErrandForm({ studentId, onCreated, onClose }) {
  const supabase = createClient();
  const fileRef = useRef();
  const [form, setForm] = useState({ title: '', description: '', pickup_location: '', dropoff_location: '', reward: '' });
  const [imageUrl, setImageUrl] = useState('');
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const set = (k, v) => setForm(p => ({ ...p, [k]: v }));

  const handleImage = async (file) => {
    setUploading(true);
    const fd = new FormData();
    fd.append('file', file); fd.append('upload_preset', UPLOAD_PRESET); fd.append('folder', 'instrict/errands');
    const res = await fetch(`https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`, { method: 'POST', body: fd });
    const data = await res.json();
    if (data.secure_url) setImageUrl(data.secure_url);
    setUploading(false);
  };

  const submit = async () => {
    if (!form.title || !form.description || !form.pickup_location || !form.dropoff_location || !form.reward) {
      setError('Please fill all required fields.'); return;
    }
    setSubmitting(true);
    // Note: no `status` here — it defaults to 'pending_payment' in the DB,
    // and stays hidden from the job board until the student pays.
    const { error: err } = await supabase.from('errands').insert({
      student_id: studentId,
      title: form.title,
      description: form.description,
      pickup_location: form.pickup_location,
      dropoff_location: form.dropoff_location,
      reward: Number(form.reward),
      image_url: imageUrl || null,
    });
    if (err) { setError(err.message); setSubmitting(false); return; }
    onCreated();
    onClose();
    setSubmitting(false);
  };

  const inputClass = "w-full h-10 px-3 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white outline-none focus:border-blue-500 transition-all";

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-slate-950/50 backdrop-blur-sm">
      <div className="w-full max-w-md bg-white dark:bg-slate-950 rounded-3xl p-5 space-y-4 shadow-2xl animate-in slide-in-from-bottom-4 duration-200">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-black text-slate-900 dark:text-white">Post an errand</h2>
          <button onClick={onClose} className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="space-y-2.5">
          <input value={form.title} onChange={e => set('title', e.target.value)} placeholder="What do you need? *" className={inputClass} />
          <textarea value={form.description} onChange={e => set('description', e.target.value)} placeholder="Describe the errand in detail *" rows={2}
            className="w-full px-3 py-2.5 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white outline-none focus:border-blue-500 transition-all resize-none" />
          <div className="grid grid-cols-2 gap-2">
            <div className="relative">
              <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-blue-500" />
              <input value={form.pickup_location} onChange={e => set('pickup_location', e.target.value)} placeholder="Pickup from *" className={`${inputClass} pl-8`} />
            </div>
            <div className="relative">
              <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-emerald-500" />
              <input value={form.dropoff_location} onChange={e => set('dropoff_location', e.target.value)} placeholder="Deliver to *" className={`${inputClass} pl-8`} />
            </div>
          </div>
          <input value={form.reward} onChange={e => set('reward', e.target.value)} type="number" placeholder="Reward amount (₦) *" className={inputClass} />

          {form.reward && Number(form.reward) > 0 && (
            <p className="text-[10px] font-bold text-slate-400 px-1">
              You'll pay ₦{Math.round(Number(form.reward) * (1 + ERRAND_SERVICE_CHARGE_PERCENT / 100)).toLocaleString()} total
              (₦{Number(form.reward).toLocaleString()} reward + {ERRAND_SERVICE_CHARGE_PERCENT}% service charge) once posted.
            </p>
          )}

          {imageUrl
            ? <div className="relative"><img src={imageUrl} alt="Preview" className="w-full h-28 object-cover rounded-xl" /><button onClick={() => setImageUrl('')} className="absolute top-2 right-2 w-6 h-6 bg-black/60 text-white rounded-lg flex items-center justify-center"><X className="w-3 h-3" /></button></div>
            : <button onClick={() => fileRef.current?.click()} disabled={uploading} className="w-full h-10 rounded-xl border border-dashed border-slate-200 dark:border-slate-700 text-slate-400 hover:border-blue-400 hover:text-blue-500 text-[11px] font-bold flex items-center justify-center gap-1.5 transition-all">
                {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <><ImageIcon className="w-4 h-4" />Add photo (optional)</>}
              </button>
          }
          <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={e => handleImage(e.target.files[0])} />
        </div>

        {error && <p className="text-[11px] font-bold text-rose-500">{error}</p>}

        <button onClick={submit} disabled={submitting}
          className="w-full h-10 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-xs font-black transition-all flex items-center justify-center gap-1.5">
          {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Send className="w-4 h-4" />Post errand</>}
        </button>
      </div>
    </div>
  );
}

// ── Tabs ─────────────────────────────────────────────────────────────────
function TabBar({ tab, setTab, activeCount, completedCount }) {
  const tabs = [
    { key: 'active', label: 'Active', count: activeCount },
    { key: 'completed', label: 'Completed', count: completedCount },
  ];
  return (
    <div className="flex gap-1 p-1 bg-slate-100 dark:bg-slate-900 rounded-xl">
      {tabs.map(t => (
        <button
          key={t.key}
          onClick={() => setTab(t.key)}
          className={`flex-1 h-9 rounded-lg text-[11px] font-black transition-all flex items-center justify-center gap-1.5 ${
            tab === t.key
              ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-sm'
              : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-300'
          }`}
        >
          {t.label}
          <span className={`text-[9px] px-1.5 py-0.5 rounded-full ${
            tab === t.key ? 'bg-blue-500/10 text-blue-600 dark:text-blue-400' : 'bg-slate-200 dark:bg-slate-800 text-slate-400'
          }`}>
            {t.count}
          </span>
        </button>
      ))}
    </div>
  );
}

// ── Page ─────────────────────────────────────────────────────────────────
export default function ErrandsPage() {
  const supabase = createClient();
  const [errands, setErrands] = useState([]);
  const [loading, setLoading] = useState(true);
  const [studentId, setStudentId] = useState(null);
  const [userId, setUserId] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [toast, setToast] = useState('');
  const [tab, setTab] = useState('active');

  useEffect(() => { init(); }, []);

  const init = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      setUserId(user.id);
      const { data } = await supabase.from('student_profiles').select('id').eq('user_id', user.id).single();
      setStudentId(data?.id);
    }
    fetchErrands();
  };

  const fetchErrands = async () => {
    const { data: { user } } = await supabase.auth.getUser();

    let profileId = null;
    if (user) {
      const { data: profile } = await supabase.from('student_profiles').select('id').eq('user_id', user.id).single();
      profileId = profile?.id ?? null;
    }

    // Privacy: the "open" marketplace is shared so riders can find errands
    // to claim, but everything else (pending payment, claimed, completed,
    // cancelled) is only fetched if it's the current user's own errand
    // (as the posting student) or one they're the assigned rider on.
    // This should also be enforced by RLS on the `errands` table server
    // side — this filter just keeps the client query in step with that.
    let query = supabase.from('errands').select('*').order('created_at', { ascending: false });

    if (user && profileId) {
      query = query.or(`status.eq.open,student_id.eq.${profileId},rider_id.eq.${user.id}`);
    } else if (user) {
      // Logged in but no student profile yet (e.g. rider-only account) —
      // open marketplace plus anything already assigned to them as rider.
      query = query.or(`status.eq.open,rider_id.eq.${user.id}`);
    } else {
      query = query.eq('status', 'open');
    }

    const { data } = await query;
    const list = data || [];

    if (user) {
      const ownErrands = list.filter(e => e.student_id === profileId);

      // Confirmation codes — RLS on errand_codes only allows the owning
      // student to read these anyway, so this only ever returns rows
      // for errands this user actually posted.
      const ownIds = ownErrands.map(e => e.id);

      // Rider contact info — errands.rider_id points straight to
      // auth.users, not rider_profiles, so there's no FK for Supabase
      // to auto-join; fetch it separately, and only for the student's
      // own claimed/completed errands (not exposing every rider's
      // number to anyone browsing the board).
      const riderIds = ownErrands.filter(e => e.rider_id).map(e => e.rider_id);

      const [{ data: codes }, { data: riders }] = await Promise.all([
        ownIds.length ? supabase.from('errand_codes').select('errand_id, code').in('errand_id', ownIds) : Promise.resolve({ data: [] }),
        riderIds.length ? supabase.from('rider_profiles').select('user_id, full_name, phone').in('user_id', riderIds) : Promise.resolve({ data: [] }),
      ]);

      const codeMap = Object.fromEntries((codes || []).map(c => [c.errand_id, c.code]));
      const riderMap = Object.fromEntries((riders || []).map(r => [r.user_id, r]));

      list.forEach(e => {
        if (codeMap[e.id]) e.confirmation_code = codeMap[e.id];
        if (e.rider_id && riderMap[e.rider_id]) e.rider = riderMap[e.rider_id];
      });
    }

    setErrands(list);
    setLoading(false);
  };

  // Real payment: hits /api/errands/checkout, which computes reward + 3%
  // service charge server-side and returns a Paystack authorization_url.
  // is_paid/status only ever get flipped by the webhook (or the verify
  // fallback on /errands/payment-callback) once Paystack actually
  // confirms the charge — never optimistically here on the client.
  const handlePay = async (errandId) => {
    try {
      const res = await fetch('/api/errands/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ errandId }),
      });
      const data = await res.json();
      if (!res.ok || !data.authorization_url) {
        setToast(data.error || 'Could not start payment.');
        return;
      }
      window.location.href = data.authorization_url;
    } catch (err) {
      setToast('Something went wrong starting payment.');
    }
  };

  const handleCancel = async (errandId) => {
    await supabase.from('errands').update({ status: 'cancelled' }).eq('id', errandId).eq('student_id', studentId);
    fetchErrands();
  };

  // Atomic claim: only succeeds if still unclaimed and still open,
  // so two riders tapping "claim" at the same time can't both win it.
  const handleClaim = async (errandId) => {
    const { data: { user } } = await supabase.auth.getUser();
    const { data, error } = await supabase
      .from('errands')
      .update({ rider_id: user.id, status: 'claimed', claimed_at: new Date().toISOString() })
      .eq('id', errandId)
      .is('rider_id', null)
      .eq('status', 'open')
      .select();

    if (error) { setToast('Something went wrong claiming this errand.'); return; }
    if (!data || data.length === 0) { setToast('Someone else just claimed this one.'); }
    fetchErrands();
  };

  // Completion goes through the complete_errand() RPC, which verifies
  // the code server-side — the client never has the real code to compare.
  const handleComplete = async (errandId, code) => {
    const { data, error } = await supabase.rpc('complete_errand', { p_errand_id: errandId, p_code: code });
    if (error) return { ok: false, message: 'Something went wrong, try again.' };
    const result = Array.isArray(data) ? data[0] : data;
    if (result?.success) fetchErrands();
    return { ok: !!result?.success, message: result?.message || 'Unknown error' };
  };

  const activeErrands = errands.filter(e => ACTIVE_STATUSES.includes(e.status));
  const completedErrands = errands.filter(e => !ACTIVE_STATUSES.includes(e.status));
  const visibleErrands = tab === 'active' ? activeErrands : completedErrands;

  return (
    <div className="w-full space-y-5 px-4">
      {showForm && studentId && (
        <PostErrandForm studentId={studentId} onCreated={fetchErrands} onClose={() => setShowForm(false)} />
      )}

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-base font-black tracking-tight text-slate-900 dark:text-white">Errands</h1>
          <p className="text-[11px] text-slate-400 mt-0.5">Post a job and let Instrict run it for you</p>
        </div>
        <button onClick={() => setShowForm(true)}
          className="flex items-center gap-1.5 h-9 px-4 bg-blue-600 hover:bg-blue-700 text-white text-xs font-black rounded-xl transition-all shadow-sm shadow-blue-600/20">
          <Plus className="w-3.5 h-3.5" /> Post errand
        </button>
      </div>

      <TabBar tab={tab} setTab={setTab} activeCount={activeErrands.length} completedCount={completedErrands.length} />

      {toast && (
        <div className="rounded-xl border border-amber-200 dark:border-amber-900/40 bg-amber-50 dark:bg-amber-500/5 px-3 py-2 flex items-center justify-between">
          <p className="text-[11px] font-bold text-amber-600 dark:text-amber-400">{toast}</p>
          <button onClick={() => setToast('')}><X className="w-3.5 h-3.5 text-amber-500" /></button>
        </div>
      )}

      {loading ? (
        <div className="space-y-4 animate-pulse">
          {[1, 2, 3].map(i => (
            <div key={i} className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl p-4 space-y-3">
              <div className="flex justify-between">
                <div className="space-y-1.5 flex-1"><div className="h-3 w-1/2 bg-slate-200 dark:bg-slate-800 rounded" /><div className="h-2 w-3/4 bg-slate-200 dark:bg-slate-800 rounded" /></div>
                <div className="h-6 w-12 bg-slate-200 dark:bg-slate-800 rounded" />
              </div>
              <div className="h-16 bg-slate-100 dark:bg-slate-800 rounded-xl" />
            </div>
          ))}
        </div>
      ) : visibleErrands.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center border border-dashed border-slate-200 dark:border-slate-800 rounded-2xl">
          <span className="text-4xl mb-3">🛵</span>
          <p className="text-xs font-black text-slate-400">
            {tab === 'active' ? 'No active errands' : 'No completed errands yet'}
          </p>
          <p className="text-[11px] text-slate-300 dark:text-slate-600 mt-1">
            {tab === 'active' ? 'Post one to get started' : 'Finished and cancelled errands show up here'}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {visibleErrands.map(e => (
            <ErrandCard
              key={e.id}
              errand={e}
              currentStudentId={studentId}
              currentUserId={userId}
              onClaim={handleClaim}
              onPay={handlePay}
              onCancel={handleCancel}
              onComplete={handleComplete}
            />
          ))}
        </div>
      )}
    </div>
  );
}