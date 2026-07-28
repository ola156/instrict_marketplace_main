import { createClient } from '@/utils/supabase/server';
import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

export async function GET(request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');

  if (!code) {
    return NextResponse.redirect(`${origin}/auth/auth-error`);
  }

  const cookieStore = await cookies();
  const pendingRoleFromCookie = cookieStore.get('pending_role')?.value;
  const campusFromCookie = cookieStore.get('pending_campus')?.value;

  const supabase = await createClient();

  const { data: sessionData, error: exchangeError } =
    await supabase.auth.exchangeCodeForSession(code);

  if (exchangeError || !sessionData?.user) {
    return NextResponse.redirect(`${origin}/auth/auth-error`);
  }

  const user = sessionData.user;

  const pendingRole = user.user_metadata?.pending_role || pendingRoleFromCookie || 'user';
  const campus = user.user_metadata?.campus || campusFromCookie;

  // Fix campus if it landed as 'unspecified' from the trigger
  if (campus) {
    await supabase
      .from('profiles')
      .update({ campus })
      .eq('id', user.id)
      .eq('campus', 'unspecified');
  }

  // Check if this user already has this role
  const { data: existingRole } = await supabase
    .from('user_roles')
    .select('role, status')
    .eq('user_id', user.id)
    .eq('role', pendingRole)
    .maybeSingle();

  let destination;

  if (existingRole) {
    // Existing role — check onboarding completion and route correctly
    destination = await resolveDestination(supabase, user.id, pendingRole);
  } else {
    // Brand new role — insert it then send to onboarding
    const initialStatus = pendingRole === 'user' ? 'active' : 'pending';
    await supabase.from('user_roles').insert({
      user_id: user.id,
      role: pendingRole,
      status: initialStatus,
    });
    destination = roleOnboardingPath(pendingRole);
  }

  const response = NextResponse.redirect(`${origin}${destination}`);

  // Clean up temporary cookies
  response.cookies.delete('pending_role');
  response.cookies.delete('pending_campus');

  return response;
}

// Where to send a brand new signup for each role
function roleOnboardingPath(role) {
  switch (role) {
    case 'vendor': return '/onboarding/vendor';
    case 'rider':  return '/onboarding/rider';
    case 'user':   return '/onboarding/user';
    default:       return '/onboarding/user';
  }
}

// Where to send an existing user — checks onboarding completion per role
async function resolveDestination(supabase, userId, role) {
  if (role === 'vendor') {
    const { data: vendorProfile } = await supabase
      .from('vendor_profiles')
      .select('user_id, phone_verified')
      .eq('user_id', userId)
      .maybeSingle();

    if (!vendorProfile) return '/onboarding/vendor';
    if (!vendorProfile.phone_verified) return '/onboarding/vendor';
    return '/dashboard';
  }

  if (role === 'rider') {
    const { data: riderProfile } = await supabase
      .from('rider_profiles')
      .select('user_id, phone_verified, full_name')
      .eq('user_id', userId)
      .maybeSingle();

    if (!riderProfile) return '/onboarding/rider';
    if (!riderProfile.phone_verified) return '/onboarding/rider';
    return '/jobs';
  }

  if (role === 'user') {
    const { data: studentProfile } = await supabase
      .from('student_profiles')
      .select('user_id, phone_verified')
      .eq('user_id', userId)
      .maybeSingle();

    if (!studentProfile) return '/onboarding/student';
    if (!studentProfile.phone_verified) return '/onboarding/student';
    return '/home';
  }

  return '/onboarding/student';
}