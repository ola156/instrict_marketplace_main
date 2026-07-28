import { createClient } from '@supabase/supabase-js';

// Service-role client — bypasses RLS entirely. Server-only, never import
// this into anything reachable from the browser. Needed here because
// notifyAdminsOfActivity runs inside a request made by a student/vendor/
// rider's own session, which (correctly) can't read another user's
// admin_notification_tokens row under RLS.
export const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);