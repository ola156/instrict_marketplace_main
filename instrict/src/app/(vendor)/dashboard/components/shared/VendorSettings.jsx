'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/utils/supabase/client';
import ImageUpload, { ImagePlaceholder } from './ImageUpload';
import { Store, Phone, Clock, MapPin, Save, CheckCircle2, Building2, Moon } from 'lucide-react';
import ThemeToggle from '@/components/ThemeToggle';

function Section({ title, description, children }) {
  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl overflow-hidden">
      <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-800">
        <h3 className="text-xs font-black uppercase tracking-widest text-slate-900 dark:text-white">{title}</h3>
        {description && <p className="text-[11px] text-slate-400 mt-0.5">{description}</p>}
      </div>
      <div className="p-5 space-y-4">{children}</div>
    </div>
  );
}

function Field({ label, children }) {
  return (
    <div className="space-y-1.5">
      <label className="text-[10px] font-black uppercase tracking-wider text-slate-400">{label}</label>
      {children}
    </div>
  );
}

const inputClass = "w-full h-10 px-3 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 transition-all";

export default function VendorSettings({ vendor, onUpdate }) {
  const supabase = createClient();
  const [form, setForm] = useState({
    legal_name: '',
    support_phone: '',
    store_address: '',
    landmark: '',
    opening_time: '08:00',
    closing_time: '20:00',
    fulfillment_method: 'both',
    description: '',
    avatar_url: '',
    banner_url: '',
    campus_id: '',
    current_zone_id: '',
  });
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');

  // All campuses, for the switcher dropdown
  const [campuses, setCampuses] = useState([]);
  const [campusesLoading, setCampusesLoading] = useState(true);

  // Zones scoped to whichever campus_id is currently selected in the form
  const [zones, setZones] = useState([]);
  const [zonesLoading, setZonesLoading] = useState(true);

  useEffect(() => {
    if (vendor) {
      setForm({
        legal_name: vendor.legal_name || '',
        support_phone: vendor.support_phone || '',
        store_address: vendor.store_address || '',
        landmark: vendor.landmark || '',
        opening_time: vendor.opening_time?.slice(0, 5) || '08:00',
        closing_time: vendor.closing_time?.slice(0, 5) || '20:00',
        fulfillment_method: vendor.fulfillment_method || 'both',
        description: vendor.description || '',
        avatar_url: vendor.avatar_url || '',
        banner_url: vendor.banner_url || '',
        campus_id: vendor.campus_id || '',
        current_zone_id: vendor.current_zone_id || '',
      });
    }
  }, [vendor]);

  // Load all campuses once, for the switcher
  useEffect(() => {
    (async () => {
      setCampusesLoading(true);
      const { data, error } = await supabase
        .from('campuses')
        .select('id, name, slug')
        .order('name', { ascending: true });
      if (!error) setCampuses(data || []);
      setCampusesLoading(false);
    })();
  }, []);

  // Whenever the selected campus changes (initial load or user switching it),
  // reload the zones for that campus.
  useEffect(() => {
    if (!form.campus_id) { setZones([]); setZonesLoading(false); return; }
    (async () => {
      setZonesLoading(true);
      const { data, error } = await supabase
        .from('delivery_zones')
        .select('id, name, zone_type')
        .eq('campus_id', form.campus_id)
        .eq('is_active', true)
        .order('name', { ascending: true });
      if (!error) setZones(data || []);
      setZonesLoading(false);
    })();
  }, [form.campus_id]);

  const set = (key, value) => setForm(p => ({ ...p, [key]: value }));

  // Switching campus clears the zone, since the old zone belongs to the
  // old campus and won't be valid for the new one.
  const handleCampusChange = (newCampusId) => {
    setForm(p => ({ ...p, campus_id: newCampusId, current_zone_id: '' }));
  };

  const handleSave = async () => {
    if (!form.legal_name) { setError('Store name is required.'); return; }
    if (!form.campus_id) { setError('Please select your campus.'); return; }
    setError('');
    setSaving(true);

    const selectedZone = zones.find((z) => z.id === form.current_zone_id);

    const { error: updateError } = await supabase
      .from('vendor_profiles')
      .update({
        legal_name: form.legal_name,
        support_phone: form.support_phone,
        store_address: form.store_address,
        landmark: form.current_zone_id ? (selectedZone?.name || form.landmark) : form.landmark,
        opening_time: form.opening_time,
        closing_time: form.closing_time,
        fulfillment_method: form.fulfillment_method,
        description: form.description,
        avatar_url: form.avatar_url || null,
        banner_url: form.banner_url || null,
        campus_id: form.campus_id,
        current_zone_id: form.current_zone_id || null,
      })
      .eq('user_id', vendor.user_id);

    setSaving(false);
    if (updateError) { setError(updateError.message); return; }
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
    if (onUpdate) onUpdate({ ...vendor, ...form });
  };

  return (
    <div className="space-y-5">

      {/* Page title */}
      <div>
        <h2 className="text-sm font-black tracking-tight text-slate-900 dark:text-white">Settings</h2>
        <p className="text-[11px] text-slate-400 mt-0.5">Manage your store profile and operating details</p>
      </div>

      {/* Full-width two-column grid on large screens */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">

        {/* LEFT COLUMN */}
        <div className="space-y-5">

          {/* Store Visuals */}
          <Section title="Store Visuals" description="Profile photo and banner shown on your public page">
            <div className="relative rounded-2xl overflow-hidden h-36 bg-slate-100 dark:bg-slate-800">
              {form.banner_url ? (
                <img src={form.banner_url} alt="Banner" className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full bg-gradient-to-br from-blue-600 to-blue-800 flex items-center justify-center">
                  <p className="text-white/30 text-xs font-bold">No banner uploaded</p>
                </div>
              )}
              <div className="absolute bottom-3 left-4 flex items-end gap-3">
                <div className="w-12 h-12 rounded-xl border-2 border-white dark:border-slate-900 overflow-hidden bg-slate-200 shadow-lg shrink-0">
                  {form.avatar_url ? (
                    <img src={form.avatar_url} alt="Avatar" className="w-full h-full object-cover" />
                  ) : (
                    <ImagePlaceholder name={form.legal_name} size="md" />
                  )}
                </div>
                <div className="mb-0.5">
                  <p className="text-white text-xs font-black drop-shadow truncate max-w-[140px]">{form.legal_name || 'Your Store'}</p>
                  <p className="text-white/70 text-[10px] capitalize drop-shadow">{vendor?.category}</p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <ImageUpload
  value={form.avatar_url}
  onChange={url => set('avatar_url', url)}
  label="Profile Photo"
  optional={true}
  aspect={2.5}
/>
             <ImageUpload
  value={form.banner_url}
  onChange={url => set('banner_url', url)}
  label="Banner Image"
  optional={true}
  aspect={2.5}
/>
            </div>
          </Section>

          {/* Store Info */}
          <Section title="Store Information" description="Basic details about your business">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Field label="Store / Business Name *">
                <div className="relative">
                  <Store className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                  <input value={form.legal_name} onChange={e => set('legal_name', e.target.value)} placeholder="e.g. Subomi Foods" className={`${inputClass} pl-9`} />
                </div>
              </Field>
              <Field label="Support Phone">
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                  <input value={form.support_phone} onChange={e => set('support_phone', e.target.value)} placeholder="+234 812 345 6789" className={`${inputClass} pl-9`} />
                </div>
              </Field>
            </div>
            <Field label="Short Description / Bio">
              <textarea
                value={form.description}
                onChange={e => set('description', e.target.value)}
                rows={3}
                placeholder="Tell students what you offer..."
                className="w-full px-3 py-2.5 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 transition-all resize-none"
              />
            </Field>
          </Section>
        </div>

        {/* RIGHT COLUMN */}
        <div className="space-y-5">

          {/* Location */}
          <Section title="Location" description="Where students can find or expect delivery from">
            <Field label="Campus *">
              <div className="relative">
                <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                <select
                  value={form.campus_id}
                  onChange={e => handleCampusChange(e.target.value)}
                  disabled={campusesLoading}
                  className={`${inputClass} pl-9 disabled:opacity-50`}
                >
                  <option value="">
                    {campusesLoading ? 'Loading campuses...' : 'Select your campus'}
                  </option>
                  {campuses.map((c) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>
              <p className="text-[10px] text-slate-400">
                Changing your campus will reset your selected zone below.
              </p>
            </Field>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Field label="Shop Address">
                <div className="relative">
                  <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                  <input value={form.store_address} onChange={e => set('store_address', e.target.value)} placeholder="Shop 4, SUB Complex" className={`${inputClass} pl-9`} />
                </div>
              </Field>

              {/* Current zone doubles as the closest-landmark reference,
                  same pattern as onboarding — landmark auto-fills from it
                  on save, but stays editable here for a manual override. */}
              <Field label="Current Zone">
                <div className="relative">
                  <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                  <select
                    value={form.current_zone_id}
                    onChange={e => set('current_zone_id', e.target.value)}
                    disabled={zonesLoading || !form.campus_id}
                    className={`${inputClass} pl-9 disabled:opacity-50`}
                  >
                    <option value="">
                      {!form.campus_id
                        ? 'Select a campus first'
                        : zonesLoading ? 'Loading zones...' : 'Select zone'}
                    </option>
                    {zones.map((z) => (
                      <option key={z.id} value={z.id}>{z.name}</option>
                    ))}
                  </select>
                </div>
              </Field>
            </div>

            <Field label="Closest Landmark (optional override)">
              <div className="relative">
                <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                <input value={form.landmark} onChange={e => set('landmark', e.target.value)} placeholder="Opposite Mellanby Hall" className={`${inputClass} pl-9`} />
              </div>
            </Field>
          </Section>

          {/* Hours & Fulfillment */}
          <Section title="Hours & Fulfillment" description="When you're open and how you serve students">
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              <Field label="Opening Time">
                <div className="relative">
                  <Clock className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                  <input type="time" value={form.opening_time} onChange={e => set('opening_time', e.target.value)} className={`${inputClass} pl-9`} />
                </div>
              </Field>
              <Field label="Closing Time">
                <div className="relative">
                  <Clock className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                  <input type="time" value={form.closing_time} onChange={e => set('closing_time', e.target.value)} className={`${inputClass} pl-9`} />
                </div>
              </Field>
              <Field label="Fulfillment">
                <select value={form.fulfillment_method} onChange={e => set('fulfillment_method', e.target.value)} className={inputClass}>
                  <option value="pickup">Pickup Only</option>
                  <option value="delivery">Delivery Only</option>
                  <option value="both">Pickup & Delivery</option>
                </select>
              </Field>
            </div>
          </Section>

          {/* Verification status card */}
          <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl p-5 space-y-3">
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Account Status</p>
            <div className="flex items-center gap-3">
              <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${vendor?.phone_verified ? 'bg-emerald-500/10 text-emerald-500' : 'bg-amber-500/10 text-amber-500'}`}>
                <CheckCircle2 className="w-4 h-4" />
              </div>
              <div>
                <p className="text-xs font-black text-slate-900 dark:text-white">
                  Phone {vendor?.phone_verified ? 'Verified' : 'Not Verified'}
                </p>
                <p className="text-[11px] text-slate-400">{vendor?.support_phone || 'No phone on file'}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${vendor?.is_open ? 'bg-emerald-500/10 text-emerald-500' : 'bg-slate-100 dark:bg-slate-800 text-slate-400'}`}>
                <Store className="w-4 h-4" />
              </div>
              <div>
                <p className="text-xs font-black text-slate-900 dark:text-white">
                  Store is {vendor?.is_open ? 'Open' : 'Closed'}
                </p>
                <p className="text-[11px] text-slate-400">Toggle from the top bar</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
  <div className="w-8 h-8 rounded-xl flex items-center justify-center bg-slate-100 dark:bg-slate-800 text-slate-400">
    <Moon className="w-4 h-4" />
  </div>
  <div className="flex-1">
    <p className="text-xs font-black text-slate-900 dark:text-white">Appearance</p>
    <p className="text-[11px] text-slate-400">Light or dark mode</p>
  </div>
  <ThemeToggle />
</div>
          </div>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="flex items-start gap-2 bg-rose-500/5 border border-rose-500/20 rounded-xl px-4 py-3">
          <span className="text-rose-500 text-lg leading-none mt-0.5">⚠</span>
          <p className="text-[11px] font-bold text-rose-500">{error}</p>
        </div>
      )}

      {/* Save button */}
      <button
        onClick={handleSave}
        disabled={saving}
        className={`w-full h-11 rounded-xl font-black text-sm tracking-tight transition-all flex items-center justify-center gap-2 shadow-sm ${
          saved
            ? 'bg-emerald-600 text-white shadow-emerald-600/20'
            : 'bg-blue-600 hover:bg-blue-700 text-white shadow-blue-600/20 disabled:opacity-50'
        }`}
      >
        {saving ? (
          <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />Saving...</>
        ) : saved ? (
          <><CheckCircle2 className="w-4 h-4" />Saved successfully</>
        ) : (
          <><Save className="w-4 h-4" />Save changes</>
        )}
      </button>
    </div>
  );
}