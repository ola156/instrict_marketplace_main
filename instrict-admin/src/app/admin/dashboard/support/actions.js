'use server';

import { createAdminClient } from '@/utils/supabase/admin';
import { requireAdmin } from '@/lib/require-admin';
import { revalidatePath } from 'next/cache';

// Kept from before — still useful as a standalone lookup tool, separate
// from the ticket system.
export async function lookupById(id) {
  await requireAdmin();
  const supabase = createAdminClient();

  if (!id || !id.trim()) return { type: null };
  const trimmed = id.trim();

  const { data: order } = await supabase
    .from('orders')
    .select(
      `*, vendor_profiles ( legal_name ), rider_profiles ( full_name ), student_profiles ( full_name, phone )`
    )
    .eq('id', trimmed)
    .maybeSingle();
  if (order) return { type: 'order', data: order };

  const { data: vendor } = await supabase.from('vendor_profiles').select('*').eq('user_id', trimmed).maybeSingle();
  if (vendor) return { type: 'vendor', data: vendor };

  const { data: rider } = await supabase.from('rider_profiles').select('*').eq('user_id', trimmed).maybeSingle();
  if (rider) return { type: 'rider', data: rider };

  const { data: student } = await supabase
    .from('student_profiles')
    .select('*')
    .or(`id.eq.${trimmed},user_id.eq.${trimmed}`)
    .maybeSingle();
  if (student) return { type: 'student', data: student };

  return { type: null };
}

export async function sendAdminReply(ticketId, message) {
  const admin = await requireAdmin();

  if (!message || !message.trim()) {
    return { error: 'Message cannot be empty.' };
  }

  const supabase = createAdminClient();

  const { data: ticket, error: ticketError } = await supabase
    .from('support_tickets')
    .select('status')
    .eq('id', ticketId)
    .single();
  if (ticketError || !ticket) return { error: 'Ticket not found.' };

  const { error: msgError } = await supabase.from('support_ticket_messages').insert({
    ticket_id: ticketId,
    sender_id: admin.id,
    sender_type: 'admin',
    message: message.trim(),
  });
  if (msgError) return { error: msgError.message };

  const { error: updateError } = await supabase
    .from('support_tickets')
    .update({
      last_message_at: new Date().toISOString(),
      // First admin reply moves it out of raw 'open' automatically.
      status: ticket.status === 'open' ? 'in_progress' : ticket.status,
    })
    .eq('id', ticketId);
  if (updateError) return { error: updateError.message };

  revalidatePath(`/admin/dashboard/support/${ticketId}`);
  revalidatePath('/admin/dashboard/support');
  return { success: true };
}

export async function updateTicketStatus(ticketId, status) {
  await requireAdmin();

  if (!['open', 'in_progress', 'resolved', 'closed'].includes(status)) {
    return { error: 'Invalid status.' };
  }

  const supabase = createAdminClient();

  const { error } = await supabase.from('support_tickets').update({ status }).eq('id', ticketId);
  if (error) return { error: error.message };

  revalidatePath(`/admin/dashboard/support/${ticketId}`);
  revalidatePath('/admin/dashboard/support');
  return { success: true };
}