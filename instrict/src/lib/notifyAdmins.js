import { sendPushToTokens } from '@/lib/sendPush';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

/**
 * Notifies all admins with a saved push token about new activity
 * (new order, new errand). Fire-and-forget — callers should .catch() this.
 *
 * Uses the service-role client, not the caller's own session client —
 * admin_notification_tokens' RLS policy only allows an admin to read their
 * own row, so a student/vendor/rider's session would see zero rows here
 * even though real tokens exist.
 */
export async function notifyAdminsOfActivity(_supabase, { title, body }) {
  const { data: admins } = await supabaseAdmin
    .from('admin_notification_tokens')
    .select('fcm_token')
    .not('fcm_token', 'is', null);

  const tokens = (admins || []).map((a) => a.fcm_token);
  if (tokens.length === 0) return;

  // Pass supabaseAdmin here too, not _supabase — the dead-token cleanup
  // write inside sendPushToTokens would hit the same RLS wall otherwise.
  await sendPushToTokens(supabaseAdmin, tokens, { title, body }, 'admin_notification_tokens');
}