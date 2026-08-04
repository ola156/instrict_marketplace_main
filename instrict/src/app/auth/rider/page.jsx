'use client';

import React, { useState } from 'react';
import { useCampusStore } from '@/store/useCampusStore';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { ArrowLeft, Mail, Lock, User, ArrowRight, KeyRound, Bike } from 'lucide-react';
import { getCampusFullName } from '@/constants/universities';
import { createClient } from '@/utils/supabase/client';
import { useRouter } from 'next/navigation';
import { resolveUserDestination } from '@/utils/auth/resolveDestination';

const riderAuthSchema = z.object({
  mode: z.enum(['login', 'signup', 'forgot']),
  fullName: z.string().optional(),
  email: z.string().email({ message: "Please enter a valid email address" }),
  password: z.string().optional(),
}).superRefine((data, ctx) => {
  if (data.mode === 'signup') {
    if (!data.fullName || data.fullName.trim().length < 3) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Full name must be at least 3 characters",
        path: ["fullName"],
      });
    }
    if (!data.password || data.password.length < 6) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Password must be at least 6 characters",
        path: ["password"],
      });
    }
  }
  if (data.mode === 'login') {
    if (!data.password || data.password.length < 1) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Password is required",
        path: ["password"],
      });
    }
  }
});

export default function RiderAuth() {
  const campus = useCampusStore((state) => state.campus);
  const router = useRouter();
  const supabase = createClient();

  const [authMode, setAuthMode] = useState('login');
  const [isVerifying, setIsVerifying] = useState(false);
  const [serverError, setServerError] = useState('');

  const currentCampusLabel = getCampusFullName(campus);


    const handleBack = () => {
    router.back();
  };

  const { register, handleSubmit, setValue, clearErrors, formState: { errors, isSubmitting } } = useForm({
    resolver: zodResolver(riderAuthSchema),
    defaultValues: {
      mode: 'login',
      email: '',
      fullName: '',
      password: ''
    }
  });

  const handleModeSwitch = (newMode) => {
    clearErrors();
    setServerError('');
    setValue('mode', newMode);
    setAuthMode(newMode);
  };

  const handleAuthSubmit = async (data) => {
    setServerError('');

    if (authMode === 'signup') {
      const { data: existingRoleCheck } = await supabase
        .rpc('check_existing_role', {
          check_email: data.email,
          check_role: 'rider',
        });

      if (existingRoleCheck === true) {
        setServerError('An account with this email already exists as a rider. Please log in instead.');
        return;
      }

      const { error: signUpError } = await supabase.auth.signUp({
        email: data.email,
        password: data.password,
        options: {
          data: {
            full_name: data.fullName,
            campus: campus,
            pending_role: 'rider',
          },
          emailRedirectTo: `${window.location.origin}/auth/callback`,
        },
      });

      if (signUpError) {
        if (signUpError.message.toLowerCase().includes('already registered')) {
          setServerError('An account with this email already exists. Try logging in, or use "Become a Rider" from your existing account.');
        } else {
          setServerError(signUpError.message);
        }
        return;
      }

      setIsVerifying(true);
      return;
    }

    if (authMode === 'login') {
      const { data: loginData, error: loginError } = await supabase.auth.signInWithPassword({
        email: data.email,
        password: data.password,
      });

      if (loginError) {
        setServerError(loginError.message);
        return;
      }

      const destination = await resolveUserDestination(supabase, loginData.user.id);
      router.push(destination);
      return;
    }

    if (authMode === 'forgot') {
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(
        data.email,
        { redirectTo: `${window.location.origin}/auth/reset-password` }
      );

      if (resetError) {
        setServerError(resetError.message);
        return;
      }

      alert(`Courier access link broadcasted to: ${data.email}`);
      handleModeSwitch('login');
    }
  };

  const handleGoogleOAuth = async () => {
    setServerError('');

    document.cookie = `pending_role=rider; path=/; max-age=600; SameSite=Lax`;
    document.cookie = `pending_campus=${encodeURIComponent(campus || '')}; path=/; max-age=600; SameSite=Lax`;

    const { error: oauthError } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    });

    if (oauthError) {
      setServerError(oauthError.message);
    }
  };

  return (
    <main className="h-screen w-full flex flex-col md:flex-row overflow-hidden bg-white dark:bg-slate-950 text-slate-950 dark:text-white transition-colors duration-500 antialiased">
      
      {/* BRANDING GRAPHIC COLUMN: RECONFIGURED TO BLUE GRADIENT MATRIX */}
      <section className="hidden md:flex flex-[0.9] p-16 flex-col justify-between text-white bg-gradient-to-br from-slate-900 via-blue-950 to-indigo-950 transition-all duration-500 relative">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_bottom_left,rgba(59,130,246,0.15),transparent_45%)]" />
        
        <div className="relative z-10 text-xl font-black tracking-tighter">
          Instrict<span className="text-blue-400">MarketPlace.</span>
        </div>

        <div className="relative z-10 space-y-5 max-w-sm">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 backdrop-blur-md border border-white/10">
            <Bike className="w-3.5 h-3.5 text-blue-300" />
            <span className="text-[9px] font-black tracking-widest uppercase text-white/90">
              LOGISTICS FORCE NODE
            </span>
          </div>
          <h1 className="text-3xl lg:text-4xl font-black leading-[1.1] tracking-tight text-white">
            Run Errands at <br />
            <span className="text-blue-400">{currentCampusLabel}</span>
          </h1>
          <p className="text-white/80 text-xs sm:text-sm leading-relaxed font-normal">
            Gain immediate verification status to fulfill hot meal dispatch coordinates, micro-p2p commerce drops, and peer-to-peer delivery requests.
          </p>
        </div>

        <div className="relative z-10 text-[11px] text-white/40 font-medium">
          &copy; Instrict Logistics — Unified Transit Infrastructure
        </div>
      </section>

      {/* WORKSPACE AUTH FORM CONTAINER */}
      <section className="flex-1 flex justify-center items-center p-6 sm:p-8 md:p-12 bg-white dark:bg-slate-950 transition-colors duration-500 overflow-y-auto ">
        <div className="w-full max-w-sm space-y-6">
          
 {/* BACK BUTTON */}
          <button
            onClick={handleBack}
            type="button"
            className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors -ml-1"
          >
            <ArrowLeft className="w-4 h-4" />
            Back
          </button>




          <div className="space-y-1">
            <h2 className="text-md font-black tracking-tight">
              {authMode === 'login' && 'Runner Log In'}
              {authMode === 'signup' && 'Register as Runner'}
              {authMode === 'forgot' && 'Reset Runner Password'}
            </h2>
            <p className="text-xs text-slate-400">
              {authMode === 'forgot' 
                ? 'Enter your runner identity parameters to coordinate a reset link'
                : `Connecting runner:  `
              }
              {authMode !== 'forgot' && (
                <span className="text-slate-900 dark:text-slate-200 font-bold"> {currentCampusLabel}</span>
              )}
            </p>
          </div>

          {!isVerifying ? (
            <>
              {/* GOOGLE ACTION LANE */}
              {authMode !== 'forgot' && (
                <>
                  <button
                    onClick={handleGoogleOAuth}
                    type="button"
                    className="w-full h-12 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-950 text-slate-700 dark:text-slate-200 font-bold text-xs sm:text-sm tracking-tight transition-all flex items-center justify-center gap-3"
                  >
                    <svg className="w-4 h-4" viewBox="0 0 24 24">
                      <path fill="#EA4335" d="M12 5.04c1.65 0 3.13.57 4.3 1.69l3.22-3.22C17.56 1.63 14.97 1 12 1 7.28 1 3.25 3.72 1.34 7.68l3.78 2.92c.9-2.7 3.42-4.56 6.88-4.56z" />
                      <path fill="#4285F4" d="M23.45 12.27c0-.82-.07-1.61-.21-2.38H12v4.51h6.43c-.28 1.46-1.11 2.69-2.35 3.51l3.65 2.83c2.13-1.97 3.37-4.87 3.37-8.47z" />
                      <path fill="#FBBC05" d="M5.12 14.76c-.23-.69-.36-1.42-.36-2.18s.13-1.49.36-2.18L1.34 7.48C.49 9.18 0 11.04 0 13s.49 3.82 1.34 5.52l3.78-2.76z" />
                      <path fill="#34A853" d="M12 23c3.24 0 5.97-1.07 7.96-2.91l-3.65-2.83c-1.01.68-2.31 1.08-4.31 1.08-3.46 0-5.98-1.86-6.88-4.56L1.34 16.5C3.25 20.28 7.28 23 12 23z" />
                    </svg>
                    <span>Continue with Google</span>
                  </button>

                  <div className="relative flex items-center justify-center py-1">
                    <div className="absolute w-full border-b border-slate-100 dark:border-slate-900" />
                    <span className="relative px-3 bg-white dark:bg-slate-950 text-[10px] font-black uppercase text-slate-400 tracking-widest">
                      OR DIRECT ACCESS
                    </span>
                  </div>
                </>
              )}

              {/* ACTION FORM RACK */}
              <form onSubmit={handleSubmit(handleAuthSubmit)} className="space-y-2">
                
                {/* FULL NAME */}
                {authMode === 'signup' && (
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black uppercase tracking-wider text-slate-400">Full Name</label>
                    <div className="relative">
                      <User className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                      <input
                        {...register('fullName')}
                        type="text"
                        placeholder="e.g. Samuel Okon"
                        className={`w-full h-11 pl-11 pr-4 rounded-xl border bg-white dark:bg-slate-900 text-sm outline-none transition-all ${
                          errors.fullName ? 'border-rose-500 focus:ring-2 focus:ring-rose-500/10' : 'border-slate-200 dark:border-slate-800 focus:ring-2 focus:ring-blue-600/20'
                        }`}
                      />
                    </div>
                    {errors.fullName && <p className="text-[11px] font-bold text-rose-500 mt-0.5">{errors.fullName.message}</p>}
                  </div>
                )}

                {/* EMAIL ADDRESS */}
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black uppercase tracking-wider text-slate-400">Email Address</label>
                  <div className="relative">
                    <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input
                      {...register('email')}
                      type="email"
                      placeholder="courier@domain.com"
                      className={`w-full h-11 pl-11 pr-4 rounded-xl border bg-white dark:bg-slate-900 text-sm outline-none transition-all ${
                        errors.email ? 'border-rose-500 focus:ring-2 focus:ring-rose-500/10' : 'border-slate-200 dark:border-slate-800 focus:ring-2 focus:ring-blue-600/20'
                      }`}
                    />
                  </div>
                  {errors.email && <p className="text-[11px] font-bold text-rose-500 mt-0.5">{errors.email.message}</p>}
                </div>

                {/* PASSWORD */}
                {authMode !== 'forgot' && (
                  <div className="space-y-1.5">
                    <div className="flex justify-between items-center">
                      <label className="text-[10px] font-black uppercase tracking-wider text-slate-400">Password</label>
                      {authMode === 'login' && (
                        <button
                          type="button"
                          onClick={() => handleModeSwitch('forgot')}
                          className="text-[11px] font-bold text-blue-600 dark:text-blue-400 hover:underline bg-transparent border-none p-0 cursor-pointer"
                        >
                          Forgot Password?
                        </button>
                      )}
                    </div>
                    <div className="relative">
                      <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                      <input
                        {...register('password')}
                        type="password"
                        placeholder="••••••••"
                        className={`w-full h-11 pl-11 pr-4 rounded-xl border bg-white dark:bg-slate-900 text-sm outline-none transition-all ${
                          errors.password ? 'border-rose-500 focus:ring-2 focus:ring-rose-500/10' : 'border-slate-200 dark:border-slate-800 focus:ring-2 focus:ring-blue-600/20'
                        }`}
                      />
                    </div>
                    {errors.password && <p className="text-[11px] font-bold text-rose-500 mt-0.5">{errors.password.message}</p>}
                  </div>
                )}

                {serverError && (
                  <div className="flex items-start gap-2 bg-rose-500/5 border border-rose-500/20 rounded-xl px-4 py-3">
                    <span className="text-rose-500 text-lg leading-none mt-0.5">⚠</span>
                    <p className="text-[11px] font-bold text-rose-500 leading-relaxed">{serverError}</p>
                  </div>
                )}

                {/* RUN ENGINE ACTION CONTROL */}
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full h-11 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:bg-blue-600/50 text-white font-bold text-xs sm:text-sm tracking-tight transition-all flex items-center justify-center gap-2 mt-2 shadow-lg shadow-blue-600/10 active:scale-[0.98]"
                >
                  <span>
                    {isSubmitting && 'Synchronizing Transit Matrix...'}
                    {!isSubmitting && authMode === 'login' && 'Initialize Session'}
                    {!isSubmitting && authMode === 'signup' && 'Activate Fleet Profile'}
                    {!isSubmitting && authMode === 'forgot' && 'Dispatch Recovery Code'}
                  </span>
                  {!isSubmitting && authMode !== 'forgot' && <ArrowRight className="w-4 h-4" />}
                  {!isSubmitting && authMode === 'forgot' && <KeyRound className="w-4 h-4" />}
                </button>
              </form>

              {/* MANAGEMENT LINK CONTROLS */}
              <div className="text-center pt-2 space-y-2">
                {authMode === 'login' && (
                  <button
                    onClick={() => handleModeSwitch('signup')}
                    className="text-xs hover:text-slate-500 text-blue-600 dark:text-blue-400 transition-colors font-semibold"
                  >
                    New here? Activate a courier account
                  </button>
                )}
                {authMode === 'signup' && (
                  <button
                    onClick={() => handleModeSwitch('login')}
                    className="text-xs hover:text-slate-500 text-blue-600 dark:text-blue-400 transition-colors font-semibold"
                  >
                    Already registered? Log In
                  </button>
                )}
                {authMode === 'forgot' && (
                  <button
                    onClick={() => handleModeSwitch('login')}
                    className="text-xs hover:text-slate-500 text-blue-600 dark:text-blue-400 transition-colors font-semibold"
                  >
                    Return to runner login screen
                  </button>
                )}
              </div>
            </>
          ) : (
            /* CHECK-YOUR-EMAIL SCREEN */
            <div className="space-y-6">
              <div className="p-3 w-fit rounded-xl bg-blue-600/10 text-blue-600 border border-blue-600/20">
                <Mail className="w-5 h-5" />
              </div>
              <div className="space-y-1">
                <h3 className="text-xl font-black tracking-tight">Check your email</h3>
                <p className="text-xs text-slate-400 leading-relaxed font-normal">
                  We sent a confirmation link to your email. Click it to activate your courier profile within the <span className="text-foreground font-bold">{currentCampusLabel}</span> hub.
                </p>
              </div>
              <button
                onClick={() => setIsVerifying(false)}
                className="w-full h-11 rounded-xl border border-slate-200 dark:border-slate-800 font-bold text-xs text-slate-500 hover:text-slate-950 dark:hover:text-white transition-all"
              >
                Modify Identity Parameters
              </button>
            </div>
          )}

        </div>
      </section>
    </main>
  );
}