'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/utils/supabase/client';
import { useCampusStore } from '@/store/useCampusStore';
import { getCampusFullName } from '@/constants/universities';
import {
  Bike, User, Phone, FileText,
  ArrowRight, ArrowLeft, CheckCircle2, MessageSquare
} from 'lucide-react';

const inputClass = "w-full h-11 px-4 text-sm rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all";

const VEHICLE_TYPES = [
  'Bicycle',
  'Motorcycle',
  'Tricycle (Keke)',
];

// TODO(remove-before-launch): dev-only bypass for OTP during testing.
// Delete handleSkipVerification and the button that calls it once
// SendChamp OTP is fully wired and tested end to end.
const SKIP_VERIFICATION_ENABLED = true;

export default function RiderOnboarding() {
  const router = useRouter();
  const supabase = createClient();
  const campus = useCampusStore((state) => state.campus);
  const campusLabel = getCampusFullName(campus);

  const [currentStep, setCurrentStep] = useState(1);
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [serverError, setServerError] = useState('');
  const [done, setDone] = useState(false);

  const [form, setForm] = useState({
    full_name: '',
    phone: '',
    has_vehicle: null, // null = not selected yet, true/false after selection
    vehicle_type: '',
    license_plate: '',
  });

  // OTP
  const [otpSent, setOtpSent] = useState(false);
  const [otpDigits, setOtpDigits] = useState(['', '', '', '', '', '']);
  const otpRefs = useRef([]);

  // Holds the SendChamp verification_reference between send and confirm steps
  const verificationReferenceRef = useRef(null);

  useEffect(() => { checkSession(); }, []);

  const checkSession = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { router.push('/auth/rider'); return; }

    const { data: profile } = await supabase
      .from('rider_profiles')
      .select('user_id, phone_verified')
      .eq('user_id', user.id)
      .maybeSingle();

    if (profile?.phone_verified) {
      router.push('/jobs');
      return;
    }

    if (profile && !profile.phone_verified) {
      setCurrentStep(2);
    }

    setForm(prev => ({
      ...prev,
      full_name: user.user_metadata?.full_name || '',
    }));
    setUser(user);
  };

  const set = (key, value) => setForm(p => ({ ...p, [key]: value }));

  const handleStepOneSubmit = async (e) => {
    e.preventDefault();
    setServerError('');

    if (!form.full_name || !form.phone) {
      setServerError('Full name and phone number are required.');
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

    setIsLoading(true);

    try {
      // campus (from useCampusStore) is the campus's slug — resolve it to
      // the actual campuses.id so rider_profiles.campus_id is populated.
      // Without this, campus_id stays null forever and the rider never
      // matches any vendor's campus_id in the job pool query.
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
          phone: form.phone,
          has_vehicle: form.has_vehicle,
          vehicle_type: form.has_vehicle ? form.vehicle_type : null,
          license_plate: form.has_vehicle ? (form.license_plate || null) : null,
          license_number: null, // old column, keep null
          campus: campus || 'unspecified',
          campus_id: resolvedCampusId,
          phone_verified: false,
          approved: false,
        });

      if (upsertError) throw upsertError;

      await supabase
        .from('profiles')
        .update({ full_name: form.full_name })
        .eq('id', user.id);

      setCurrentStep(2);
    } catch (err) {
      setServerError(err.message || 'Something went wrong. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  // ── Send OTP via SendChamp (server-side route holds the API key) ──
  const triggerOtp = async () => {
    if (!form.phone) return;
    setServerError('');
    setIsLoading(true);

    try {
      const formattedPhone = form.phone.startsWith('+')
        ? form.phone : `+${form.phone}`;

      const rateLimitCheck = await fetch('/api/otp/check', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: formattedPhone }),
      });
      const rateLimitData = await rateLimitCheck.json();
      if (!rateLimitCheck.ok) {
        setServerError(rateLimitData.error || 'Too many attempts. Please try again later.');
        setIsLoading(false);
        return;
      }

      const sendRes = await fetch('/api/otp/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: formattedPhone }),
      });
      const sendData = await sendRes.json();

      if (!sendRes.ok) {
        setServerError(
          sendData.error === 'insufficient_balance'
            ? 'SMS verification is temporarily unavailable. You can skip this step for now (dev) or try again shortly.'
            : sendData.error || 'Failed to send code. Please try again.'
        );
        setIsLoading(false);
        return;
      }

      verificationReferenceRef.current = sendData.reference;
      setOtpSent(true);
    } catch (err) {
      console.error('SendChamp OTP send error:', err);
      setServerError('Failed to send code. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleOtpChange = (value, index) => {
    if (isNaN(Number(value))) return;
    const newDigits = [...otpDigits];
    newDigits[index] = value;
    setOtpDigits(newDigits);
    if (value !== '' && index < 5) otpRefs.current[index + 1]?.focus();
  };

  const handleOtpKeyDown = (e, index) => {
    if (e.key === 'Backspace' && otpDigits[index] === '' && index > 0) {
      otpRefs.current[index - 1]?.focus();
    }
  };

  // Shared finalization — same DB writes whether the rider actually
  // verified via SendChamp or used the dev skip button. `approved`
  // is never touched here; it stays whatever it already is (default false).
  const finalizeOnboarding = async () => {
    await supabase
      .from('rider_profiles')
      .update({ phone_verified: true, onboarding_completed: true })
      .eq('user_id', user.id);

    await supabase
      .from('user_roles')
      .update({ status: 'pending' })
      .eq('user_id', user.id)
      .eq('role', 'rider');

    await supabase
      .from('profiles')
      .update({ onboarding_completed: true })
      .eq('id', user.id);

    setDone(true);
    setTimeout(() => router.push('/jobs'), 2000);
  };

  // ── Confirm OTP via SendChamp, then finalize ──
  const handleFinalVerification = async (e) => {
    e.preventDefault();
    setServerError('');
    const code = otpDigits.join('');
    if (code.length < 6) return;
    setIsLoading(true);

    try {
      if (!verificationReferenceRef.current) {
        setServerError('Session expired. Please request a new code.');
        setIsLoading(false);
        return;
      }

      const verifyRes = await fetch('/api/otp/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          reference: verificationReferenceRef.current,
          code,
        }),
      });
      const verifyData = await verifyRes.json();

      if (!verifyRes.ok || !verifyData.success) {
        setServerError(verifyData.error || 'Incorrect code. Please check and try again.');
        setIsLoading(false);
        return;
      }

      await finalizeOnboarding();
    } catch (err) {
      console.error('OTP verify error:', err);
      setServerError('Verification failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  // DEV ONLY — bypasses SendChamp entirely, runs the same finalization
  // writes as a real verification would. Remove this along with the
  // SKIP_VERIFICATION_ENABLED flag before launch.
  const handleSkipVerification = async () => {
    setServerError('');
    setIsLoading(true);
    try {
      await finalizeOnboarding();
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

      {/* Sidebar */}
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

          <div className="space-y-6 relative border-l border-white/10 ml-2 pl-6">
            <div className={`relative ${currentStep === 1 ? 'text-white' : 'text-white/40'}`}>
              <div className={`absolute -left-[31px] top-0.5 w-3 h-3 rounded-full border-2 ${currentStep === 1 ? 'bg-blue-500 border-blue-500 scale-110 shadow-lg shadow-blue-500/50' : 'bg-slate-950 border-white/20'}`} />
              <h4 className="text-xs font-black uppercase tracking-wider">Step 1: Rider Details</h4>
              <p className="text-[11px] opacity-80 mt-0.5">Your name, vehicle, and contact info.</p>
            </div>
            <div className={`relative ${currentStep === 2 ? 'text-white' : 'text-white/40'}`}>
              <div className={`absolute -left-[31px] top-0.5 w-3 h-3 rounded-full border-2 ${currentStep === 2 ? 'bg-blue-500 border-blue-500 scale-110 shadow-lg shadow-blue-500/50' : 'bg-slate-950 border-white/20'}`} />
              <h4 className="text-xs font-black uppercase tracking-wider">Step 2: Phone Verification</h4>
              <p className="text-[11px] opacity-80 mt-0.5">Verify your number via SMS.</p>
            </div>
          </div>
        </div>
        <div className="relative z-10 text-[10px] text-white/30">
          &copy; Instrict Logistics
        </div>
      </section>

      {/* Form panel */}
      <section className="flex-1 flex justify-center p-6 sm:p-10 md:p-12 bg-white dark:bg-slate-950 overflow-y-auto">
        <div className="w-full max-w-sm space-y-6 my-auto">

          <div className="flex items-center justify-between md:hidden border-b border-slate-100 dark:border-slate-900 pb-4">
            <span className="text-xs font-black tracking-tighter uppercase">Instrict Fleet</span>
            <span className="text-[10px] font-black px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-900 text-slate-400">
              STEP {currentStep} OF 2
            </span>
          </div>

          {/* ── STEP 1 ── */}
          {currentStep === 1 && (
            <form onSubmit={handleStepOneSubmit} className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
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
                <p className="text-[10px] text-slate-400">Include country code — you'll verify this via SMS</p>
              </div>

              {/* Vehicle toggle */}
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

              {/* Vehicle fields — only show if has_vehicle is true */}
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

              {/* On foot notice */}
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
                  ? 'Saving...'
                  : <><span>Continue to Verification</span><ArrowRight className="w-4 h-4" /></>
                }
              </button>
            </form>
          )}

          {/* ── STEP 2: OTP ── */}
          {currentStep === 2 && (
            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">

              <div className="flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => { setCurrentStep(1); setOtpSent(false); setServerError(''); }}
                  className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 transition-colors"
                >
                  <ArrowLeft className="w-3.5 h-3.5" /> Back
                </button>

                {/* DEV ONLY — remove this button and SKIP_VERIFICATION_ENABLED
                    once real OTP delivery is confirmed working end to end. */}
                {SKIP_VERIFICATION_ENABLED && (
                  <button
                    type="button"
                    onClick={handleSkipVerification}
                    disabled={isLoading}
                    className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-600 dark:text-amber-400 hover:text-amber-700 dark:hover:text-amber-300 border border-dashed border-amber-400/40 rounded-lg px-2.5 py-1 transition-colors disabled:opacity-50"
                  >
                    Skip for now (dev)
                  </button>
                )}
              </div>

              <div>
                <h2 className="text-lg font-black tracking-tight">Verify your number</h2>
                <p className="text-xs text-slate-400 mt-0.5">
                  We'll send a 6-digit code to <span className="font-bold text-slate-700 dark:text-slate-300">{form.phone}</span>
                </p>
              </div>

              {serverError && (
                <div className="flex items-start gap-2 bg-rose-500/5 border border-rose-500/20 rounded-xl px-4 py-3">
                  <span className="text-rose-500 text-lg leading-none mt-0.5">⚠</span>
                  <p className="text-[11px] font-bold text-rose-500">{serverError}</p>
                </div>
              )}

              {!otpSent ? (
                <div className="space-y-4 border border-slate-100 dark:border-slate-900 p-5 rounded-xl bg-slate-50/50 dark:bg-slate-900/30">
                  <div className="flex gap-4 items-start">
                    <div className="w-10 h-10 bg-blue-500/10 text-blue-500 rounded-lg flex items-center justify-center shrink-0">
                      <MessageSquare className="w-5 h-5" />
                    </div>
                    <div className="space-y-1">
                      <h4 className="text-xs font-black tracking-tight">SMS Verification</h4>
                      <p className="text-[11px] text-slate-400 leading-normal">
                        A 6-digit code will be sent to your phone number.
                      </p>
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                      Confirm Phone Number
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
                    <p className="text-[10px] text-slate-400">Include country code e.g. +234 for Nigeria</p>
                  </div>

                  <button
                    type="button"
                    onClick={triggerOtp}
                    disabled={isLoading || !form.phone}
                    className="w-full h-11 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-bold text-sm tracking-tight transition-all flex items-center justify-center gap-2"
                  >
                    {isLoading ? 'Sending code...' : 'Send Verification Code'}
                  </button>
                </div>
              ) : (
                <form onSubmit={handleFinalVerification} className="space-y-5">
                  <div className="bg-blue-500/5 border border-blue-500/10 rounded-xl px-4 py-3 text-center">
                    <p className="text-[11px] font-medium text-blue-500">
                      Code sent to <span className="font-black">{form.phone}</span>. Enter it below.
                    </p>
                  </div>

                  <div className="flex justify-between gap-2 max-w-xs mx-auto">
                    {otpDigits.map((digit, index) => (
                      <input
                        key={index}
                        type="text"
                        maxLength={1}
                        value={digit}
                        ref={el => (otpRefs.current[index] = el)}
                        onChange={e => handleOtpChange(e.target.value, index)}
                        onKeyDown={e => handleOtpKeyDown(e, index)}
                        className="w-12 h-12 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-center text-lg font-black text-blue-500 outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    ))}
                  </div>

                  <button
                    type="submit"
                    disabled={isLoading || otpDigits.some(d => d === '')}
                    className="w-full h-11 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-bold text-sm tracking-tight transition-all flex items-center justify-center gap-2 shadow-lg shadow-blue-600/10"
                  >
                    {isLoading ? 'Verifying...' : 'Verify & Submit Application'}
                  </button>

                  <div className="text-center">
                    <button
                      type="button"
                      onClick={() => {
                        setOtpSent(false);
                        setOtpDigits(['', '', '', '', '', '']);
                        setServerError('');
                      }}
                      className="text-[11px] text-slate-400 hover:text-blue-500 font-bold transition-colors"
                    >
                      Didn't get code? Resend
                    </button>
                  </div>
                </form>
              )}
            </div>
          )}
        </div>
      </section>
    </main>
  );
}