'use client';

import { Suspense, useEffect, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Loader2, XCircle } from 'lucide-react';

export const dynamic = 'force-dynamic';

function ErrandPaymentCallbackContent() {
  const params = useSearchParams();
  const router = useRouter();
  const [state, setState] = useState('verifying');

  useEffect(() => {
    const reference = params.get('reference') || params.get('trxref');
    if (!reference) return setState('failed');

    fetch(`/api/errands/verify?reference=${encodeURIComponent(reference)}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.success) router.replace('/errands');
        else setState('failed');
      })
      .catch(() => setState('failed'));
  }, [params, router]);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-3 px-6 text-center">
      {state === 'verifying' && (
        <>
          <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
          <p className="text-sm font-bold text-slate-500">Confirming your payment…</p>
        </>
      )}
      {state === 'failed' && (
        <>
          <XCircle className="w-10 h-10 text-red-500" />
          <p className="text-base font-black text-slate-900">Payment couldn't be confirmed</p>
          <button onClick={() => router.push('/errands')} className="mt-2 h-10 px-5 rounded-xl bg-slate-200 text-sm font-black">
            Back to errands
          </button>
        </>
      )}
    </div>
  );
}

export default function ErrandPaymentCallbackPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex flex-col items-center justify-center gap-3 px-6 text-center">
          <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
          <p className="text-sm font-bold text-slate-500">Loading payment status…</p>
        </div>
      }
    >
      <ErrandPaymentCallbackContent />
    </Suspense>
  );
}