// app/admin/dashboard/accounts/actions.js
'use server';

import { createAdminClient } from '@/utils/supabase/admin';
import { requireAdmin } from '@/lib/require-admin';
import { revalidatePath } from 'next/cache';

const TABLE = {
  vendor: 'vendor_profiles',
  rider: 'rider_profiles',
  student: 'student_profiles',
};
const ID_COLUMN = {
  vendor: 'user_id',
  rider: 'user_id',
  student: 'user_id', // confirm this — see note below
};

export async function suspendAccount(role, targetUserId, reason) {
  const admin = await requireAdmin();
  if (!reason?.trim()) {
    return { ok: false, message: 'A reason is required to suspend an account.' };
  }

  const supabase = createAdminClient();
  const table = TABLE[role];
  const idColumn = ID_COLUMN[role];

  const { error } = await supabase
    .from(table)
    .update({
      account_status: 'suspended',
      suspended_at: new Date().toISOString(),
      suspended_reason: reason.trim(),
      suspended_by: admin.id,
    })
    .eq(idColumn, targetUserId);

  if (error) return { ok: false, message: error.message };

  revalidatePath('/admin/dashboard/accounts');
  return { ok: true };
}

export async function reactivateAccount(role, targetUserId) {
  await requireAdmin();

  const supabase = createAdminClient();
  const table = TABLE[role];
  const idColumn = ID_COLUMN[role];

  const { error } = await supabase
    .from(table)
    .update({
      account_status: 'active',
      suspended_at: null,
      suspended_reason: null,
      suspended_by: null,
    })
    .eq(idColumn, targetUserId);

  if (error) return { ok: false, message: error.message };

  revalidatePath('/admin/dashboard/accounts');
  return { ok: true };
}