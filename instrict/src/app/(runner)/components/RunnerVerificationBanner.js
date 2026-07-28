// app/(runner)/components/RunnerVerificationBanner.js
'use client';

import { useRunner } from '../context/RunnerProvider';
import VerificationBanner from '@/components/verification/VerificationBanner';

export default function RunnerVerificationBanner() {
  const { runner } = useRunner();

  if (!runner?.user_id) return null;

  return (
    <div className="px-5 pt-4 max-w-lg md:max-w-5xl mx-auto">
      <VerificationBanner role="rider" userId={runner.user_id} verifyHref="/verify" />
    </div>
  );
}