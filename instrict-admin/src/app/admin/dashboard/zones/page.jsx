import { requireAdmin } from '@/lib/require-admin';
import { createAdminClient } from '@/utils/supabase/admin';
import ZonesClient from './ZonesClient';

export default async function ZonesPage() {
  await requireAdmin();
  const supabase = createAdminClient();

  const [{ data: campuses }, { data: zones }, { data: fees }] = await Promise.all([
    supabase.from('campuses').select('*').order('name'),
    supabase.from('delivery_zones').select('*').order('name'),
    supabase.from('delivery_zone_fees').select('*'),
  ]);

  return (
    <ZonesClient
      initialCampuses={campuses || []}
      initialZones={zones || []}
      initialFees={fees || []}
    />
  );
}