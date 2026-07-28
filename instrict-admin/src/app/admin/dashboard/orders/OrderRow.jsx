'use client';

import { useState } from 'react';
import { forceCancelOrder, markOrderRefunded, unassignRider } from './actions';

const STATUS_COLORS = {
  pending: 'text-slate-400',
  confirmed: 'text-blue-400',
  preparing: 'text-amber-400',
  ready: 'text-cyan-400',
  picked_up: 'text-indigo-400',
  delivered: 'text-emerald-400',
  cancelled: 'text-rose-400',
};

function timeAgo(dateStr) {
  const diffMs = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

export default function OrderRow({ order }) {
  const [showCancel, setShowCancel] = useState(false);
  const [reason, setReason] = useState('');
  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState('');
  const [expanded, setExpanded] = useState(false);

  const isStuckPreparing =
    order.status === 'preparing' &&
    Date.now() - new Date(order.created_at).getTime() > 3 * 60 * 60 * 1000;

  const handleCancel = async () => {
    if (!reason.trim()) {
      setError('A cancellation reason is required.');
      return;
    }
    setIsPending(true);
    setError('');
    try {
      await forceCancelOrder(order.id, reason.trim());
      setShowCancel(false);
    } catch (e) {
      setError(e.message || 'Something went wrong.');
    } finally {
      setIsPending(false);
    }
  };

  const handleRefund = async () => {
    setIsPending(true);
    setError('');
    try {
      await markOrderRefunded(order.id);
    } catch (e) {
      setError(e.message || 'Something went wrong.');
    } finally {
      setIsPending(false);
    }
  };

  const handleUnassign = async () => {
    setIsPending(true);
    setError('');
    try {
      await unassignRider(order.id);
    } catch (e) {
      setError(e.message || 'Something went wrong.');
    } finally {
      setIsPending(false);
    }
  };

  return (
    <div
      className={`rounded-lg border p-4 space-y-3 ${
        isStuckPreparing ? 'border-amber-700 bg-amber-950/20' : 'border-slate-800 bg-slate-900/50'
      }`}
    >
      <div className="flex justify-between items-start gap-4 flex-wrap">
        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-mono text-xs text-slate-500">#{order.id.slice(0, 8)}</span>
            <span className={`text-xs font-bold uppercase ${STATUS_COLORS[order.status] || 'text-slate-400'}`}>
              {order.status}
            </span>
            {isStuckPreparing && (
              <span className="text-[10px] font-bold uppercase bg-amber-900/50 text-amber-400 px-2 py-0.5 rounded">
                Stuck 3h+
              </span>
            )}
            <span className="text-[10px] font-mono text-slate-600">
              {order.payment_status} · {order.fulfillment_type} · {order.order_type}
            </span>
          </div>
          <p className="text-sm text-slate-200 mt-1">
            {order.vendor_profiles?.legal_name || 'Unknown vendor'}
            {order.rider_profiles?.full_name ? ` → rider: ${order.rider_profiles.full_name}` : ''}
          </p>
          <p className="text-xs text-slate-500 mt-0.5">
            {order.student_profiles?.full_name || order.requester_email || 'Unknown requester'}
            {order.student_profiles?.phone ? ` · ${order.student_profiles.phone}` : ''}
          </p>
          <p className="text-[10px] text-slate-600 font-mono mt-1">
            ₦{order.total} · {timeAgo(order.created_at)}
          </p>
        </div>

        <div className="flex gap-2 shrink-0">
          <button
            onClick={() => setExpanded(!expanded)}
            className="px-3 py-1.5 rounded-md bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold"
          >
            {expanded ? 'Hide' : 'Details'}
          </button>
          {order.status !== 'cancelled' && order.status !== 'delivered' && (
            <button
              onClick={() => setShowCancel(true)}
              disabled={isPending}
              className="px-3 py-1.5 rounded-md bg-rose-900/50 hover:bg-rose-900 disabled:opacity-50 text-rose-300 text-xs font-bold"
            >
              Cancel
            </button>
          )}
        </div>
      </div>

      {expanded && (
        <div className="pt-3 border-t border-slate-800 space-y-2 text-xs font-mono text-slate-400">
          <p>Delivery address: {order.delivery_address || order.delivery_hostel || '—'}</p>
          <p>Dropoff code: {order.dropoff_code || '—'}</p>
          <p>Payment ref: {order.payment_ref || '—'}</p>
          <p>Subtotal ₦{order.subtotal} + delivery ₦{order.delivery_fee} + service ₦{order.service_charge} = ₦{order.total}</p>
          {order.note && <p>Note: {order.note}</p>}

          <div className="flex gap-2 pt-2">
            {order.payment_status === 'paid' && (
              <button
                onClick={handleRefund}
                disabled={isPending}
                className="px-3 py-1.5 rounded-md bg-slate-800 hover:bg-slate-700 disabled:opacity-50 text-slate-300 text-[11px] font-bold"
              >
                Mark refunded (manual)
              </button>
            )}
            {order.rider_id && order.status !== 'delivered' && order.status !== 'cancelled' && (
              <button
                onClick={handleUnassign}
                disabled={isPending}
                className="px-3 py-1.5 rounded-md bg-slate-800 hover:bg-slate-700 disabled:opacity-50 text-slate-300 text-[11px] font-bold"
              >
                Unassign rider
              </button>
            )}
          </div>
        </div>
      )}

      {showCancel && (
        <div className="space-y-2 pt-3 border-t border-slate-800">
          <textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Reason for force-cancelling this order"
            rows={2}
            className="w-full text-xs bg-slate-950 border border-slate-800 rounded-md p-2 text-slate-200 font-mono outline-none focus:border-rose-600"
          />
          <div className="flex gap-2">
            <button
              onClick={handleCancel}
              disabled={isPending}
              className="px-3 py-1.5 rounded-md bg-rose-600 hover:bg-rose-500 disabled:opacity-50 text-white text-xs font-bold"
            >
              Confirm cancel
            </button>
            <button
              onClick={() => { setShowCancel(false); setReason(''); setError(''); }}
              disabled={isPending}
              className="px-3 py-1.5 rounded-md bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold"
            >
              Back
            </button>
          </div>
        </div>
      )}

      {error && <p className="text-[10px] text-rose-400 font-mono">{error}</p>}
    </div>
  );
}