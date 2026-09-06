'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/utils/supabase/client';
import { useCampusStore } from '@/store/useCampusStore';
import { getCampusFullName } from '@/constants/universities';
import { isValidPhoneNumber } from 'libphonenumber-js';
import {
  Bike, User, Phone, FileText, ArrowRight, CheckCircle2
} from 'lucide-react';

const inputClass = "w-full h-11 px-4 text-sm rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all";

const VEHICLE_TYPES = [
  'Bicycle',
  'Motorcycle',
  'Tricycle (Keke)',
];

function looksFake(nationalDigits) {
  if (/^(\d)\1+$/.test(nationalDigits)) return true;
  const ascending = '01234567890123456789';
  const descending = '09876543210987654321';
  if (ascending.includes(nationalDigits) || descending.includes(nationalDigits)) return true;
  return false;
}

function validateNigerianPhone(raw) {
  if (!raw) return { valid: false, message: 'Phone number is required.' };

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
  const nationalPart = digitsOnly.slice(-10);

  if (looksFake(nationalPart)) {
    return { valid: false, message: "That number doesn't look right — please double check it." };
  }

  return { valid: true, formatted };
}

export default function RiderOnboarding() {
  const router = useRouter();
  const supabase = createClient();
  const campus = useCampusStore((state) => state.campus);
  const campusLabel = getCampusFullName(campus);

  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [serverError, setServerError] = useState('');
  const [phoneError, setPhoneError] = useState('');
  const [done, setDone] = useState(false);

  const [form, setForm] = useState({
    full_name: '',
    phone: '',
    has_vehicle: null,
    vehicle_type: '',
    license_plate: '',
  });

  useEffect(() => { checkSession(); }, []);

  const checkSession = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { router.push('/auth/rider'); return; }

    const { data: profile } = await supabase
      .from('rider_profiles')
      .select('user_id, onboarding_completed')
      .eq('user_id', user.id)
      .maybeSingle();

    if (profile?.onboarding_completed) {
      router.push('/jobs');
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
    if (form.has_vehicle === null) {
      setServerError('Please select whether you have a vehicle.');
      return;
    }
    if (form.has_vehicle && !form.vehicle_type) {
      setServerError('Please select your vehicle type.');
      return;
    }

    const phoneCheck = validateNigerianPhone(form.phone);
    if (!phoneCheck.valid) {
      setPhoneError(phoneCheck.message);
      return;
    }

    setIsLoading(true);

    try {
      let resolvedCampusId = null;
      if (campus) {
        const { data: campusRow, error: campusLookupError } = await supabase
          .from('campuses')
          .select('id')
          .eq('slug', campus)
          .maybeSingle();

        if (campusLookupError) {
          throw new Error('Could not verify your campus. Please try again.');
        }
        if (!campusRow) {
          throw new Error('We could not match your campus. Please contact support.');
        }
        resolvedCampusId = campusRow.id;
      } else {
        throw new Error('Your campus is missing — please go back and select it before continuing.');
      }

      const { error: upsertError } = await supabase
        .from('rider_profiles')
        .upsert({
          user_id: user.id,
          full_name: form.full_name,
          phone: phoneCheck.formatted,
          has_vehicle: form.has_vehicle,
          vehicle_type: form.has_vehicle ? form.vehicle_type : null,
          license_plate: form.has_vehicle ? (form.license_plate || null) : null,
          license_number: null,
          campus: campus || 'unspecified',
          campus_id: resolvedCampusId,
          phone_verified: true, // format-checked only, not OTP-confirmed — for now
          onboarding_completed: true,
          approved: false,
        });

      if (upsertError) throw upsertError;

      await supabase
        .from('profiles')
        .update({ full_name: form.full_name, onboarding_completed: true })
        .eq('id', user.id);

      await supabase
        .from('user_roles')
        .update({ status: 'pending' })
        .eq('user_id', user.id)
        .eq('role', 'rider');

      setDone(true);
      setTimeout(() => router.push('/jobs'), 2000);
    } catch (err) {
      setServerError(err.message || 'Something went wrong. Please try again.');
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
            Application submitted!
          </h2>
          <p className="text-xs text-slate-400 leading-relaxed max-w-xs mx-auto">
            Your rider profile is under review. We'll notify you once you're approved to start taking deliveries.
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className="h-screen w-full flex flex-col md:flex-row overflow-hidden bg-white dark:bg-slate-950 text-slate-950 dark:text-white antialiased">

      <section className="hidden md:flex flex-[0.9] p-16 flex-col justify-between text-white bg-gradient-to-br from-slate-900 via-blue-950 to-indigo-950 relative">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_bottom_left,rgba(59,130,246,0.15),transparent_45%)]" />
        <div className="relative z-10 text-xl font-black tracking-tighter">
          Instrict<span className="text-blue-400">Fleet.</span>
        </div>
        <div className="relative z-10 space-y-8">
          <div className="space-y-3">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 border border-white/10">
              <Bike className="w-3.5 h-3.5 text-blue-300" />
              <span className="text-[9px] font-black tracking-widest uppercase text-white/90">
                Rider Registration
              </span>
            </div>
            <h1 className="text-2xl lg:text-3xl font-black leading-[1.15] tracking-tight">
              Join the <br />Instrict Fleet
            </h1>
            <p className="text-white/70 text-xs leading-relaxed">
              Earn money delivering orders across {campusLabel}.
            </p>
          </div>
        </div>
        <div className="relative z-10 text-[10px] text-white/30">
          &copy; Instrict Logistics
        </div>
      </section>

      <section className="flex-1 flex justify-center p-6 sm:p-10 md:p-12 bg-white dark:bg-slate-950 overflow-y-auto">
        <div className="w-full max-w-sm space-y-6 my-auto">

          <div className="flex items-center justify-between md:hidden border-b border-slate-100 dark:border-slate-900 pb-4">
            <span className="text-xs font-black tracking-tighter uppercase">Instrict Fleet</span>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
            <div>
              <h2 className="text-lg font-black tracking-tight">Rider Details</h2>
              <p className="text-xs text-slate-400 mt-0.5">Tell us about yourself</p>
            </div>

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
                  placeholder="e.g. Samuel Okon"
                  className={`${inputClass} pl-11`}
                />
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

            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                Do you have a vehicle? <span className="text-blue-500">*</span>
              </label>
              <div className="flex gap-2 p-1 bg-slate-100 dark:bg-slate-800 rounded-xl">
                <button
                  type="button"
                  onClick={() => set('has_vehicle', true)}
                  className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-lg text-[11px] font-black transition-all ${
                    form.has_vehicle === true
                      ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-sm'
                      : 'text-slate-400 hover:text-slate-600'
                  }`}
                >
                  <Bike className="w-3.5 h-3.5" /> Yes, I have one
                </button>
                <button
                  type="button"
                  onClick={() => {
                    set('has_vehicle', false);
                    set('vehicle_type', '');
                    set('license_plate', '');
                  }}
                  className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-lg text-[11px] font-black transition-all ${
                    form.has_vehicle === false
                      ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-sm'
                      : 'text-slate-400 hover:text-slate-600'
                  }`}
                >
                  🚶 On foot
                </button>
              </div>
            </div>

            {form.has_vehicle === true && (
              <div className="space-y-4 animate-in fade-in slide-in-from-top-1 duration-200">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                    Vehicle Type <span className="text-blue-500">*</span>
                  </label>
                  <div className="relative">
                    <Bike className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <select
                      value={form.vehicle_type}
                      onChange={e => set('vehicle_type', e.target.value)}
                      className={`${inputClass} pl-11 appearance-none`}
                    >
                      <option value="">Select vehicle type</option>
                      {VEHICLE_TYPES.map(v => (
                        <option key={v} value={v}>{v}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                    License Plate
                    <span className="normal-case font-medium text-slate-400"> (optional)</span>
                  </label>
                  <div className="relative">
                    <FileText className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input
                      type="text"
                      value={form.license_plate}
                      onChange={e => set('license_plate', e.target.value)}
                      placeholder="e.g. ABC-123-XY"
                      className={`${inputClass} pl-11`}
                    />
                  </div>
                </div>
              </div>
            )}

            {form.has_vehicle === false && (
              <div className="animate-in fade-in slide-in-from-top-1 duration-200 bg-blue-500/5 border border-blue-500/10 rounded-xl px-4 py-3">
                <p className="text-[11px] text-blue-500 font-medium leading-relaxed">
                  No vehicle? No problem — you'll handle on-campus deliveries on foot. You'll typically be assigned shorter routes within a single building or block.
                </p>
              </div>
            )}

            {serverError && (
              <div className="flex items-start gap-2 bg-rose-500/5 border border-rose-500/20 rounded-xl px-4 py-3">
                <span className="text-rose-500 text-lg leading-none mt-0.5">⚠</span>
                <p className="text-[11px] font-bold text-rose-500">{serverError}</p>
              </div>
            )}

            <button
              type="submit"
              disabled={isLoading || form.has_vehicle === null}
              className="w-full h-11 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-bold text-sm tracking-tight transition-all flex items-center justify-center gap-2 shadow-lg shadow-blue-600/10"
            >
              {isLoading
                ? 'Submitting...'
                : <><span>Submit Application</span><ArrowRight className="w-4 h-4" /></>
              }
            </button>
          </form>
        </div>
      </section>
    </main>
  );
}