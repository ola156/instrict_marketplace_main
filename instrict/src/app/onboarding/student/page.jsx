'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/utils/supabase/client';
import { useCampusStore } from '@/store/useCampusStore';
import { getCampusFullName } from '@/constants/universities';
import {
  User, Hash, Phone, MapPin,
  ArrowRight, ArrowLeft, CheckCircle2, MessageSquare
} from 'lucide-react';

const inputClass = "w-full h-11 px-4 text-sm rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all";

export default function UserOnboarding() {
  const router = useRouter();
  const supabase = createClient();
  const storeCampus = useCampusStore((state) => state.campus);

  const [currentStep, setCurrentStep] = useState(1);
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [serverError, setServerError] = useState('');
  const [done, setDone] = useState(false);

  const [phoneConfirmed, setPhoneConfirmed] = useState(false);
  const [saveError, setSaveError] = useState('');

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

  const [otpSent, setOtpSent] = useState(false);
  const [otpDigits, setOtpDigits] = useState(['', '', '', '', '', '']);
  const otpRefs = useRef([]);

  // Holds the SendChamp verification_reference between send and confirm steps
  const verificationReferenceRef = useRef(null);

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
      .select('user_id, phone_verified, onboarding_completed')
      .eq('user_id', user.id)
      .maybeSingle();

    // Onboarding is considered "passed" once onboarding_completed is true,
    // regardless of whether phone_verified is true (they may have skipped it).
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

  const set = (key, value) => setForm(p => ({ ...p, [key]: value }));

  const handleStepOneSubmit = (e) => {
    e.preventDefault();
    setServerError('');

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
    if (!form.phone) {
      setServerError('Phone number is required for verification.');
      return;
    }

    setCurrentStep(2);
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
            ? 'SMS verification is temporarily unavailable. You can skip this step for now and verify later.'
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

  // Shared save logic — phoneVerified is passed in so the same function
  // handles both "verified via OTP" and "skipped" paths.
  const saveOnboardingData = async (phoneVerified) => {
    setSaveError('');
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
          phone: form.phone,
          campus: storeCampus || 'unspecified',
          campus_id: campusId,
          phone_verified: phoneVerified,
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
      setSaveError(err.message || 'Saving your details failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  // ── Confirm OTP via SendChamp, then save onboarding data ──
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

      setPhoneConfirmed(true);
      await saveOnboardingData(true);
    } catch (err) {
      console.error('OTP verify error:', err);
      setServerError('Verification failed. Please try again.');
      setIsLoading(false);
    }
  };

  // ── SKIP: complete onboarding without phone verification. Can come
  //     back and verify later — this only affects phone_verified, not
  //     onboarding_completed. ──
  const handleSkipVerification = async () => {
    setServerError('');
    await saveOnboardingData(false);
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

          <div className="space-y-6 relative border-l border-white/10 ml-2 pl-6">
            <div className={`relative ${currentStep === 1 ? 'text-white' : 'text-white/40'}`}>
              <div className={`absolute -left-[31px] top-0.5 w-3 h-3 rounded-full border-2 ${currentStep === 1 ? 'bg-blue-500 border-blue-500 scale-110 shadow-lg shadow-blue-500/50' : 'bg-slate-950 border-white/20'}`} />
              <h4 className="text-xs font-black uppercase tracking-wider">Step 1: Your Profile</h4>
              <p className="text-[11px] opacity-80 mt-0.5">Name, address, and zone.</p>
            </div>
            <div className={`relative ${currentStep === 2 ? 'text-white' : 'text-white/40'}`}>
              <div className={`absolute -left-[31px] top-0.5 w-3 h-3 rounded-full border-2 ${currentStep === 2 ? 'bg-blue-500 border-blue-500 scale-110 shadow-lg shadow-blue-500/50' : 'bg-slate-950 border-white/20'}`} />
              <h4 className="text-xs font-black uppercase tracking-wider">Step 2: Phone Verification</h4>
              <p className="text-[11px] opacity-80 mt-0.5">Verify your number via SMS, or skip for now.</p>
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
            <span className="text-[10px] font-black px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-900 text-slate-400">
              STEP {currentStep} OF 2
            </span>
          </div>

          {currentStep === 1 && (
            <form onSubmit={handleStepOneSubmit} className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
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
                <p className="text-[10px] text-slate-400">Include country code — you'll verify this via SMS</p>
              </div>

              {serverError && (
                <div className="flex items-start gap-2 bg-rose-500/5 border border-rose-500/20 rounded-xl px-4 py-3">
                  <span className="text-rose-500 text-lg leading-none mt-0.5">⚠</span>
                  <p className="text-[11px] font-bold text-rose-500">{serverError}</p>
                </div>
              )}

              <button
                type="submit"
                disabled={campusLoading}
                className="w-full h-11 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-bold text-sm tracking-tight transition-all flex items-center justify-center gap-2 shadow-lg shadow-blue-600/10"
              >
                <span>Continue to Verification</span><ArrowRight className="w-4 h-4" />
              </button>
            </form>
          )}

          {currentStep === 2 && (
            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">

              {!phoneConfirmed && (
                <button
                  type="button"
                  onClick={() => { setCurrentStep(1); setOtpSent(false); setServerError(''); }}
                  className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 transition-colors"
                >
                  <ArrowLeft className="w-3.5 h-3.5" /> Back
                </button>
              )}

              <div>
                <h2 className="text-lg font-black tracking-tight">
                  {phoneConfirmed ? 'Saving your profile' : 'Verify your number'}
                </h2>
                <p className="text-xs text-slate-400 mt-0.5">
                  {phoneConfirmed
                    ? 'Your number is verified — finishing setup now.'
                    : <>We'll send a 6-digit code to <span className="font-bold text-slate-700 dark:text-slate-300">{form.phone}</span></>
                  }
                </p>
              </div>

              {serverError && (
                <div className="flex items-start gap-2 bg-rose-500/5 border border-rose-500/20 rounded-xl px-4 py-3">
                  <span className="text-rose-500 text-lg leading-none mt-0.5">⚠</span>
                  <p className="text-[11px] font-bold text-rose-500">{serverError}</p>
                </div>
              )}

              {phoneConfirmed && saveError && (
                <div className="space-y-3">
                  <div className="flex items-start gap-2 bg-rose-500/5 border border-rose-500/20 rounded-xl px-4 py-3">
                    <span className="text-rose-500 text-lg leading-none mt-0.5">⚠</span>
                    <p className="text-[11px] font-bold text-rose-500">{saveError}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => saveOnboardingData(true)}
                    disabled={isLoading}
                    className="w-full h-11 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-bold text-sm tracking-tight transition-all flex items-center justify-center gap-2"
                  >
                    {isLoading ? 'Retrying...' : 'Retry Saving Profile'}
                  </button>
                </div>
              )}

              {!phoneConfirmed && !otpSent && (
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

                  <button
                    type="button"
                    onClick={handleSkipVerification}
                    disabled={isLoading}
                    className="w-full text-center text-[11px] text-slate-400 hover:text-blue-500 font-bold transition-colors py-1"
                  >
                    {isLoading ? 'Skipping...' : "Skip for now — I'll verify later"}
                  </button>
                </div>
              )}

              {!phoneConfirmed && otpSent && (
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
                    {isLoading ? 'Verifying...' : 'Verify & Enter Campus'}
                  </button>

                  <div className="flex items-center justify-between">
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

                    <button
                      type="button"
                      onClick={handleSkipVerification}
                      disabled={isLoading}
                      className="text-[11px] text-slate-400 hover:text-blue-500 font-bold transition-colors"
                    >
                      Skip for now
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