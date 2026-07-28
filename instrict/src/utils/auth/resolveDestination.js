// utils/auth/resolveDestination.js
export async function resolveUserDestination(supabase, userId) {
  const { data: roles } = await supabase
    .from('user_roles')
    .select('role, status')
    .eq('user_id', userId);

  if (!roles || roles.length === 0) {
    return '/auth/student'; // no role at all — send back to login
  }

  // ── VENDOR ──
  const vendorRole = roles.find((r) => r.role === 'vendor');
  if (vendorRole) {
    const { data: vendorProfile } = await supabase
      .from('vendor_profiles')
      .select('user_id, phone_verified')
      .eq('user_id', userId)
      .maybeSingle();

    if (!vendorProfile) return '/onboarding/vendor';
    if (!vendorProfile.phone_verified) return '/onboarding/vendor';
    return '/dashboard';
  }

  // ── RIDER ──
  const riderRole = roles.find((r) => r.role === 'rider');
  if (riderRole) {
    const { data: riderProfile } = await supabase
      .from('rider_profiles')
      .select('user_id, phone_verified, full_name')
      .eq('user_id', userId)
      .maybeSingle();

    // No profile at all — never started onboarding
    if (!riderProfile) return '/onboarding/rider';

    // Started step 1 (profile exists) but never verified phone
    if (!riderProfile.phone_verified) return '/onboarding/rider';

    // Fully onboarded — but rider approval is still pending
    // We still send them to their dashboard; the dashboard
    // handles showing a "pending approval" state
    return '/jobs';
  }

  // ── USER (STUDENT) ──
  const userRole = roles.find((r) => r.role === 'user');
  if (userRole) {
    const { data: studentProfile } = await supabase
      .from('student_profiles')
      .select('user_id, phone_verified, full_name')
      .eq('user_id', userId)
      .maybeSingle();

    // No profile at all — never started onboarding
    if (!studentProfile) return '/onboarding/student';

    // Started step 1 but never verified phone
    if (!studentProfile.phone_verified) return '/onboarding/student';

    // Fully onboarded
    return '/home';
  }

  // Fallback — role exists but isn't one we recognise
  return '/auth/student';
}