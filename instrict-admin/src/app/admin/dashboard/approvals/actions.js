'use server';

import { createAdminClient } from '@/utils/supabase/admin';
import { requireAdmin } from '@/lib/require-admin';
import { revalidatePath } from 'next/cache';

export async function approveVendor(verificationId, vendorId) {
  const admin = await requireAdmin();
  const supabase = createAdminClient();

  const { error: verificationError } = await supabase
    .from('vendor_verifications')
    .update({ status: 'approved', reviewed_at: new Date().toISOString(), reviewed_by: admin.id })
    .eq('id', verificationId);

  if (verificationError) throw new Error(verificationError.message);

  const { error: profileError } = await supabase
    .from('vendor_profiles')
    .update({ approved: true, rejected_at: null, rejection_reason: null })
    .eq('user_id', vendorId);

  if (profileError) throw new Error(profileError.message);
  revalidatePath('/admin/dashboard/approvals');
}

export async function rejectVendor(verificationId, vendorId, reason) {
  const admin = await requireAdmin();

  if (!reason || !reason.trim()) {
    throw new Error('A rejection reason is required.');
  }

  const supabase = createAdminClient();
  const trimmedReason = reason.trim();

  const { error: verificationError } = await supabase
    .from('vendor_verifications')
    .update({
      status: 'rejected',
      rejection_reason: trimmedReason,
      reviewed_at: new Date().toISOString(),
      reviewed_by: admin.id,
    })
    .eq('id', verificationId);

  if (verificationError) throw new Error(verificationError.message);

  const { error: profileError } = await supabase
    .from('vendor_profiles')
    .update({
      approved: false,
      rejected_at: new Date().toISOString(),
      rejection_reason: trimmedReason,
    })
    .eq('user_id', vendorId);

  if (profileError) throw new Error(profileError.message);
  revalidatePath('/admin/dashboard/approvals');
}

export async function approveRider(verificationId, riderId) {
  const admin = await requireAdmin();
  const supabase = createAdminClient();

  const { error: verificationError } = await supabase
    .from('rider_verifications')
    .update({ status: 'approved', reviewed_at: new Date().toISOString(), reviewed_by: admin.id })
    .eq('id', verificationId);

  if (verificationError) throw new Error(verificationError.message);

  const { error: profileError } = await supabase
    .from('rider_profiles')
    .update({ approved: true, rejected_at: null, rejection_reason: null })
    .eq('user_id', riderId);

  if (profileError) throw new Error(profileError.message);
  revalidatePath('/admin/dashboard/approvals');
}

export async function rejectRider(verificationId, riderId, reason) {
  const admin = await requireAdmin();

  if (!reason || !reason.trim()) {
    throw new Error('A rejection reason is required.');
  }

  const supabase = createAdminClient();
  const trimmedReason = reason.trim();

  const { error: verificationError } = await supabase
    .from('rider_verifications')
    .update({
      status: 'rejected',
      rejection_reason: trimmedReason,
      reviewed_at: new Date().toISOString(),
      reviewed_by: admin.id,
    })
    .eq('id', verificationId);

  if (verificationError) throw new Error(verificationError.message);

  const { error: profileError } = await supabase
    .from('rider_profiles')
    .update({
      approved: false,
      rejected_at: new Date().toISOString(),
      rejection_reason: trimmedReason,
    })
    .eq('user_id', riderId);

  if (profileError) throw new Error(profileError.message);
  revalidatePath('/admin/dashboard/approvals');
}