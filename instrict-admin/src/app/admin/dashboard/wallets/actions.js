'use server';

import { revalidatePath } from 'next/cache';
import { requireAdmin } from '@/lib/require-admin';
import { createAdminClient } from '@/utils/supabase/admin';
import { createTransferRecipient, initiateTransfer } from '@/lib/paystack';
import { randomUUID } from 'crypto';

const WALLETS_PATH = '/admin/dashboard/wallets';

// Shared helper: get-or-create a Paystack transfer recipient for a wallet row,
// caching the recipient_code so repeat payouts don't recreate it every time.
async function ensureRecipient(supabase, table, idColumn, idValue, wallet) {
  if (wallet.paystack_recipient_code) return wallet.paystack_recipient_code;

  const recipient = await createTransferRecipient({
    name: wallet.account_name,
    account_number: wallet.account_number,
    bank_code: wallet.bank_code,
  });

  await supabase
    .from(table)
    .update({ paystack_recipient_code: recipient.recipient_code })
    .eq(idColumn, idValue);

  return recipient.recipient_code;
}

// ---------- Vendor withdrawals ----------

export async function markVendorWithdrawalPaid(requestId) {
  await requireAdmin();
  const supabase = createAdminClient();

  const { data: request, error: fetchErr } = await supabase
    .from('vendor_withdrawal_requests')
    .select('*')
    .eq('id', requestId)
    .single();
  if (fetchErr || !request) return { error: fetchErr?.message || 'Request not found.' };
  if (request.status !== 'pending') return { error: 'This request has already been processed.' };

  const { data: wallet, error: walletFetchErr } = await supabase
    .from('vendor_wallet')
    .select('*')
    .eq('vendor_id', request.vendor_id)
    .single();
  if (walletFetchErr || !wallet) return { error: 'Vendor wallet not found.' };
  if (!wallet.bank_code || !wallet.account_number || !wallet.account_name) {
    return { error: 'Vendor has no verified bank details on file.' };
  }

  // 1. Move the real money first — only touch the DB status once Paystack
  //    confirms the transfer actually went out. Never mark paid on a
  //    transfer that failed.
  let transfer;
  try {
    const recipientCode = await ensureRecipient(supabase, 'vendor_wallet', 'vendor_id', request.vendor_id, wallet);
    transfer = await initiateTransfer({
      amountKobo: Math.round(Number(request.amount) * 100),
      recipientCode,
      reference: `vendor_payout_${randomUUID()}`,
      reason: `Instrict vendor payout — request ${request.id}`,
    });
  } catch (err) {
    console.error('vendor transfer error:', err);
    return { error: `Transfer failed: ${err.message}` };
  }

  const { error: walletErr } = await supabase.rpc('decrement_vendor_pending_payout', {
    p_vendor_id: request.vendor_id,
    p_amount: request.amount,
  });
  if (walletErr) return { error: walletErr.message };

  const { error } = await supabase
    .from('vendor_withdrawal_requests')
    .update({
      status: 'paid',
      processed_at: new Date().toISOString(),
      transfer_code: transfer.transfer_code,
      transfer_reference: transfer.reference,
    })
    .eq('id', requestId);
  if (error) return { error: error.message };

  revalidatePath(WALLETS_PATH);
  return { success: true };
}

export async function rejectVendorWithdrawal(requestId, reason) {
  await requireAdmin();
  if (!reason || !reason.trim()) return { error: 'A rejection reason is required.' };

  const supabase = createAdminClient();

  const { data: request, error: fetchErr } = await supabase
    .from('vendor_withdrawal_requests')
    .select('*')
    .eq('id', requestId)
    .single();
  if (fetchErr || !request) return { error: fetchErr?.message || 'Request not found.' };
  if (request.status !== 'pending') return { error: 'This request has already been processed.' };

  const { error: walletErr } = await supabase.rpc('refund_vendor_pending_payout', {
    p_vendor_id: request.vendor_id,
    p_amount: request.amount,
  });
  if (walletErr) return { error: walletErr.message };

  const { error } = await supabase
    .from('vendor_withdrawal_requests')
    .update({ status: 'rejected', processed_at: new Date().toISOString(), rejection_reason: reason.trim() })
    .eq('id', requestId);
  if (error) return { error: error.message };

  revalidatePath(WALLETS_PATH);
  return { success: true };
}

// ---------- Rider withdrawals ----------

export async function markRiderWithdrawalPaid(requestId) {
  await requireAdmin();
  const supabase = createAdminClient();

  const { data: request, error: fetchErr } = await supabase
    .from('rider_withdrawal_requests')
    .select('*')
    .eq('id', requestId)
    .single();
  if (fetchErr || !request) return { error: fetchErr?.message || 'Request not found.' };
  if (request.status !== 'pending') return { error: 'This request has already been processed.' };

  const { data: wallet, error: walletFetchErr } = await supabase
    .from('rider_wallets')
    .select('*')
    .eq('rider_id', request.rider_id)
    .single();
  if (walletFetchErr || !wallet) return { error: 'Rider wallet not found.' };
  if (!wallet.bank_code || !wallet.account_number || !wallet.account_name) {
    return { error: 'Rider has no verified bank details on file.' };
  }

  let transfer;
  try {
    const recipientCode = await ensureRecipient(supabase, 'rider_wallets', 'rider_id', request.rider_id, wallet);
    transfer = await initiateTransfer({
      amountKobo: Math.round(Number(request.amount) * 100),
      recipientCode,
      reference: `rider_payout_${randomUUID()}`,
      reason: `Instrict rider payout — request ${request.id}`,
    });
  } catch (err) {
    console.error('rider transfer error:', err);
    return { error: `Transfer failed: ${err.message}` };
  }

  const { error: walletErr } = await supabase.rpc('decrement_rider_pending_payout', {
    p_rider_id: request.rider_id,
    p_amount: request.amount,
  });
  if (walletErr) return { error: walletErr.message };

  const { error } = await supabase
    .from('rider_withdrawal_requests')
    .update({
      status: 'paid',
      processed_at: new Date().toISOString(),
      transfer_code: transfer.transfer_code,
      transfer_reference: transfer.reference,
    })
    .eq('id', requestId);
  if (error) return { error: error.message };

  await supabase.from('rider_wallet_transactions').insert({
    rider_id: request.rider_id,
    amount: -Number(request.amount),
    type: 'withdrawal',
    description: 'Payout processed by admin',
  });

  revalidatePath(WALLETS_PATH);
  return { success: true };
}

export async function rejectRiderWithdrawal(requestId, reason) {
  await requireAdmin();
  if (!reason || !reason.trim()) return { error: 'A rejection reason is required.' };

  const supabase = createAdminClient();

  const { data: request, error: fetchErr } = await supabase
    .from('rider_withdrawal_requests')
    .select('*')
    .eq('id', requestId)
    .single();
  if (fetchErr || !request) return { error: fetchErr?.message || 'Request not found.' };
  if (request.status !== 'pending') return { error: 'This request has already been processed.' };

  const { error: walletErr } = await supabase.rpc('refund_rider_pending_payout', {
    p_rider_id: request.rider_id,
    p_amount: request.amount,
  });
  if (walletErr) return { error: walletErr.message };

  const { error } = await supabase
    .from('rider_withdrawal_requests')
    .update({ status: 'rejected', processed_at: new Date().toISOString(), rejection_reason: reason.trim() })
    .eq('id', requestId);
  if (error) return { error: error.message };

  await supabase.from('rider_wallet_transactions').insert({
    rider_id: request.rider_id,
    amount: Number(request.amount),
    type: 'adjustment',
    description: `Withdrawal rejected — returned to balance: ${reason.trim()}`,
  });

  revalidatePath(WALLETS_PATH);
  return { success: true };
}