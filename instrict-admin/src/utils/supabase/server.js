import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

// Session-aware client — runs as whoever is logged in, respects RLS.
// Use this for reading the current user / their role. NOT for admin
// data mutations across other people's rows — use utils/supabase/admin.js
// for that instead.
export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // called from a Server Component — middleware handles refresh
          }
        },
      },
    }
  );
}