import { sendPushToTokens } from '@/lib/sendPush';

/**
 * Notifies all online, approved riders that a new job is available.
 * Fire-and-forget — callers should .catch() this, never await-block on it.
 */
export async function notifyRidersOfNewJob(supabase, { title, body }) {
  const { data: riders } = await supabase
    .from('rider_profiles')
    .select('fcm_token')
    .eq('is_active', true)
    .eq('approved', true)
    .not('fcm_token', 'is', null);

  const tokens = (riders || []).map((r) => r.fcm_token);
  if (tokens.length === 0) return;

  await sendPushToTokens(supabase, tokens, { title, body }, 'rider_profiles');
}