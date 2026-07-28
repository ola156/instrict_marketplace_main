import { createAdminClient } from '@/utils/supabase/admin';
import { requireAdmin } from '@/lib/require-admin';
import ApprovalCard from './ApprovalCard';

export default async function ApprovalsPage() {
  await requireAdmin();

  const supabase = createAdminClient();

  const { data: pendingVendors, error: vendorError } = await supabase
    .from('vendor_verifications')
    .select(
      `id, vendor_id, id_document_url, selfie_url, submitted_at,
       vendor_profiles ( legal_name, support_phone, category, store_address, phone_verified )`
    )
    .eq('status', 'pending')
    .order('submitted_at', { ascending: true });

  const { data: pendingRiders, error: riderError } = await supabase
    .from('rider_verifications')
    .select(
      `id, rider_id, id_document_url, selfie_url, license_url, submitted_at,
       rider_profiles ( full_name, phone, vehicle_type, license_plate, has_vehicle )`
    )
    .eq('status', 'pending')
    .order('submitted_at', { ascending: true });

  return (
    <main className="p-6 md:p-8">
      <div className="max-w-4xl mx-auto space-y-12">
        <div>
          <h1 className="text-2xl font-black tracking-tight">Pending Approvals</h1>
          <p className="text-sm text-slate-500 mt-1">
            Verification submissions awaiting review.
          </p>
        </div>

        <section>
          <h2 className="text-sm font-bold uppercase tracking-wider text-slate-400 mb-4">
            Vendors ({pendingVendors?.length ?? 0})
          </h2>
          {vendorError && (
            <p className="text-rose-400 text-sm">
              Failed to load vendors: {vendorError.message}
            </p>
          )}
          {pendingVendors?.length === 0 && (
            <p className="text-slate-600 text-sm">No pending vendor verifications.</p>
          )}
          <div className="space-y-3">
            {pendingVendors?.map((v) => (
              <ApprovalCard key={v.id} type="vendor" verification={v} />
            ))}
          </div>
        </section>

        <section>
          <h2 className="text-sm font-bold uppercase tracking-wider text-slate-400 mb-4">
            Riders ({pendingRiders?.length ?? 0})
          </h2>
          {riderError && (
            <p className="text-rose-400 text-sm">
              Failed to load riders: {riderError.message}
            </p>
          )}
          {pendingRiders?.length === 0 && (
            <p className="text-slate-600 text-sm">No pending rider verifications.</p>
          )}
          <div className="space-y-3">
            {pendingRiders?.map((r) => (
              <ApprovalCard key={r.id} type="rider" verification={r} />
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}