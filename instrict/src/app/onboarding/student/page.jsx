'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/utils/supabase/client';
import { useCampusStore } from '@/store/useCampusStore';
import { getCampusFullName } from '@/constants/universities';
import { isValidPhoneNumber } from 'libphonenumber-js';
import {
  User, Hash, Phone, MapPin, ArrowRight, CheckCircle2
} from 'lucide-react';

const inputClass = "w-full h-11 px-4 text-sm rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all";

// Reject obviously fake-looking numbers even if they pass format validation
function looksFake(nationalDigits) {
  // all same digit, e.g. 08111111111 -> local digits 8111111111
  if (/^(\d)\1+$/.test(nationalDigits)) return true;
  // simple ascending/descending run, e.g. 01234567890 / 09876543210
  const ascending = '01234567890123456789';
  const descending = '09876543210987654321';
  if (ascending.includes(nationalDigits) || descending.includes(nationalDigits)) return true;
  return false;
}

function validateNigerianPhone(raw) {
  if (!raw) return { valid: false, message: 'Phone number is required for verification.' };

  const formatted = raw.startsWith('+') ? raw : `+${raw}`;

  let isValidFormat = false;
  try {
    isValidFormat = isValidPhoneNumber(formatted, 'NG');
  } catch {
    isValidFormat = false;
  }

  if (!isValidFormat) {
    return { valid: false, message: 'Enter a valid Nigerian phone number, e.g. +2348012345678.' };
  }

  const digitsOnly = formatted.replace(/\D/g, '');
  const nationalPart = digitsOnly.slice(-10); // last 10 digits = national number without country code

  if (looksFake(nationalPart)) {
    return { valid: false, message: "That number doesn't look right — please double check it." };
  }

  return { valid: true, formatted };
}

export default function UserOnboarding() {
  const router = useRouter();
  const supabase = createClient();
  const storeCampus = useCampusStore((state) => state.campus);

  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [serverError, setServerError] = useState('');
  const [phoneError, setPhoneError] = useState('');
  const [done, setDone] = useState(false);

  const [campusId, setCampusId] = useState(null);
  const [campusName, setCampusName] = useState('');
  const [campusLoading, setCampusLoading] = useState(true);
  const [campusError, setCampusError] = useState('');
  const [zones, setZones] = useState([]);
  const [zonesLoading, setZonesLoading] = useState(true);

  const [form, setForm] = useState({
    full_name: '',
    matric_number: '',
    delivery_address: '',
    zone_id: '',
    phone: '',
  });

  useEffect(() => { checkSession(); }, []);

  useEffect(() => {
    (async () => {
      setCampusLoading(true);
      setZonesLoading(true);

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setCampusError('Session expired. Please log in again.');
        setCampusLoading(false);
        setZonesLoading(false);
        return;
      }

      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('campus')
        .eq('id', user.id)
        .single();

      if (profileError || !profile?.campus) {
        setCampusError('Could not find your campus. Please contact support.');
        setCampusLoading(false);
        setZonesLoading(false);
        return;
      }

      const { data: campus, error: campusLookupError } = await supabase
        .from('campuses')
        .select('id, name')
        .eq('slug', profile.campus)
        .maybeSingle();

      if (campusLookupError || !campus) {
        setCampusError(`Couldn't match "${profile.campus}" to a known campus.`);
        setCampusLoading(false);
        setZonesLoading(false);
        return;
      }

      setCampusId(campus.id);
      setCampusName(campus.name);
      setCampusLoading(false);

      const { data: zoneList, error: zonesError } = await supabase
        .from('delivery_zones')
        .select('id, name, zone_type')
        .eq('campus_id', campus.id)
        .eq('is_active', true)
        .order('name', { ascending: true });

      if (!zonesError) setZones(zoneList || []);
      setZonesLoading(false);
    })();
  }, []);

  const checkSession = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { router.push('/auth/student'); return; }

    const { data: profile } = await supabase
      .from('student_profiles')
      .select('user_id, onboarding_completed')
      .eq('user_id', user.id)
      .maybeSingle();

    if (profile?.onboarding_completed) {
      router.push('/home');
      return;
    }

    setForm(prev => ({
      ...prev,
      full_name: user.user_metadata?.full_name || '',
    }));
    setUser(user);
  };

  const set = (key, value) => {
    setForm(p => ({ ...p, [key]: value }));
    if (key === 'phone') setPhoneError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setServerError('');
    setPhoneError('');

    if (!form.full_name) {
      setServerError('Full name is required.');
      return;
    }
    if (!campusId) {
      setServerError('Your campus could not be determined. Please contact support.');
      return;
    }
    if (!form.delivery_address) {
      setServerError('Please enter your delivery address.');
      return;
    }
    if (!form.zone_id) {
      setServerError('Please select the zone closest to you.');
      return;
    }

    const phoneCheck = validateNigerianPhone(form.phone);
    if (!phoneCheck.valid) {
      setPhoneError(phoneCheck.message);
      return;
    }

    setIsLoading(true);

    try {
      const selectedZone = zones.find((z) => z.id === form.zone_id);

      const { error: upsertError } = await supabase
        .from('student_profiles')
        .upsert({
          user_id: user.id,
          full_name: form.full_name,
          matric_number: form.matric_number || null,
          hostel: selectedZone?.name || null,
          zone_id: form.zone_id,
          delivery_address: form.delivery_address,
          phone: phoneCheck.formatted,
          campus: storeCampus || 'unspecified',
          campus_id: campusId,
          phone_verified: true, // format-checked only, not OTP-confirmed — for now
          onboarding_completed: true,
        });

      if (upsertError) throw upsertError;

      const { error: profileUpdateError } = await supabase
        .from('profiles')
        .update({
          full_name: form.full_name,
          onboarding_completed: true,
        })
        .eq('id', user.id);

      if (profileUpdateError) throw profileUpdateError;

      await supabase
        .from('user_roles')
        .update({ status: 'active' })
        .eq('user_id', user.id)
        .eq('role', 'user');

      setDone(true);
      setTimeout(() => router.push('/home'), 1500);
    } catch (err) {
      console.error('Onboarding save error:', err);
      setServerError(err.message || 'Saving your details failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  if (done) {
    return (
      <main className="h-screen w-full flex items-center justify-center bg-slate-50 dark:bg-slate-950 px-6">
        <div className="w-full max-w-sm text-center space-y-4">
          <div className="w-16 h-16 bg-blue-500/10 text-blue-600 dark:text-blue-400 rounded-full flex items-center justify-center mx-auto animate-bounce">
            <CheckCircle2 className="w-8 h-8" />
          </div>
          <h2 className="text-xl font-black tracking-tight text-slate-900 dark:text-white">
            You're all set!
          </h2>
          <p className="text-xs text-slate-400 leading-relaxed">
            Welcome to Instrict. Taking you to your dashboard...
          </p>
        </div>
      </main>
    );
  }

  const campusLabel = campusName || getCampusFullName(storeCampus);

  return (
    <main className="h-screen w-full flex flex-col md:flex-row overflow-hidden bg-white dark:bg-slate-950 text-slate-950 dark:text-white antialiased">

      <section className="hidden md:flex flex-[0.9] p-16 flex-col justify-between text-white bg-gradient-to-br from-blue-600 via-indigo-700 to-slate-950 relative">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_bottom_left,rgba(59,130,246,0.3),transparent_45%)]" />
        <div className="relative z-10 text-xl font-black tracking-tighter">
          Instrict<span className="text-indigo-400">.</span>
        </div>
        <div className="relative z-10 space-y-8">
          <div className="space-y-3 max-w-sm">
            <h1 className="text-3xl lg:text-4xl font-black leading-[1.1] tracking-tight">
              Set up your <br />
              <span className="text-indigo-300">student profile</span>
            </h1>
            <p className="text-white/80 text-xs sm:text-sm leading-relaxed">
              Just a few details and you'll be ready to order food, shop from vendors, and request campus services.
            </p>
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/10 border border-white/10">
              <span className="text-[10px] font-black tracking-widest uppercase text-white/80">
                {campusLabel}
              </span>
            </div>
          </div>
        </div>
        <div className="relative z-10 text-[11px] text-white/40">
          &copy; Instrict Ecosystem
        </div>
      </section>

      <section className="flex-1 flex justify-center items-center p-6 sm:p-10 md:p-12 overflow-y-auto bg-white dark:bg-slate-950">
        <div className="w-full max-w-sm space-y-6 my-auto">

          <div className="flex items-center justify-between md:hidden border-b border-slate-100 dark:border-slate-900 pb-4">
            <span className="text-xs font-black tracking-tighter uppercase">Instrict</span>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
            <div>
              <h2 className="text-lg font-black tracking-tight">Your Profile</h2>
              <p className="text-xs text-slate-400 mt-0.5">Tell us a bit about yourself</p>
            </div>

            {campusError && (
              <div className="flex items-start gap-2 bg-rose-500/5 border border-rose-500/20 rounded-xl px-4 py-3">
                <span className="text-rose-500 text-lg leading-none mt-0.5">⚠</span>
                <p className="text-[11px] font-bold text-rose-500 leading-relaxed">{campusError}</p>
              </div>
            )}

            <div className="space-y-1.5">
              <label className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                Full Name <span className="text-blue-500">*</span>
              </label>
              <div className="relative">
                <User className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  value={form.full_name}
                  onChange={e => set('full_name', e.target.value)}
                  required
                  placeholder="e.g. Tunde Adesina"
                  className={`${inputClass} pl-11`}
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                Matric Number
                <span className="normal-case font-medium text-slate-400"> (optional)</span>
              </label>
              <div className="relative">
                <Hash className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  value={form.matric_number}
                  onChange={e => set('matric_number', e.target.value)}
                  placeholder="e.g. 200404001"
                  className={`${inputClass} pl-11`}
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                Delivery Address <span className="text-blue-500">*</span>
              </label>
              <p className="text-[11px] text-slate-400">
                Where should riders deliver your orders?
              </p>
              <div className="relative">
                <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  value={form.delivery_address}
                  onChange={e => set('delivery_address', e.target.value)}
                  placeholder="e.g. Room 14, Block C, Alexander Hall"
                  className={`${inputClass} pl-11`}
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                Closest Zone <span className="text-blue-500">*</span>
              </label>
              <div className="relative">
                <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <select
                  value={form.zone_id}
                  onChange={e => set('zone_id', e.target.value)}
                  disabled={zonesLoading || !campusId}
                  className={`${inputClass} pl-11 appearance-none disabled:opacity-50`}
                >
                  <option value="">
                    {zonesLoading ? 'Loading zones...' : 'Select the zone closest to you'}
                  </option>
                  {zones.map((z) => (
                    <option key={z.id} value={z.id}>{z.name}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                Phone Number <span className="text-blue-500">*</span>
              </label>
              <div className="relative">
                <Phone className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="tel"
                  value={form.phone}
                  onChange={e => set('phone', e.target.value)}
                  placeholder="+2348012345678"
                  className={`${inputClass} pl-11`}
                />
              </div>
              {phoneError ? (
                <p className="text-[10px] text-rose-500 font-bold">{phoneError}</p>
              ) : (
                <p className="text-[10px] text-slate-400">Include country code, e.g. +234 for Nigeria</p>
              )}
            </div>

            {serverError && (
              <div className="flex items-start gap-2 bg-rose-500/5 border border-rose-500/20 rounded-xl px-4 py-3">
                <span className="text-rose-500 text-lg leading-none mt-0.5">⚠</span>
                <p className="text-[11px] font-bold text-rose-500">{serverError}</p>
              </div>
            )}

            <button
              type="submit"
              disabled={campusLoading || isLoading}
              className="w-full h-11 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-bold text-sm tracking-tight transition-all flex items-center justify-center gap-2 shadow-lg shadow-blue-600/10"
            >
              <span>{isLoading ? 'Saving...' : 'Complete Setup'}</span>
              {!isLoading && <ArrowRight className="w-4 h-4" />}
            </button>
          </form>
        </div>
      </section>
    </main>
  );
}