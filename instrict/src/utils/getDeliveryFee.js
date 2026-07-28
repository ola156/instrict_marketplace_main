// utils/getDeliveryFee.js
import { createClient } from '@/utils/supabase/client';

/**
 * Resolves the delivery fee between a vendor's current zone and a
 * student's zone. Falls back to the campus default_delivery_fee if
 * no explicit override exists for that pair — so the system works
 * correctly even before every zone pair has been priced by an admin.
 */
export async function getDeliveryFee({ campusId, vendorZoneId, studentZoneId }) {
  const supabase = createClient();

  if (!campusId || !vendorZoneId || !studentZoneId) {
    return { fee: null, error: 'Missing zone information' };
  }

  const [{ data: override }, { data: campus }] = await Promise.all([
    supabase
      .from('delivery_zone_fees')
      .select('fee')
      .eq('vendor_zone_id', vendorZoneId)
      .eq('student_zone_id', studentZoneId)
      .maybeSingle(),
    supabase
      .from('campuses')
      .select('default_delivery_fee')
      .eq('id', campusId)
      .single(),
  ]);

  if (override?.fee != null) {
    return { fee: override.fee, error: null };
  }

  return { fee: campus?.default_delivery_fee ?? 300, error: null };
}