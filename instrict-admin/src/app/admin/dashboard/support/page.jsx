import Link from 'next/link';
import { createAdminClient } from '@/utils/supabase/admin';
import { requireAdmin } from '@/lib/require-admin';
import LookupForm from './LookupForm';

const STATUS_COLORS = {
  open: 'text-amber-400',
  in_progress: 'text-blue-400',
  resolved: 'text-emerald-400',
  closed: 'text-slate-500',
};

export default async function SupportPage() {
  await requireAdmin();
  const supabase = createAdminClient();

  const { data: tickets, error } = await supabase
    .from('support_tickets')
    .select('id, user_id, user_role, subject, status, order_id, created_at, last_message_at')
    .order('last_message_at', { ascending: false })
    .limit(50);

  // Resolve requester display names in batches per role, instead of one
  // query per ticket.
  const vendorIds = (tickets || []).filter((t) => t.user_role === 'vendor').map((t) => t.user_id);
  const riderIds = (tickets || []).filter((t) => t.user_role === 'rider').map((t) => t.user_id);
  const studentIds = (tickets || []).filter((t) => t.user_role === 'student').map((t) => t.user_id);

  const [{ data: vendors }, { data: riders }, { data: students }] = await Promise.all([
    vendorIds.length
      ? supabase.from('vendor_profiles').select('user_id, legal_name').in('user_id', vendorIds)
      : Promise.resolve({ data: [] }),
    riderIds.length
      ? supabase.from('rider_profiles').select('user_id, full_name').in('user_id', riderIds)
      : Promise.resolve({ data: [] }),
    studentIds.length
      ? supabase.from('student_profiles').select('user_id, full_name').in('user_id', studentIds)
      : Promise.resolve({ data: [] }),
  ]);

  const nameMap = {};
  (vendors || []).forEach((v) => (nameMap[v.user_id] = v.legal_name));
  (riders || []).forEach((r) => (nameMap[r.user_id] = r.full_name));
  (students || []).forEach((s) => (nameMap[s.user_id] = s.full_name));

  return (
    <main className="p-6 md:p-8">
      <div className="max-w-4xl mx-auto space-y-10">
        <div>
          <h1 className="text-2xl font-black tracking-tight">Support & Trust</h1>
          <p className="text-sm text-slate-500 mt-1">
            Help desk for vendors, riders, and students — plus quick ID lookups.
          </p>
        </div>

        <section>
          <h2 className="text-sm font-bold uppercase tracking-wider text-slate-400 mb-4">ID Lookup</h2>
          <LookupForm />
        </section>

        <section>
          <h2 className="text-sm font-bold uppercase tracking-wider text-slate-400 mb-4">
            Support tickets ({tickets?.length ?? 0})
          </h2>
          {error && <p className="text-rose-400 text-sm">Failed to load tickets: {error.message}</p>}
          {tickets?.length === 0 && <p className="text-slate-600 text-sm">No support tickets yet.</p>}
          <div className="space-y-2">
            {tickets?.map((t) => (
              <Link
                key={t.id}
                href={`/admin/dashboard/support/${t.id}`}
                className="block rounded-lg border border-slate-800 bg-slate-900/50 p-4 hover:border-slate-700 transition-colors"
              >
                <div className="flex justify-between items-start gap-3">
                  <div className="min-w-0">
                    <p className="text-sm font-bold text-slate-100 truncate">{t.subject}</p>
                    <p className="text-xs text-slate-500 mt-0.5">
                      {nameMap[t.user_id] || t.user_id} · {t.user_role}
                      {t.order_id ? ` · order #${t.order_id.slice(0, 8)}` : ''}
                    </p>
                  </div>
                  <span className={`text-xs font-bold uppercase shrink-0 ${STATUS_COLORS[t.status]}`}>
                    {t.status.replace('_', ' ')}
                  </span>
                </div>
                <p className="text-[10px] text-slate-600 font-mono mt-2">
                  Last activity {new Date(t.last_message_at).toLocaleString()}
                </p>
              </Link>
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}