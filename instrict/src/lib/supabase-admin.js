import { createClient } from '@supabase/supabase-js';

// Service-role client — bypasses RLS entirely.
// ONLY use this in trusted server-to-server contexts (webhooks, cron jobs).
// Never import this into anything reachable by user-triggered requests
// that should respect RLS (regular API routes, Server Components, etc.)
export function createAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
}