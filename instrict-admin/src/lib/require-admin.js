import { createClient } from '@/utils/supabase/server';

// Defense in depth: middleware already blocks /admin/dashboard/* for
// non-admins, but Server Actions are POST endpoints in their own right.
// Call this at the top of every Server Action that touches admin data,
// so a mutation can never run on behalf of a non-admin session even if
// middleware config ever drifts or a request bypasses it some other way.
export async function requireAdmin() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error('Not authenticated');
  }

  const { data: roleRow } = await supabase
    .from('user_roles')
    .select('status')
    .eq('user_id', user.id)
    .eq('role', 'admin')
    .maybeSingle();

  if (!roleRow || roleRow.status !== 'active') {
    throw new Error('Not authorized');
  }

  return user;
}