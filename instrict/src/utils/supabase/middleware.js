import { createServerClient } from '@supabase/ssr';
import { NextResponse } from 'next/server';

export async function updateSession(request) {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // IMPORTANT: do not run code between createServerClient and
  // supabase.auth.getUser(). A simple mistake could cause random
  // logouts.
  const { data: { user } } = await supabase.auth.getUser();

  // Returned alongside the response so middleware.js can gate protected
  // routes on it. Previously this was discarded entirely — the session
  // cookie got refreshed but nothing ever checked whether a user existed,
  // so every page route was reachable regardless of auth state.
  return { response: supabaseResponse, user };
}