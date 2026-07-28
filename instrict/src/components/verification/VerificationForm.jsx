'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/utils/supabase/client';
import { ShieldCheck, Clock, AlertTriangle, Loader2 } from 'lucide-react';
import VerificationDocUpload from './VerificationDocUpload';

const TABLE = { vendor: 'vendor_verifications', rider: 'rider_verifications' };
const ID_COLUMN = { vendor: 'vendor_id', rider: 'rider_id' };

export default function VerificationForm({ role, profile }) {
  const supabase = createClient();
  const userId = profile.user_id;
  const table = TABLE[role];
  const idColumn = ID_COLUMN[role];
  const needsLicense = role === 'rider' && profile.has_vehicle;

  const [existing, setExisting] = useState(null);
  const [loading, setLoading] = useState(true);
  const [idDoc, setIdDoc] = useState(null);
  const [selfie, setSelfie] = useState(null);
  const [license, setLicense] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => { fetchExisting(); }, []);

  const fetchExisting = async () => {
    const { data } = await supabase
      .from(table)
      .select('*')
      .eq(idColumn, userId)
      .order('submitted_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (data) {
      setExisting(data);
      if (data.status === 'rejected') {
        setIdDoc(data.id_document_url);
        setSelfie(data.selfie_url);
        setLicense(data.license_url);
      }
    }
    setLoading(false);
  };

  const canSubmit = idDoc && selfie && (!needsLicense || license);

  const handleSubmit = async () => {
    if (!canSubmit) {
      setError('Please upload all required documents.');
      return;
    }
    setError('');
    setSubmitting(true);

    const payload = {
      [idColumn]: userId,
      id_document_url: idDoc,
      selfie_url: selfie,
      license_url: needsLicense ? license : null,
      status: 'pending',
      rejection_reason: null,
      submitted_at: new Date().toISOString(),
      reviewed_at: null,
      reviewed_by: null,
    };

    // Resubmission after rejection updates the same row; first-time is an insert.
    const { error: dbError } = existing && existing.status === 'rejected'
      ? await supabase.from(table).update(payload).eq('id', existing.id)
      : await supabase.from(table).insert(payload);

    setSubmitting(false);
    if (dbError) {
      setError(dbError.message);
      return;
    }
    fetchExisting();
  };

  if (loading) {
    return (
      <div className="flex justify-center py-16">
        <Loader2 className="w-6 h-6 text-slate-300 animate-spin" />
      </div>
    );
  }

  // Approved — nothing to do here.
  if (existing?.status === 'approved') {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center space-y-2">
        <div className="w-12 h-12 bg-emerald-500/10 rounded-2xl flex items-center justify-center">
          <ShieldCheck className="w-6 h-6 text-emerald-500" />
        </div>
        <p className="text-sm font-black text-slate-900 dark:text-white">You're verified</p>
        <p className="text-[11px] text-slate-400">Your account has full access.</p>
      </div>
    );
  }

  // Pending review — no re-upload allowed.
  if (existing?.status === 'pending') {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center space-y-2">
        <div className="w-12 h-12 bg-amber-500/10 rounded-2xl flex items-center justify-center">
          <Clock className="w-6 h-6 text-amber-500" />
        </div>
        <p className="text-sm font-black text-slate-900 dark:text-white">Verification pending</p>
        <p className="text-[11px] text-slate-400 max-w-xs">
          Your documents are under review. This usually takes a short while — check back soon.
        </p>
      </div>
    );
  }

  // Rejected or never submitted — show the form.
  return (
    <div className="max-w-md space-y-5">
      {existing?.status === 'rejected' && (
        <div className="flex items-start gap-2 bg-rose-500/5 border border-rose-500/20 rounded-xl px-4 py-3">
          <AlertTriangle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
          <div>
            <p className="text-[11px] font-black text-rose-600 dark:text-rose-400">Your last submission was rejected</p>
            {existing.rejection_reason && (
              <p className="text-[11px] text-rose-500 mt-0.5">{existing.rejection_reason}</p>
            )}
            <p className="text-[11px] text-slate-400 mt-1">Please correct the issue and resubmit below.</p>
          </div>
        </div>
      )}

      <div>
        <h2 className="text-sm font-black tracking-tight text-slate-900 dark:text-white">Identity verification</h2>
        <p className="text-[11px] text-slate-400 mt-0.5">
          Required before you can {role === 'vendor' ? 'open your store' : 'accept deliveries'}.
        </p>
      </div>

      <VerificationDocUpload
        label="Government ID"
        hint="Student ID, NIN slip, or driver's license"
        value={idDoc}
        onChange={setIdDoc}
      />
      <VerificationDocUpload
        label="Selfie"
        hint="A clear photo of your face, taken now"
        value={selfie}
        onChange={setSelfie}
      />
      {needsLicense && (
        <VerificationDocUpload
          label="Driver's license"
          hint="Required since you registered with a vehicle"
          value={license}
          onChange={setLicense}
        />
      )}

      {error && <p className="text-[11px] font-bold text-rose-500">{error}</p>}

      <button
        onClick={handleSubmit}
        disabled={!canSubmit || submitting}
        className="w-full h-11 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-40 text-white text-xs font-black tracking-tight transition-all flex items-center justify-center gap-2"
      >
        {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <ShieldCheck className="w-4 h-4" />}
        {submitting ? 'Submitting...' : 'Submit for review'}
      </button>
    </div>
  );
}