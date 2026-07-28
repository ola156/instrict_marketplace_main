'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/utils/supabase/client';
import { ArrowLeft, Loader2 } from 'lucide-react';
import VerificationForm from '@/components/verification/VerificationForm';

export default function VerifyPage() {
  const router = useRouter();
  const supabase = createClient();
  const [state, setState] = useState({ loading: true, role: null, profile: null });

  useEffect(() => {
    let active = true;

    (async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        router.replace('/auth'); // adjust to your actual sign-in route
        return;
      }

      // Figure out which kind of account this is by which profile row
      // exists — students never have either, so they fall through to the
      // "nothing to verify" state below.
      const [{ data: vendorProfile }, { data: riderProfile }] = await Promise.all([
        supabase
          .from('vendor_profiles')
          .select('user_id')
          .eq('user_id', user.id)
          .maybeSingle(),
        supabase
          .from('rider_profiles')
          .select('user_id, has_vehicle')
          .eq('user_id', user.id)
          .maybeSingle(),
      ]);

      if (!active) return;

      if (vendorProfile) {
        setState({ loading: false, role: 'vendor', profile: vendorProfile });
      } else if (riderProfile) {
        setState({ loading: false, role: 'rider', profile: riderProfile });
      } else {
        setState({ loading: false, role: null, profile: null });
      }
    })();

    return () => {
      active = false;
    };
  }, []);

  if (state.loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 dark:bg-slate-950">
        <Loader2 className="w-6 h-6 text-slate-300 animate-spin" />
      </div>
    );
  }

  if (!state.role) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-slate-50 dark:bg-slate-950 px-6 text-center">
        <p className="text-sm font-black text-slate-900 dark:text-white">
          Nothing to verify here
        </p>
        <p className="mt-1 text-[11px] text-slate-400">
          Only vendor and rider accounts need identity verification.
        </p>
      </div>
    );
  }

  return (
    <div className='flex justify-center items-center'>
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 px-4 py-6 md:px-8 md:py-8 w-full" >
      <button
        onClick={() => router.back()}
        className="mb-6 flex items-center gap-1.5 text-[11px] font-black text-slate-400 transition-colors hover:text-slate-900 dark:hover:text-white"
      >
        <ArrowLeft className="w-3.5 h-3.5" />
        Back
      </button>

      <VerificationForm role={state.role} profile={state.profile} />
    </div>
    </div>
  );
}