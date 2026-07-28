import { adminMessaging } from '@/lib/firebaseAdmin';

/**
 * Sends a push notification to a batch of tokens and clears out any that
 * FCM reports as dead. Never throws — a push failure should never take
 * down order creation, so callers can fire-and-forget this.
 *
 * @param {import('@supabase/supabase-js').SupabaseClient} supabase
 * @param {string[]} tokens
 * @param {{ title: string, body: string }} message
 * @param {string} cleanupTable - table to null out dead tokens on
 */
export async function sendPushToTokens(supabase, tokens, message, cleanupTable) {
  if (!adminMessaging) {
    // Firebase Admin failed to initialize (missing/bad env vars) — already
    // logged at import time in firebaseAdmin.js. Just skip sending rather
    // than throwing here too.
    return;
  }

  const cleanTokens = [...new Set(tokens)].filter(Boolean);
  if (cleanTokens.length === 0) return;

  try {
    const response = await adminMessaging.sendEachForMulticast({
      tokens: cleanTokens,
      notification: message,
    });

    const invalidTokens = [];
    response.responses.forEach((res, idx) => {
      if (!res.success) {
        const code = res.error?.code || '';
        if (code.includes('registration-token-not-registered') || code.includes('invalid-argument')) {
          invalidTokens.push(cleanTokens[idx]);
        }
      }
    });

    if (invalidTokens.length > 0 && cleanupTable) {
      await supabase.from(cleanupTable).update({ fcm_token: null }).in('fcm_token', invalidTokens);
    }
  } catch (err) {
    // Swallow — notification delivery is best-effort, order flow must
    // never fail because of it.
    console.error('[push] send error:', err);
  }
}