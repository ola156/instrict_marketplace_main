'use server';

import { revalidatePath } from 'next/cache';
import { requireAdmin } from '@/lib/require-admin';
import { createAdminClient } from '@/utils/supabase/admin';

const ZONES_PATH = '/admin/dashboard/zones';

// ---------- Campuses ----------

export async function createCampus({ name, slug, default_delivery_fee }) {
  await requireAdmin();
  const supabase = createAdminClient();

  const { error } = await supabase.from('campuses').insert({
    name,
    slug,
    default_delivery_fee: Number(default_delivery_fee) || 300,
  });

  if (error) return { error: error.message };
  revalidatePath(ZONES_PATH);
  return { success: true };
}

export async function updateCampus(id, updates) {
  await requireAdmin();
  const supabase = createAdminClient();

  const payload = {};
  if (updates.name !== undefined) payload.name = updates.name;
  if (updates.slug !== undefined) payload.slug = updates.slug;
  if (updates.default_delivery_fee !== undefined) {
    payload.default_delivery_fee = Number(updates.default_delivery_fee);
  }

  const { error } = await supabase.from('campuses').update(payload).eq('id', id);
  if (error) return { error: error.message };
  revalidatePath(ZONES_PATH);
  return { success: true };
}

export async function deleteCampus(id) {
  await requireAdmin();
  const supabase = createAdminClient();

  // Cascades to delivery_zones -> delivery_zone_fees automatically (on delete cascade)
  const { error } = await supabase.from('campuses').delete().eq('id', id);
  if (error) return { error: error.message };
  revalidatePath(ZONES_PATH);
  return { success: true };
}

// ---------- Zones ----------

export async function createZone({ campus_id, name, zone_type }) {
  await requireAdmin();
  const supabase = createAdminClient();

  const { error } = await supabase.from('delivery_zones').insert({
    campus_id,
    name,
    zone_type: zone_type || 'hostel',
  });

  if (error) return { error: error.message };
  revalidatePath(ZONES_PATH);
  return { success: true };
}

export async function updateZone(id, updates) {
  await requireAdmin();
  const supabase = createAdminClient();

  const payload = {};
  if (updates.name !== undefined) payload.name = updates.name;
  if (updates.zone_type !== undefined) payload.zone_type = updates.zone_type;
  if (updates.is_active !== undefined) payload.is_active = updates.is_active;

  const { error } = await supabase.from('delivery_zones').update(payload).eq('id', id);
  if (error) return { error: error.message };
  revalidatePath(ZONES_PATH);
  return { success: true };
}

export async function deleteZone(id) {
  await requireAdmin();
  const supabase = createAdminClient();

  // Cascades to any delivery_zone_fees referencing this zone as vendor or student side
  const { error } = await supabase.from('delivery_zones').delete().eq('id', id);
  if (error) return { error: error.message };
  revalidatePath(ZONES_PATH);
  return { success: true };
}

// ---------- Fee overrides ----------

export async function upsertZoneFee({ campus_id, vendor_zone_id, student_zone_id, fee }) {
  await requireAdmin();
  const supabase = createAdminClient();

  if (vendor_zone_id === student_zone_id) {
    return { error: 'Vendor zone and student zone must be different.' };
  }

  const { error } = await supabase
    .from('delivery_zone_fees')
    .upsert(
      {
        campus_id,
        vendor_zone_id,
        student_zone_id,
        fee: Number(fee),
      },
      { onConflict: 'vendor_zone_id,student_zone_id' }
    );

  if (error) return { error: error.message };
  revalidatePath(ZONES_PATH);
  return { success: true };
}

export async function deleteZoneFee(id) {
  await requireAdmin();
  const supabase = createAdminClient();

  const { error } = await supabase.from('delivery_zone_fees').delete().eq('id', id);
  if (error) return { error: error.message };
  revalidatePath(ZONES_PATH);
  return { success: true };
}