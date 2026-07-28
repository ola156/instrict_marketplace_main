// utils/campusZones.js
import { createClient } from '@/utils/supabase/client';

/**
 * Resolves a campus row by slug (matching whatever useCampusStore holds,
 * e.g. 'ui') and returns its active delivery zones. Used anywhere a
 * hostel/zone dropdown needs to be populated — onboarding, profile,
 * vendor settings.
 */
export async function getCampusWithZones(campusSlug) {
  const supabase = createClient();

  const { data: campus, error: campusError } = await supabase
    .from('campuses')
    .select('id, name, slug, default_delivery_fee')
    .eq('slug', campusSlug)
    .maybeSingle();

  if (campusError || !campus) {
    return { campus: null, zones: [], error: campusError?.message || 'Campus not found' };
  }

  const { data: zones, error: zonesError } = await supabase
    .from('delivery_zones')
    .select('id, name, zone_type')
    .eq('campus_id', campus.id)
    .eq('is_active', true)
    .order('name', { ascending: true });

  if (zonesError) {
    return { campus, zones: [], error: zonesError.message };
  }

  return { campus, zones: zones || [], error: null };
}