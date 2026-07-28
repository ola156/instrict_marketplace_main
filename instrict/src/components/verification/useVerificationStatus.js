'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/utils/supabase/client';

const TABLE = { vendor: 'vendor_verifications', rider: 'rider_verifications' };
const ID_COLUMN = { vendor: 'vendor_id', rider: 'rider_id' };

// Returns: 'loading' | 'none' | 'pending' | 'rejected' | 'approved'
// Any role not in TABLE (e.g. 'student') is treated as always-approved —
// students never have a verification requirement.
export function useVerificationStatus(role, userId) {
  const supabase = createClient();
  const [status, setStatus] = useState('loading');

  useEffect(() => {
    if (!TABLE[role]) {
      setStatus('approved');
      return;
    }
    if (!userId) return;

    let active = true;
    (async () => {
      const { data } = await supabase
        .from(TABLE[role])
        .select('status')
        .eq(ID_COLUMN[role], userId)
        .order('submitted_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (active) setStatus(data?.status || 'none');
    })();

    return () => { active = false; };
  }, [role, userId]);

  return status;
}