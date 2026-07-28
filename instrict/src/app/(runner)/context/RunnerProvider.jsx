'use client';

import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/utils/supabase/client';
import { resolveUserDestination } from '@/utils/auth/resolveDestination';
import { usePushNotifications } from '@/hooks/usePushNotifications';

const RunnerContext = createContext(null);

export function useRunner() {
  const ctx = useContext(RunnerContext);
  if (!ctx) throw new Error('useRunner must be used within RunnerProvider');
  return ctx;
}

// The canonical "fully onboarded rider" destination, per resolveDestination.js.
// If resolveUserDestination returns anything else, that's the single source
// of truth telling us the user doesn't belong in this dashboard yet.
const RIDER_HOME = '/jobs';

export function RunnerProvider({ children }) {
  const router = useRouter();
  const supabase = createClient();

  const [runner, setRunner] = useState(null);
  const [loading, setLoading] = useState(true);
  const [hasActiveJob, setHasActiveJob] = useState(false);
  const [togglingOnline, setTogglingOnline] = useState(false);

  // Shared across sidebar (desktop) and mobile top bar so both bell
  // buttons stay in sync and control the same main-content swap —
  // same pattern the student layout uses locally with useState, just
  // lifted into context since two separate nav components need it here.
  const [showNotifications, setShowNotifications] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  // rider_profiles has no separate `id` column — user_id IS the key,
  // so the push token also gets written keyed on user_id.
  usePushNotifications(runner?.user_id, { table: 'rider_profiles', idColumn: 'user_id' });

  const fetchUnreadCount = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { count } = await supabase
      .from('notifications')
      .select('*', { count: 'exact', head: true })
      .eq('vendor_id', user.id)
      .eq('is_read', false);
    setUnreadCount(count || 0);
  }, [supabase]);

  useEffect(() => { fetchUnreadCount(); }, [fetchUnreadCount]);

  // Realtime: bump the badge instantly on a new notification without
  // waiting for the notification panel itself to be opened.
  useEffect(() => {
    if (!runner?.user_id) return;
    const channel = supabase
      .channel(`runner-unread-badge-${runner.user_id}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'notifications', filter: `vendor_id=eq.${runner.user_id}` },
        () => setUnreadCount((c) => c + 1)
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [runner?.user_id, supabase]);

  // Opening the panel is treated as reading it — mirrors the student
  // layout's markAllRead-on-open pattern for the badge to actually clear.
  const toggleNotifications = useCallback(async () => {
    setShowNotifications((prev) => {
      const next = !prev;
      if (next && unreadCount > 0) {
        (async () => {
          const { data: { user } } = await supabase.auth.getUser();
          if (!user) return;
          await supabase.from('notifications').update({ is_read: true }).eq('vendor_id', user.id).eq('is_read', false);
          setUnreadCount(0);
        })();
      }
      return next;
    });
  }, [unreadCount, supabase]);

  // rider_profiles has no separate `id` column — user_id IS the key,
  // and it equals orders.rider_id / errands.rider_id directly (both
  // trace back to auth.uid()). "Active" now means either:
  //   - an order claimed but not yet delivered/cancelled, OR
  //   - an errand claimed but not yet completed (errands only have
  //     one post-claim stage, so status = 'claimed' alone means active).
  const checkActiveJob = useCallback(async (riderUserId) => {
    const [{ data: activeOrder }, { data: activeErrand }] = await Promise.all([
      supabase
        .from('orders')
        .select('id')
        .eq('rider_id', riderUserId)
        .not('status', 'in', '(delivered,cancelled)')
        .maybeSingle(),
      supabase
        .from('errands')
        .select('id')
        .eq('rider_id', riderUserId)
        .eq('status', 'claimed')
        .maybeSingle(),
    ]);
    setHasActiveJob(!!activeOrder || !!activeErrand);
  }, [supabase]);

  // ── Auth guard — delegate the "where should this user be" decision
  //    entirely to resolveUserDestination, don't re-derive it here.
  //    `approved` is NOT part of this decision — an onboarded-but-
  //    unapproved rider still belongs on /jobs, just with actions
  //    disabled. That's handled below, not by redirecting away.
  //    `account_status` (suspension) works the same way: a suspended
  //    rider is still onboarded/approved, so they still land on /jobs —
  //    they just see everything locked with a suspension notice instead
  //    of being bounced out. ──
  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push('/auth/rider'); return; }

      const destination = await resolveUserDestination(supabase, user.id);
      if (destination !== RIDER_HOME) {
        router.push(destination);
        return;
      }

      // Confirmed fully onboarded — now load what the dashboard UI
      // actually needs to display. This is presentation data only;
      // it does not re-decide onboarding status.
      const { data: profile, error } = await supabase
        .from('rider_profiles')
        .select(`
          user_id, full_name, phone, campus_id, current_zone_id, is_active, approved,
          account_status, suspended_at, suspended_reason
        `)
        .eq('user_id', user.id)
        .maybeSingle();

      if (error || !profile) {
        // Shouldn't happen if resolveUserDestination said RIDER_HOME,
        // but fail safe rather than rendering a half-loaded dashboard.
        router.push('/onboarding/rider');
        return;
      }

      setRunner(profile);

      // Only bother checking for an active job if they're actually
      // approved AND not suspended — a suspended rider can't have a
      // legitimately-claimable new job, but if they already have one
      // in flight from before the suspension, the badge should still
      // reflect that so it doesn't silently vanish from their view.
      if (profile.approved) {
        await checkActiveJob(profile.user_id);
      }
      setLoading(false);
    })();
  }, []);

  // ── Realtime: keep the Active-tab badge accurate everywhere in the
  //     shell, for both orders and errands. ──
  useEffect(() => {
    if (!runner || !runner.approved) return;
    const channel = supabase
      .channel('runner-shell-orders')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'orders', filter: `rider_id=eq.${runner.user_id}` },
        () => checkActiveJob(runner.user_id)
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'errands', filter: `rider_id=eq.${runner.user_id}` },
        () => checkActiveJob(runner.user_id)
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [runner, checkActiveJob]);

  // ── Realtime: pick up a suspension (or reactivation) applied by an
  //     admin while the rider is sitting on the dashboard, without
  //     requiring a refresh. Admin mutations go through the service-role
  //     client in campus-admin, so this rider-side subscription is the
  //     only way the dashboard finds out. ──
  useEffect(() => {
    if (!runner) return;
    const channel = supabase
      .channel('runner-account-status')
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'rider_profiles', filter: `user_id=eq.${runner.user_id}` },
        (payload) => {
          setRunner(prev => prev ? {
            ...prev,
            account_status: payload.new.account_status,
            suspended_at: payload.new.suspended_at,
            suspended_reason: payload.new.suspended_reason,
            approved: payload.new.approved,
          } : prev);
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [runner?.user_id]);

  // Guarded here too as a second line of defense — but the real UI-level
  // gating (disabling the toggle button, showing why) belongs in whatever
  // component renders it, using `runner.approved` / `runner.account_status`
  // from this context. A suspended rider can never flip themselves online,
  // even if some future UI forgets to disable the button.
  const toggleOnline = async () => {
    if (!runner || !runner.approved || runner.account_status === 'suspended') return;
    setTogglingOnline(true);
    const nextValue = !runner.is_active;

    const { error } = await supabase
      .from('rider_profiles')
      .update({ is_active: nextValue })
      .eq('user_id', runner.user_id);

    if (!error) setRunner(prev => ({ ...prev, is_active: nextValue }));
    setTogglingOnline(false);
  };

  if (loading) {
    return (
      <div className="h-screen w-full flex items-center justify-center bg-slate-50 dark:bg-slate-950">
        <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  // No more full-dashboard gate here — an onboarded rider always sees
  // the shell. `runner.approved` and `runner.account_status` are exposed
  // through context so pages (Job Pool, Sidebar, etc.) can disable actions
  // and show a banner instead of blocking navigation entirely.
  return (
    <RunnerContext.Provider value={{
      runner, hasActiveJob, toggleOnline, togglingOnline,
      showNotifications, toggleNotifications, unreadCount,
    }}>
      {children}
    </RunnerContext.Provider>
  );
}