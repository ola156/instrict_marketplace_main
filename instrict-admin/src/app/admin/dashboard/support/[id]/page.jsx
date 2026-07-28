import { createAdminClient } from '@/utils/supabase/admin';
import { requireAdmin } from '@/lib/require-admin';
import TicketThread from './TicketThread';

export default async function TicketDetailPage({ params }) {
  await requireAdmin();
  const { id } = await params;

  const supabase = createAdminClient();

  const { data: ticket, error: ticketError } = await supabase
    .from('support_tickets')
    .select('*')
    .eq('id', id)
    .single();

  if (ticketError || !ticket) {
    return (
      <main className="p-6 md:p-8">
        <p className="text-rose-400 text-sm">Ticket not found.</p>
      </main>
    );
  }

  const { data: messages } = await supabase
    .from('support_ticket_messages')
    .select('*')
    .eq('ticket_id', id)
    .order('created_at', { ascending: true });

  let requesterName = null;
  if (ticket.user_role === 'vendor') {
    const { data } = await supabase.from('vendor_profiles').select('legal_name').eq('user_id', ticket.user_id).maybeSingle();
    requesterName = data?.legal_name;
  } else if (ticket.user_role === 'rider') {
    const { data } = await supabase.from('rider_profiles').select('full_name').eq('user_id', ticket.user_id).maybeSingle();
    requesterName = data?.full_name;
  } else if (ticket.user_role === 'student') {
    const { data } = await supabase.from('student_profiles').select('full_name').eq('user_id', ticket.user_id).maybeSingle();
    requesterName = data?.full_name;
  }

  return (
    <main className="p-6 md:p-8">
      <div className="max-w-2xl mx-auto">
        <TicketThread ticket={ticket} messages={messages || []} requesterName={requesterName} />
      </div>
    </main>
  );
}