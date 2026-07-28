// app/admin/dashboard/accounts/page.jsx
import { createAdminClient } from '@/utils/supabase/admin';
import { requireAdmin } from '@/lib/require-admin';
import AccountsExplorer from './AccountsExplorer';

export default async function AccountsPage() {
  await requireAdmin();
  const supabase = createAdminClient();

  const [
    { data: vendors, error: vendorError },
    { data: riders, error: riderError },
    { data: students, error: studentError },
  ] = await Promise.all([
    supabase
      .from('vendor_profiles')
      .select('user_id, legal_name, category, support_phone, approved, account_status, suspended_at, suspended_reason, created_at')
      .order('created_at', { ascending: false }),
    supabase
      .from('rider_profiles')
      .select('user_id, full_name, phone, approved, account_status, suspended_at, suspended_reason, created_at')
      .order('created_at', { ascending: false }),
    supabase
      .from('student_profiles')
      .select('id, user_id, full_name, phone, account_status, suspended_at, suspended_reason, created_at')
      .order('created_at', { ascending: false }),
  ]);

  // Surface fetch failures loudly instead of rendering a silently-empty
  // list — this is exactly the kind of thing that just bit us.
  if (vendorError) console.error('Accounts page — vendor fetch failed:', vendorError.message);
  if (riderError) console.error('Accounts page — rider fetch failed:', riderError.message);
  if (studentError) console.error('Accounts page — student fetch failed:', studentError.message);

  return (
    <div className="max-w-5xl mx-auto px-5 py-6">
      <div className="mb-6">
        <h1 className="text-base font-black tracking-tight text-slate-900 dark:text-white">Accounts</h1>
        <p className="text-[11px] text-slate-400 mt-0.5">Search, filter, suspend, or reactivate vendor, rider, and student accounts</p>
      </div>

      {(vendorError || riderError || studentError) && (
        <div className="mb-4 rounded-xl border border-rose-500/20 bg-rose-500/5 px-4 py-3">
          <p className="text-[11px] font-bold text-rose-500">
            Some accounts failed to load. Check the server logs for details.
          </p>
        </div>
      )}

      <AccountsExplorer
        vendors={vendors || []}
        riders={riders || []}
        students={students || []}
      />
    </div>
  );
}