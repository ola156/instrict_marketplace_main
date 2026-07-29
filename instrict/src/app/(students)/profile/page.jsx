'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/utils/supabase/client';
import { useRouter } from 'next/navigation';
import ImageUpload from '@/app/(vendor)/dashboard/components/shared/ImageUpload';
import { User, Hash, MapPin, Phone, Save, CheckCircle2, LogOut, ShoppingBag, MessageSquare, Building2 } from 'lucide-react';
import ThemeToggle from '@/components/ThemeToggle';

const inputClass = "w-full h-10 px-3 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 transition-all";

export default function ProfilePage() {
  const supabase = createClient();
  const router = useRouter();
  const [profile, setProfile] = useState(null);

  // All campuses, for the switcher dropdown
  const [campuses, setCampuses] = useState([]);
  const [campusesLoading, setCampusesLoading] = useState(true);

  // Zones scoped to whichever campus_id is currently selected in the form
  const [zones, setZones] = useState([]);
  const [zonesLoading, setZonesLoading] = useState(true);

  const [form, setForm] = useState({
    full_name: '', matric_number: '', phone: '',
    campus_id: '', delivery_address: '', zone_id: '',
    avatar_url: '',
  });
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [saveError, setSaveError] = useState('');
  const [stats, setStats] = useState({ orders: 0, posts: 0 });
  const set = (k, v) => setForm(p => ({ ...p, [k]: v }));

  useEffect(() => { fetchProfile(); }, []);

  // Whenever the selected campus changes (initial load or user switching it),
  // reload the zones for that campus.
  useEffect(() => {
    if (!form.campus_id) { setZones([]); setZonesLoading(false); return; }
    (async () => {
      setZonesLoading(true);
      const { data: zoneList, error } = await supabase
        .from('delivery_zones')
        .select('id, name, zone_type')
        .eq('campus_id', form.campus_id)
        .eq('is_active', true)
        .order('name', { ascending: true });

      if (!error) setZones(zoneList || []);
      setZonesLoading(false);
    })();
  }, [form.campus_id]);

  const fetchProfile = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { router.push('/auth/student'); return; }

    const [{ data }, { data: campusList }] = await Promise.all([
      supabase.from('student_profiles').select('*').eq('user_id', user.id).single(),
      supabase.from('campuses').select('id, name, slug').order('name', { ascending: true }),
    ]);

    setCampuses(campusList || []);
    setCampusesLoading(false);

    if (data) {
      setProfile(data);
      setForm({
        full_name: data.full_name || '',
        matric_number: data.matric_number || '',
        phone: data.phone || '',
        campus_id: data.campus_id || '',
        delivery_address: data.delivery_address || '',
        zone_id: data.zone_id || '',
        avatar_url: data.avatar_url || '',
      });
    }

    const [{ count: orderCount }, { count: postCount }] = await Promise.all([
      supabase.from('orders').select('*', { count:'exact', head:true }).eq('student_id', data?.id),
      supabase.from('community_posts').select('*', { count:'exact', head:true }).eq('author_id', user.id),
    ]);
    setStats({ orders: orderCount || 0, posts: postCount || 0 });
  };

  // Switching campus clears the zone, since the old zone belongs to the
  // old campus and won't be valid for the new one.
  const handleCampusChange = (newCampusId) => {
    setForm(p => ({ ...p, campus_id: newCampusId, zone_id: '' }));
  };

  const handleSave = async () => {
    setSaving(true);
    setSaveError('');
    const { data: { user } } = await supabase.auth.getUser();

    const selectedCampus = campuses.find((c) => c.id === form.campus_id);
    const selectedZone = zones.find((z) => z.id === form.zone_id);

    const { error } = await supabase
      .from('student_profiles')
      .update({
        full_name: form.full_name,
        matric_number: form.matric_number || null,
        phone: form.phone,
        campus_id: form.campus_id || null,
        campus: selectedCampus?.slug || null,
        delivery_address: form.delivery_address || null,
        zone_id: form.zone_id || null,
        hostel: selectedZone?.name || null,
        avatar_url: form.avatar_url || null,
      })
      .eq('user_id', user.id);

    setSaving(false);

    if (error) {
      setSaveError(error.message || 'Failed to save changes. Please try again.');
      return;
    }

    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/auth/student');
  };

  const firstName = form.full_name?.split(' ')[0] || 'Student';

  return (
    <div className="w-full space-y-5 px-4 max-w-lg">
      <div>
        <h1 className="text-base font-black tracking-tight text-slate-900 dark:text-white">Profile</h1>
        <p className="text-[11px] text-slate-400 mt-0.5">Manage your account details</p>
      </div>

      <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl p-5">
        <div className="flex items-center gap-4 mb-5">
          <div className="relative shrink-0">
            {form.avatar_url
              ? <img src={form.avatar_url} alt={firstName} className="w-16 h-16 rounded-2xl object-cover" />
              : <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center">
                  <span className="text-white text-2xl font-black">{firstName[0]}</span>
                </div>
            }
            {profile?.phone_verified && (
              <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-emerald-500 rounded-full border-2 border-white dark:border-slate-900 flex items-center justify-center">
                <CheckCircle2 className="w-3 h-3 text-white" />
              </div>
            )}
          </div>
          <div>
            <p className="text-sm font-black text-slate-900 dark:text-white">{form.full_name || 'Your Name'}</p>
            <p className="text-[11px] text-slate-400 mt-0.5">Campus student</p>
            <div className="flex items-center gap-3 mt-2">
              <span className="flex items-center gap-1 text-[10px] font-bold text-slate-500">
                <ShoppingBag className="w-3 h-3" /> {stats.orders} orders
              </span>
              <span className="flex items-center gap-1 text-[10px] font-bold text-slate-500">
                <MessageSquare className="w-3 h-3" /> {stats.posts} posts
              </span>
            </div>
          </div>
        </div>

        <ImageUpload
          value={form.avatar_url}
          onChange={url => set('avatar_url', url)}
          label="Profile photo"
          optional={true}
        />
      </div>

      <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl p-5 space-y-3">
        <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">Personal details</p>

        <div className="space-y-1.5">
          <label className="text-[10px] font-black uppercase tracking-wider text-slate-400">Full Name</label>
          <div className="relative">
            <User className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
            <input value={form.full_name} onChange={e => set('full_name', e.target.value)} placeholder="Your full name" className={`${inputClass} pl-9`} />
          </div>
        </div>

        <div className="space-y-1.5">
          <label className="text-[10px] font-black uppercase tracking-wider text-slate-400">Matric Number</label>
          <div className="relative">
            <Hash className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
            <input value={form.matric_number} onChange={e => set('matric_number', e.target.value)} placeholder="e.g. 200404001" className={`${inputClass} pl-9`} />
          </div>
        </div>

        <div className="space-y-1.5">
          <label className="text-[10px] font-black uppercase tracking-wider text-slate-400">Phone Number</label>
          <div className="relative">
            <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
            <input value={form.phone} onChange={e => set('phone', e.target.value)} placeholder="+2348012345678" className={`${inputClass} pl-9`} />
          </div>
        </div>
      </div>

      {/* Campus, Delivery address, and Zone — all editable */}
      <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl p-5 space-y-3">
        <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">Campus &amp; Delivery</p>

        <div className="space-y-1.5">
          <label className="text-[10px] font-black uppercase tracking-wider text-slate-400">Campus</label>
          <div className="relative">
            <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
            <select
              value={form.campus_id}
              onChange={e => handleCampusChange(e.target.value)}
              disabled={campusesLoading}
              className={`${inputClass} pl-9 appearance-none disabled:opacity-50`}
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
        </div>

        <div className="space-y-1.5">
          <label className="text-[10px] font-black uppercase tracking-wider text-slate-400">Delivery Address</label>
          <div className="relative">
            <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
            <input
              value={form.delivery_address}
              onChange={e => set('delivery_address', e.target.value)}
              placeholder="e.g. Room 14, Block C, Alexander Hall"
              className={`${inputClass} pl-9`}
            />
          </div>
        </div>

        <div className="space-y-1.5">
          <label className="text-[10px] font-black uppercase tracking-wider text-slate-400">Closest Zone</label>
          <div className="relative">
            <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
            <select
              value={form.zone_id}
              onChange={e => set('zone_id', e.target.value)}
              disabled={zonesLoading || !form.campus_id}
              className={`${inputClass} pl-9 appearance-none disabled:opacity-50`}
            >
              <option value="">
                {!form.campus_id
                  ? 'Select a campus first'
                  : zonesLoading ? 'Loading zones...' : 'Select the zone closest to you'}
              </option>
              {zones.map((z) => (
                <option key={z.id} value={z.id}>{z.name}</option>
              ))}
            </select>
          </div>
        </div>
<div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl p-5 flex items-center justify-between">
  <div>
    <p className="text-xs font-black text-slate-900 dark:text-white">Appearance</p>
    <p className="text-[11px] text-slate-400 mt-0.5">Light or dark mode</p>
  </div>
  <ThemeToggle />
</div>
        {saveError && (
          <div className="flex items-start gap-2 bg-rose-500/5 border border-rose-500/20 rounded-xl px-3 py-2.5">
            <span className="text-rose-500 text-sm leading-none mt-0.5">⚠</span>
            <p className="text-[11px] font-bold text-rose-500">{saveError}</p>
          </div>
        )}

        <button
          onClick={handleSave}
          disabled={saving}
          className={`w-full h-10 rounded-xl text-xs font-black tracking-tight transition-all flex items-center justify-center gap-2 mt-2 ${
            saved
              ? 'bg-emerald-600 text-white'
              : 'bg-blue-600 hover:bg-blue-700 text-white disabled:opacity-50'
          }`}
        >
          {saving
            ? <><div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />Saving...</>
            : saved
            ? <><CheckCircle2 className="w-3.5 h-3.5" />Saved</>
            : <><Save className="w-3.5 h-3.5" />Save changes</>
          }
        </button>
      </div>

      <button
        onClick={handleLogout}
        className="w-full h-10 rounded-xl border border-rose-200 dark:border-rose-800 text-rose-500 text-xs font-black flex items-center justify-center gap-2 hover:bg-rose-50 dark:hover:bg-rose-500/10 transition-all"
      >
        <LogOut className="w-3.5 h-3.5" /> Log out
      </button>
    </div>
  );
}