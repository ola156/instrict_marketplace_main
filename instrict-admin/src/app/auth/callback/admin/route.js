import { createClient } from '@/utils/supabase/server';
import { NextResponse } from 'next/server';

// Deliberately separate from the main /auth/callback route. That route
// auto-assigns a role (defaulting to 'user') to anyone with no pending
// role cookie — fine for student/vendor/rider signup, but wrong here.
// Admin access is never self-granted: this callback only ever CHECKS
// user_roles for an existing active admin row. It never inserts one.
export async function GET(request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');

  if (!code) {
    return NextResponse.redirect(`${origin}/admin/auth?error=missing_code`);
  }

  const supabase = await createClient();

  const { data: sessionData, error: exchangeError } =
    await supabase.auth.exchangeCodeForSession(code);

  if (exchangeError || !sessionData?.user) {
    return NextResponse.redirect(`${origin}/admin/auth?error=exchange_failed`);
  }

  const user = sessionData.user;

  const { data: roleRow, error: roleError } = await supabase
    .from('user_roles')
    .select('status')
    .eq('user_id', user.id)
    .eq('role', 'admin')
    .maybeSingle();

  if (roleError || !roleRow) {
    // Authenticated as a real person, but not an admin. Sign them back
    // out immediately — this callback must never leave a session behind
    // for a non-admin account, even though Google verified their identity.
    await supabase.auth.signOut();
    return NextResponse.redirect(`${origin}/admin/auth?error=not_admin`);
  }

  if (roleRow.status !== 'active') {
    await supabase.auth.signOut();
    // role_status enum is {pending, active, rejected} — no separate
    // 'revoked'/'suspended' value exists yet, so anything non-active
    // and non-pending is reported as rejected.
    const reason = roleRow.status === 'pending' ? 'pending_approval' : 'access_rejected';
    return NextResponse.redirect(`${origin}/admin/auth?error=${reason}`);
  }

  return NextResponse.redirect(`${origin}/admin/dashboard`);
}