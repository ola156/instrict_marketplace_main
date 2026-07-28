'use client';

import { useState } from 'react';
import { approveVendor, rejectVendor, approveRider, rejectRider } from './actions';

export default function ApprovalCard({ type, verification }) {
  const [showReject, setShowReject] = useState(false);
  const [reason, setReason] = useState('');
  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);

  const profile = type === 'vendor' ? verification.vendor_profiles : verification.rider_profiles;
  const subjectId = type === 'vendor' ? verification.vendor_id : verification.rider_id;

  const approveFn = type === 'vendor' ? approveVendor : approveRider;
  const rejectFn = type === 'vendor' ? rejectVendor : rejectRider;

  const handleApprove = async () => {
    setIsPending(true);
    setError('');
    try {
      await approveFn(verification.id, subjectId);
      setDone(true);
    } catch (e) {
      setError(e.message || 'Something went wrong.');
    } finally {
      setIsPending(false);
    }
  };

  const handleReject = async () => {
    if (!reason.trim()) {
      setError('A rejection reason is required.');
      return;
    }
    setIsPending(true);
    setError('');
    try {
      await rejectFn(verification.id, subjectId, reason.trim());
      setDone(true);
    } catch (e) {
      setError(e.message || 'Something went wrong.');
    } finally {
      setIsPending(false);
    }
  };

  if (done) {
    return (
      <div className="rounded-lg border border-slate-800 bg-slate-900/30 p-4 opacity-50">
        <p className="text-xs text-slate-500 font-mono">Handled — refreshing list…</p>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-slate-800 bg-slate-900/50 p-4 space-y-4">
      <div className="flex justify-between items-start gap-4">
        <div className="min-w-0">
          {type === 'vendor' ? (
            <>
              <p className="font-bold text-slate-100 truncate">{profile?.legal_name}</p>
              <p className="text-xs text-slate-500 font-mono truncate">
                {profile?.category} · {profile?.store_address}
              </p>
              <p className="text-xs text-slate-500 font-mono">{profile?.support_phone}</p>
            </>
          ) : (
            <>
              <p className="font-bold text-slate-100 truncate">{profile?.full_name}</p>
              <p className="text-xs text-slate-500 font-mono truncate">
                {profile?.vehicle_type} · {profile?.license_plate}
              </p>
              <p className="text-xs text-slate-500 font-mono">{profile?.phone}</p>
            </>
          )}
          <p className="text-[10px] text-slate-600 font-mono mt-1">
            Submitted {new Date(verification.submitted_at).toLocaleDateString()}
          </p>
        </div>

        {!showReject && (
          <div className="flex gap-2 shrink-0">
            <button
              onClick={handleApprove}
              disabled={isPending}
              className="px-3 py-1.5 rounded-md bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white text-xs font-bold whitespace-nowrap"
            >
              Approve
            </button>
            <button
              onClick={() => setShowReject(true)}
              disabled={isPending}
              className="px-3 py-1.5 rounded-md bg-rose-900/50 hover:bg-rose-900 disabled:opacity-50 text-rose-300 text-xs font-bold whitespace-nowrap"
            >
              Reject
            </button>
          </div>
        )}
      </div>

      {/* Submitted documents */}
      <div className="flex gap-3 pt-3 border-t border-slate-800">
        <a href={verification.id_document_url} target="_blank" rel="noreferrer" className="block">
          <img
            src={verification.id_document_url}
            alt="ID document"
            className="w-24 h-24 object-cover rounded-md border border-slate-800 hover:opacity-80 transition-opacity"
          />
          <p className="text-[9px] text-slate-600 font-mono mt-1 text-center">ID</p>
        </a>
        <a href={verification.selfie_url} target="_blank" rel="noreferrer" className="block">
          <img
            src={verification.selfie_url}
            alt="Selfie"
            className="w-24 h-24 object-cover rounded-md border border-slate-800 hover:opacity-80 transition-opacity"
          />
          <p className="text-[9px] text-slate-600 font-mono mt-1 text-center">Selfie</p>
        </a>
        {type === 'rider' && verification.license_url && (
          <a href={verification.license_url} target="_blank" rel="noreferrer" className="block">
            <img
              src={verification.license_url}
              alt="License"
              className="w-24 h-24 object-cover rounded-md border border-slate-800 hover:opacity-80 transition-opacity"
            />
            <p className="text-[9px] text-slate-600 font-mono mt-1 text-center">License</p>
          </a>
        )}
      </div>

      {showReject && (
        <div className="space-y-2 pt-3 border-t border-slate-800">
          <textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Reason for rejection (visible to applicant)"
            rows={2}
            className="w-full text-xs bg-slate-950 border border-slate-800 rounded-md p-2 text-slate-200 font-mono outline-none focus:border-rose-600"
          />
          <div className="flex gap-2">
            <button
              onClick={handleReject}
              disabled={isPending}
              className="px-3 py-1.5 rounded-md bg-rose-600 hover:bg-rose-500 disabled:opacity-50 text-white text-xs font-bold"
            >
              Confirm reject
            </button>
            <button
              onClick={() => {
                setShowReject(false);
                setReason('');
                setError('');
              }}
              disabled={isPending}
              className="px-3 py-1.5 rounded-md bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {error && <p className="text-[10px] text-rose-400 font-mono">{error}</p>}
    </div>
  );
}