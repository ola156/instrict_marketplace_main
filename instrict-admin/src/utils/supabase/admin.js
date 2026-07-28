import { createClient as createSupabaseClient } from '@supabase/supabase-js';

// Service-role client — full database access, bypasses RLS entirely.
// SERVER-ONLY. Never import this file in a Client Component ('use client')
// or any code that ships to the browser. Only call it from Server Actions,
// Route Handlers, or Server Components, and always after requireAdmin()
// has confirmed the caller is an active admin (see lib/require-admin.js).
export function createAdminClient() {
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error('SUPABASE_SERVICE_ROLE_KEY is not set');
  }

  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    }
  );
}