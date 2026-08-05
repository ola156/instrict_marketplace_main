'use client';

import { useState, useTransition } from 'react';
import { Wallet, TrendingUp, Truck, Store, Check, X, Clock, AlertTriangle, Bike, ShoppingBag, Layers, Percent } from 'lucide-react';
import {
  markVendorWithdrawalPaid,
  rejectVendorWithdrawal,
  markRiderWithdrawalPaid,
  rejectRiderWithdrawal,
} from './actions';

function StatCard({ label, value, sub, icon: Icon, tone }) {
  const tones = {
    emerald: 'bg-emerald-950/40 text-emerald-400 border-emerald-900',
    blue: 'bg-blue-950/40 text-blue-400 border-blue-900',
    amber: 'bg-amber-950/40 text-amber-400 border-amber-900',
    slate: 'bg-slate-800/40 text-slate-300 border-slate-700',
    purple: 'bg-purple-950/40 text-purple-400 border-purple-900',
  };
  return (
    <div className="rounded-lg border border-slate-800 bg-slate-900/50 p-4">
      <div className="flex items-center justify-between mb-2">
        <span className="text-[10px] font-bold uppercase tracking-wide text-slate-500">{label}</span>
        <div className={`w-7 h-7 rounded-md flex items-center justify-center border ${tones[tone]}`}>
          <Icon size={13} />
        </div>
      </div>
      <p className="text-lg font-mono font-bold text-slate-100">{value}</p>
      {sub && <p className="text-[10px] text-slate-500 mt-0.5">{sub}</p>}
    </div>
  );
}

function SectionLabel({ children }) {
  return (
    <p className="text-[10px] font-black uppercase tracking-widest text-slate-600 px-4 pt-4 pb-1">
      {children}
    </p>
  );
}

// action is called with (id) for approve, or (id, reason) for reject.
// Runs against this ROW's own transition, not the page-level one, so one
// row's spinner/error doesn't affect siblings and a failed transfer's
// error message shows exactly where it happened.
function RequestRow({ request, name, onApprove, onReject }) {
  const [isPending, startTransition] = useTransition();
  const [showReject, setShowReject] = useState(false);
  const [reason, setReason] = useState('');
  const [localError, setLocalError] = useState('');
  const [rowError, setRowError] = useState('');

  const handleApprove = () => {
    setRowError('');
    startTransition(async () => {
      const res = await onApprove();
      if (res?.error) setRowError(res.error);
    });
  };

  const handleRejectClick = () => {
    if (!reason.trim()) {
      setLocalError('A reason is required.');
      return;
    }
    setLocalError('');
    setRowError('');
    startTransition(async () => {
      const res = await onReject(reason.trim());
      if (res?.error) setRowError(res.error);
    });
  };

  return (
    <div className="rounded-md border border-slate-800 bg-slate-950/40 p-3 space-y-2">
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm text-slate-200 truncate">{name || 'Unknown'}</p>
          <p className="text-[10px] font-mono text-slate-500">
            {new Date(request.created_at).toLocaleDateString('en-NG', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
          </p>
        </div>

        {!showReject && (
          <div className="flex items-center gap-2 shrink-0">
            <span className="text-sm font-mono font-bold text-slate-100">₦{Number(request.amount).toLocaleString()}</span>
            <button
              onClick={handleApprove}
              disabled={isPending}
              className="p-1.5 rounded-md bg-emerald-900/50 hover:bg-emerald-900 disabled:opacity-50 text-emerald-300"
              title="Mark paid — transfers funds via Paystack"
            >
              <Check size={14} />
            </button>
            <button
              onClick={() => setShowReject(true)}
              disabled={isPending}
              className="p-1.5 rounded-md bg-rose-900/50 hover:bg-rose-900 disabled:opacity-50 text-rose-300"
              title="Reject"
            >
              <X size={14} />
            </button>
          </div>
        )}
      </div>

      {/* Per-row error — transfer failures (insufficient Paystack balance,
          missing/invalid bank details, recipient creation failure, etc.)
          show right here instead of a generic page-level banner, so it's
          obvious exactly which payout failed and why. */}
      {rowError && (
        <div className="flex items-start gap-1.5 rounded-md border border-rose-900/60 bg-rose-950/30 px-2.5 py-2">
          <AlertTriangle size={12} className="text-rose-400 shrink-0 mt-0.5" />
          <p className="text-[11px] font-mono text-rose-300">{rowError}</p>
        </div>
      )}

      {showReject && (
        <div className="space-y-2 pt-2 border-t border-slate-800">
          <textarea
            value={reason}
            onChange={(e) => { setReason(e.target.value); setLocalError(''); }}
            placeholder="Reason for rejecting this payout (visible internally)"
            rows={2}
            autoFocus
            className="w-full text-xs bg-slate-900 border border-slate-800 rounded-md p-2 text-slate-200 font-mono outline-none focus:border-rose-600"
          />
          {localError && <p className="text-[10px] text-rose-400 font-mono">{localError}</p>}
          <div className="flex gap-2">
            <button
              onClick={handleRejectClick}
              disabled={isPending}
              className="px-3 py-1.5 rounded-md bg-rose-600 hover:bg-rose-500 disabled:opacity-50 text-white text-xs font-bold"
            >
              Confirm reject
            </button>
            <button
              onClick={() => { setShowReject(false); setReason(''); setLocalError(''); setRowError(''); }}
              disabled={isPending}
              className="px-3 py-1.5 rounded-md bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default function WalletsClient({ vendorWallets, riderWallets, vendorRequests, riderRequests, revenue }) {
  const [tab, setTab] = useState('vendors');

  // Row actions now return their result to the row itself (for inline error
  // display) and only refresh the page on success — no more shared
  // page-level pending/error state stepping on other rows.
  async function handleApprove(action, id) {
    const res = await action(id);
    if (!res?.error) window.location.reload();
    return res;
  }

  async function handleReject(action, id, reason) {
    const res = await action(id, reason);
    if (!res?.error) window.location.reload();
    return res;
  }

  const totalOwedVendors = vendorWallets.reduce((s, v) => s + Number(v.balance || 0), 0);
  const totalOwedRiders = riderWallets.reduce((s, r) => s + Number(r.balance || 0), 0);

  return (
    <div className="space-y-4">
      {/* SECTION 1 — money students pay on top of their bill (service
          charges), added to what they're charged, kept in full by the
          platform. Not deducted from anyone else's earnings. */}
      <SectionLabel>Fees Charged To Students</SectionLabel>
      <div className="grid grid-cols-2 lg:grid-cols-2 gap-3 px-4">
        <StatCard
          label="Order Service Fee"
          value={`₦${revenue.service_charge.toLocaleString()}`}
          sub="3% added to student's order total at checkout"
          icon={Percent}
          tone="emerald"
        />
        <StatCard
          label="Errand Service Fee"
          value={`₦${revenue.errand_service_charge.toLocaleString()}`}
          sub="3% added when a student posts an errand"
          icon={Percent}
          tone="emerald"
        />
      </div>

      {/* SECTION 2 — commission the platform deducts FROM what vendors
          and riders earn, not charged to students. Now exact and
          per-transaction via vendor_wallet_transactions /
          rider_wallet_transactions, not a recalculated estimate. */}
      <SectionLabel>Commission Deducted From Vendors & Riders</SectionLabel>
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 px-4">
        <StatCard
          label="Vendor Commission"
          value={`₦${revenue.vendor_fee_orders.toLocaleString()}`}
          sub="3% deducted from every vendor's order subtotal"
          icon={Store}
          tone="blue"
        />
        <StatCard
          label="Rider Commission — Deliveries"
          value={`₦${revenue.rider_fee_orders.toLocaleString()}`}
          sub="3% deducted from rider's delivery fee"
          icon={ShoppingBag}
          tone="blue"
        />
        <StatCard
          label="Rider Commission — Errands"
          value={`₦${revenue.rider_fee_errands.toLocaleString()}`}
          sub="3% deducted from rider's errand reward"
          icon={Bike}
          tone="purple"
        />
      </div>

      {/* SECTION 3 — operational totals: volume, what's owed out, and the
          combined revenue figure across all four fee streams above. */}
     <SectionLabel>Volume & Totals</SectionLabel>
<div className="grid grid-cols-2 lg:grid-cols-5 gap-3 px-4 pb-4">
  <StatCard
    label="Total Money In"
    value={`₦${revenue.total_income.toLocaleString()}`}
    sub="All cash received — orders + errands, before any payout"
    icon={Wallet}
    tone="blue"
  />
  <StatCard
    label="Errand Gross Volume"
    value={`₦${revenue.errand_volume.toLocaleString()}`}
    sub="Total rewards across completed errands"
    icon={Wallet}
    tone="slate"
  />
  <StatCard
    label="Owed To Vendors"
    value={`₦${totalOwedVendors.toLocaleString()}`}
    sub="Unpaid wallet balances"
    icon={Store}
    tone="amber"
  />
  <StatCard
    label="Owed To Riders"
    value={`₦${totalOwedRiders.toLocaleString()}`}
    sub="Unpaid wallet balances"
    icon={Truck}
    tone="amber"
  />
  <StatCard
    label="Total Platform Revenue"
    value={`₦${revenue.platform_total.toLocaleString()}`}
    sub="Student fees + vendor & rider commission combined"
    icon={Layers}
    tone="emerald"
  />
</div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-slate-800 p-1">
        {['vendors', 'riders'].map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-3 py-2 text-xs font-bold uppercase tracking-wide border-b-2 transition-colors ${
              tab === t ? 'border-emerald-500 text-emerald-400' : 'border-transparent text-slate-500 hover:text-slate-300'
            }`}
          >
            {t === 'vendors' ? 'Vendors' : 'Riders'}
          </button>
        ))}
      </div>

      {tab === 'vendors' && (
        <div className="space-y-4 p-4">
          {vendorRequests.length > 0 && (
            <div className="rounded-lg border border-amber-900/50 bg-amber-950/10 p-4">
              <h3 className="text-xs font-bold uppercase tracking-wide text-amber-400 mb-3 flex items-center gap-1.5">
                <Clock size={13} /> Pending payout requests ({vendorRequests.length})
              </h3>
              <div className="space-y-2">
                {vendorRequests.map((r) => (
                  <RequestRow
                    key={r.id}
                    request={r}
                    name={r.vendor_profiles?.legal_name}
                    onApprove={() => handleApprove(markVendorWithdrawalPaid, r.id)}
                    onReject={(reason) => handleReject(rejectVendorWithdrawal, r.id, reason)}
                  />
                ))}
              </div>
            </div>
          )}

          <div className="rounded-lg border border-slate-800 bg-slate-900/50 p-4">
            <h3 className="text-xs font-bold uppercase tracking-wide text-slate-500 mb-3">All vendor wallets</h3>
            <div className="space-y-2">
              {vendorWallets.map((w) => (
                <div key={w.id} className="flex items-center justify-between rounded-md border border-slate-800 bg-slate-950/40 p-3">
                  <span className="text-sm text-slate-200 truncate">{w.vendor_profiles?.legal_name || 'Unknown'}</span>
                  <div className="flex gap-4 text-xs font-mono shrink-0">
                    <span className="text-emerald-400">₦{Number(w.balance).toLocaleString()}</span>
                    <span className="text-slate-500">earned ₦{Number(w.total_earned).toLocaleString()}</span>
                    {Number(w.pending_payout) > 0 && (
                      <span className="text-amber-400">pending ₦{Number(w.pending_payout).toLocaleString()}</span>
                    )}
                  </div>
                </div>
              ))}
              {vendorWallets.length === 0 && <p className="text-xs text-slate-600 py-2">No vendor wallets yet.</p>}
            </div>
          </div>
        </div>
      )}

      {tab === 'riders' && (
        <div className="space-y-4 p-4">
          {riderRequests.length > 0 && (
            <div className="rounded-lg border border-amber-900/50 bg-amber-950/10 p-4">
              <h3 className="text-xs font-bold uppercase tracking-wide text-amber-400 mb-3 flex items-center gap-1.5">
                <Clock size={13} /> Pending payout requests ({riderRequests.length})
              </h3>
              <div className="space-y-2">
                {riderRequests.map((r) => (
                  <RequestRow
                    key={r.id}
                    request={r}
                    name={r.rider_profiles?.full_name}
                    onApprove={() => handleApprove(markRiderWithdrawalPaid, r.id)}
                    onReject={(reason) => handleReject(rejectRiderWithdrawal, r.id, reason)}
                  />
                ))}
              </div>
            </div>
          )}

          <div className="rounded-lg border border-slate-800 bg-slate-900/50 p-4">
            <h3 className="text-xs font-bold uppercase tracking-wide text-slate-500 mb-3">All rider wallets</h3>
            <div className="space-y-2">
              {riderWallets.map((w) => (
                <div key={w.rider_id} className="flex items-center justify-between rounded-md border border-slate-800 bg-slate-950/40 p-3">
                  <span className="text-sm text-slate-200 truncate">{w.rider_profiles?.full_name || 'Unknown'}</span>
                  <div className="flex gap-4 text-xs font-mono shrink-0">
                    <span className="text-emerald-400">₦{Number(w.balance).toLocaleString()}</span>
                    <span className="text-slate-500">earned ₦{Number(w.total_earned).toLocaleString()}</span>
                    {Number(w.pending_payout) > 0 && (
                      <span className="text-amber-400">pending ₦{Number(w.pending_payout).toLocaleString()}</span>
                    )}
                  </div>
                </div>
              ))}
              {riderWallets.length === 0 && <p className="text-xs text-slate-600 py-2">No rider wallets yet.</p>}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}