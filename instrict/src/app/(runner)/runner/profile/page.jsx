'use client';

// Editable: full_name, phone, vehicle_type, license_number, license_plate,
// has_vehicle. Deliberately read-only: approved, phone_verified,
// onboarding_completed, campus/campus_id, current_zone_id — these are
// either verification state (shouldn't be self-editable) or set by
// onboarding/admin flows elsewhere, not this page.

import { useState, useEffect } from 'react';
import { createClient } from '@/utils/supabase/client';
import { useRunner } from '../../context/RunnerProvider';
import { User, Phone, Bike, ShieldCheck, ShieldAlert, BadgeCheck, Loader2, Save } from 'lucide-react';
import ThemeToggle from '@/components/ThemeToggle';

const cardClass = "rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4";
const inputClass = "w-full h-11 px-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 outline-none text-xs font-bold focus:ring-2 focus:ring-blue-500";
const labelClass = "text-[10px] font-black uppercase tracking-wider text-slate-400 mb-1 block";

const VEHICLE_TYPES = ['bicycle', 'motorcycle', 'car', 'on foot'];

export default function RunnerProfile() {
  const supabase = createClient();
  const { runner } = useRunner();

  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [saved, setSaved] = useState(false);

  const [form, setForm] = useState({
    full_name: '',
    phone: '',
    vehicle_type: '',
    has_vehicle: false,
    license_number: '',
    license_plate: '',
  });

  useEffect(() => {
    if (!runner) return;
    (async () => {
      setLoading(true);
      const { data, error: fetchError } = await supabase
        .from('rider_profiles')
        .select('user_id, full_name, phone, vehicle_type, has_vehicle, license_number, license_plate, approved, phone_verified, onboarding_completed, campus, is_active')
        .eq('user_id', runner.user_id)
        .maybeSingle();

      if (fetchError) setError('Could not load your profile.');
      if (data) {
        setProfile(data);
        setForm({
          full_name: data.full_name || '',
          phone: data.phone || '',
          vehicle_type: data.vehicle_type || '',
          has_vehicle: !!data.has_vehicle,
          license_number: data.license_number || '',
          license_plate: data.license_plate || '',
        });
      }
      setLoading(false);
    })();
  }, [runner, supabase]);

  const updateField = (key, value) => {
    setForm(prev => ({ ...prev, [key]: value }));
    setSaved(false);
  };

  const saveProfile = async () => {
    setSaving(true);
    setError('');
    setSaved(false);

    const { error: updateError } = await supabase
      .from('rider_profiles')
      .update({
        full_name: form.full_name.trim(),
        phone: form.phone.trim(),
        vehicle_type: form.vehicle_type,
        has_vehicle: form.has_vehicle,
        license_number: form.license_number.trim(),
        license_plate: form.license_plate.trim(),
      })
      .eq('user_id', runner.user_id);

    setSaving(false);

    if (updateError) {
      setError('Could not save your changes. Try again.');
      return;
    }
    setSaved(true);
  };

  if (loading) {
    return (
      <main className="h-screen w-full flex items-center justify-center bg-slate-50 dark:bg-slate-950">
        <Loader2 className="w-6 h-6 text-blue-500 animate-spin" />
      </main>
    );
  }

  return (
    <main className="min-h-screen w-full bg-slate-50 dark:bg-slate-950 pb-10">
     <div className="sticky top-0 z-10 bg-white dark:bg-slate-950 border-b border-slate-100 dark:border-slate-900 px-5 py-4 flex items-center justify-between">
  <div>
    <h1 className="text-sm font-black tracking-tight">Profile</h1>
    <p className="text-[11px] text-slate-400">Your rider details</p>
  </div>
  <ThemeToggle />
</div>
      <div className="px-5 py-4 max-w-lg md:max-w-2xl mx-auto space-y-4">
        {error && (
          <div className="rounded-2xl border border-rose-500/20 bg-rose-500/5 px-4 py-3">
            <p className="text-[11px] font-bold text-rose-500">{error}</p>
          </div>
        )}
        {saved && (
          <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/5 px-4 py-3">
            <p className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400">Profile updated.</p>
          </div>
        )}

        {/* Status badges — read-only, verification state */}
        <div className="grid grid-cols-3 gap-2">
          <div className={`${cardClass} flex flex-col items-center text-center gap-1 py-3`}>
            {profile?.approved
              ? <ShieldCheck className="w-4 h-4 text-emerald-500" />
              : <ShieldAlert className="w-4 h-4 text-amber-500" />}
            <p className="text-[9px] font-black uppercase tracking-wider text-slate-400">Approval</p>
            <p className={`text-[10px] font-bold ${profile?.approved ? 'text-emerald-600 dark:text-emerald-400' : 'text-amber-600 dark:text-amber-400'}`}>
              {profile?.approved ? 'Approved' : 'Pending'}
            </p>
          </div>
          <div className={`${cardClass} flex flex-col items-center text-center gap-1 py-3`}>
            <BadgeCheck className={`w-4 h-4 ${profile?.phone_verified ? 'text-emerald-500' : 'text-slate-300'}`} />
            <p className="text-[9px] font-black uppercase tracking-wider text-slate-400">Phone</p>
            <p className={`text-[10px] font-bold ${profile?.phone_verified ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-400'}`}>
              {profile?.phone_verified ? 'Verified' : 'Unverified'}
            </p>
          </div>
          <div className={`${cardClass} flex flex-col items-center text-center gap-1 py-3`}>
            <User className={`w-4 h-4 ${profile?.is_active ? 'text-emerald-500' : 'text-slate-300'}`} />
            <p className="text-[9px] font-black uppercase tracking-wider text-slate-400">Status</p>
            <p className={`text-[10px] font-bold ${profile?.is_active ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-400'}`}>
              {profile?.is_active ? 'Online' : 'Offline'}
            </p>
          </div>
        </div>

        {/* Contact info */}
        <div className={cardClass}>
          <div className="flex items-center gap-2 mb-4">
            <User className="w-4 h-4 text-blue-500" />
            <h3 className="text-xs font-black tracking-tight">Contact info</h3>
          </div>
          <div className="space-y-3">
            <div>
              <label className={labelClass}>Full name</label>
              <input
                type="text"
                value={form.full_name}
                onChange={(e) => updateField('full_name', e.target.value)}
                className={inputClass}
                placeholder="Your full name"
              />
            </div>
            <div>
              <label className={labelClass}>Phone number</label>
              <div className="relative">
                <Phone className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="tel"
                  value={form.phone}
                  onChange={(e) => updateField('phone', e.target.value)}
                  className={`${inputClass} pl-8`}
                  placeholder="+234..."
                />
              </div>
              {profile && !profile.phone_verified && (
                <p className="text-[10px] text-amber-600 dark:text-amber-400 mt-1">
                  Changing this number will require re-verification.
                </p>
              )}
            </div>
            <div>
              <label className={labelClass}>Campus</label>
              <input type="text" value={profile?.campus || '—'} disabled className={`${inputClass} opacity-60 cursor-not-allowed`} />
            </div>
          </div>
        </div>

        {/* Vehicle info */}
        <div className={cardClass}>
          <div className="flex items-center gap-2 mb-4">
            <Bike className="w-4 h-4 text-purple-500" />
            <h3 className="text-xs font-black tracking-tight">Vehicle</h3>
          </div>
          <div className="space-y-3">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={form.has_vehicle}
                onChange={(e) => updateField('has_vehicle', e.target.checked)}
                className="w-4 h-4 rounded accent-blue-600"
              />
              <span className="text-xs font-bold">I have a vehicle</span>
            </label>

            {form.has_vehicle && (
              <>
                <div>
                  <label className={labelClass}>Vehicle type</label>
                  <select
                    value={form.vehicle_type}
                    onChange={(e) => updateField('vehicle_type', e.target.value)}
                    className={inputClass}
                  >
                    <option value="">Select type</option>
                    {VEHICLE_TYPES.map(v => (
                      <option key={v} value={v}>{v.charAt(0).toUpperCase() + v.slice(1)}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className={labelClass}>License number</label>
                  <input
                    type="text"
                    value={form.license_number}
                    onChange={(e) => updateField('license_number', e.target.value)}
                    className={inputClass}
                  />
                </div>
                <div>
                  <label className={labelClass}>License plate</label>
                  <input
                    type="text"
                    value={form.license_plate}
                    onChange={(e) => updateField('license_plate', e.target.value)}
                    className={inputClass}
                  />
                </div>
              </>
            )}
          </div>
        </div>

        <button
          onClick={saveProfile}
          disabled={saving}
          className="w-full h-12 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-black text-xs tracking-tight transition-all flex items-center justify-center gap-2"
        >
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          {saving ? 'Saving...' : 'Save changes'}
        </button>
      </div>
    </main>
  );
}