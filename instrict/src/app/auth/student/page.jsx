'use client';

import React, { useState } from 'react';
import { useCampusStore } from '@/store/useCampusStore';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { ShieldCheck, Mail, Lock, User, ArrowRight, KeyRound } from 'lucide-react';
import { getCampusFullName } from '@/constants/universities';
import { createClient } from '@/utils/supabase/client';
import { useRouter } from 'next/navigation';
import { resolveUserDestination } from '@/utils/auth/resolveDestination';

const studentAuthSchema = z.object({
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

export default function StudentAuth() {
  const campus = useCampusStore((state) => state.campus);
  const router = useRouter();
  const supabase = createClient();

  const [authMode, setAuthMode] = useState('login');
  const [isVerifying, setIsVerifying] = useState(false);
  const [serverError, setServerError] = useState('');

  const currentCampusLabel = getCampusFullName(campus);

  const { register, handleSubmit, setValue, clearErrors, formState: { errors, isSubmitting } } = useForm({
    resolver: zodResolver(studentAuthSchema),
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
      // Check if this email already has the 'user' role
      const { data: existingRoleCheck } = await supabase
        .rpc('check_existing_role', {
          check_email: data.email,
          check_role: 'user',
        });

      if (existingRoleCheck === true) {
        setServerError('An account with this email already exists. Please log in instead.');
        return;
      }

      const { error: signUpError } = await supabase.auth.signUp({
        email: data.email,
        password: data.password,
        options: {
          data: {
            full_name: data.fullName,
            campus: campus,
            pending_role: 'user',
          },
          emailRedirectTo: `${window.location.origin}/auth/callback`,
        },
      });

      if (signUpError) {
        if (signUpError.message.toLowerCase().includes('already registered')) {
          setServerError('An account with this email already exists. Try logging in instead.');
        } else {
          setServerError(signUpError.message);
        }
        return;
      }

      setIsVerifying(true); // show "check your email" screen
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

      setServerError('');
      alert(`Password recovery instruction dispatched to: ${data.email}`);
      handleModeSwitch('login');
    }
  };

  const handleGoogleOAuth = async () => {
    setServerError('');

    document.cookie = `pending_role=user; path=/; max-age=600; SameSite=Lax`;
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
      
      {/* BRANDING GRAPHIC COLUMN (DESKTOP) */}
      <section className="hidden md:flex flex-[0.9] p-16 flex-col justify-between text-white bg-gradient-to-br from-blue-600 via-indigo-700 to-slate-950 transition-all duration-500 relative">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_bottom_left,rgba(59,130,246,0.3),transparent_45%)]" />
        
        <div className="relative z-10 text-xl font-black tracking-tighter">
          Instrict<span className="text-indigo-400">MarketPlace.</span>
        </div>

        <div className="relative z-10 space-y-3 max-w-sm">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 backdrop-blur-md border border-white/10">
            <ShieldCheck className="w-3.5 h-3.5 text-indigo-200" />
            <span className="text-[9px] font-black tracking-widest uppercase text-white/90">
              PERIMETER VERIFICATION NODE
            </span>
          </div>
          <h1 className="text-3xl lg:text-4xl font-black leading-[1.1] tracking-tight text-white">
            Secure Entry to <br />
            <span className="text-indigo-300">{currentCampusLabel}</span>
          </h1>
          <p className="text-white/80 text-xs sm:text-sm leading-relaxed font-normal">
            Every transaction, listing, and delivery request inside this gateway is isolated to your active peer perimeter network.
          </p>
        </div>

        <div className="relative z-10 text-[11px] text-white/40 font-medium">
          &copy; Instrict Ecosystem — National Perimeter Network
        </div>
      </section>

      {/* REGISTRATION, LOGIN, & PASSWORD RESET COMPONENT SHEET */}
      <section className="flex-1 flex justify-center items-center p-6 sm:p-8 md:p-12 bg-white dark:bg-slate-950 transition-colors duration-500 overflow-y-auto ">
        <div className="w-full max-w-sm space-y-4">
          
          <div className="space-y-2">
            <h2 className="text-2xl font-black tracking-tight">
              {authMode === 'login' && 'Welcome back'}
              {authMode === 'signup' && 'Create your profile'}
              {authMode === 'forgot' && 'Reset access password'}
            </h2>
            <p className="text-xs sm:text-sm text-slate-400">
              {authMode === 'forgot' 
                ? 'Enter your verified account email to request a reset link'
                : `Authenticating user:`
              }
              {authMode !== 'forgot' && (
                <span className="text-slate-900 dark:text-slate-200 font-bold"> {currentCampusLabel}</span>
              )}
            </p>
          </div>

          {!isVerifying ? (
            <>
              {/* OAUTH BLOCK - HIDDEN IN PASSWORD RESET MODE */}
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
                      OR USE CREDENTIALS
                    </span>
                  </div>
                </>
              )}

              {/* INPUT FIELDS SHEET */}
              <form onSubmit={handleSubmit(handleAuthSubmit)} className="space-y-4">
                
                {/* FULL NAME (SIGNUP EXCLUSIVE) */}
                {authMode === 'signup' && (
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black uppercase tracking-wider text-slate-400">Full Name</label>
                    <div className="relative">
                      <User className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                      <input
                        {...register('fullName')}
                        type="text"
                        placeholder="e.g. Tunde Adesina"
                        className={`w-full h-11 pl-11 pr-4 rounded-xl border bg-white dark:bg-slate-900 text-sm outline-none transition-all ${
                          errors.fullName ? 'border-rose-500 focus:ring-2 focus:ring-rose-500/10' : 'border-slate-200 dark:border-slate-800 focus:ring-2 focus:ring-blue-600/20'
                        }`}
                      />
                    </div>
                    {errors.fullName && <p className="text-[11px] font-bold text-rose-500 mt-0.5">{errors.fullName.message}</p>}
                  </div>
                )}

                {/* EMAIL ADDRESS (GLOBAL) */}
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black uppercase tracking-wider text-slate-400">Email Address</label>
                  <div className="relative">
                    <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input
                      {...register('email')}
                      type="email"
                      placeholder="student@institution.edu.ng"
                      className={`w-full h-11 pl-11 pr-4 rounded-xl border bg-white dark:bg-slate-900 text-sm outline-none transition-all ${
                        errors.email ? 'border-rose-500 focus:ring-2 focus:ring-rose-500/10' : 'border-slate-200 dark:border-slate-800 focus:ring-2 focus:ring-blue-600/20'
                      }`}
                    />
                  </div>
                  {errors.email && <p className="text-[11px] font-bold text-rose-500 mt-0.5">{errors.email.message}</p>}
                </div>

                {/* PASSWORD (LOGIN & SIGNUP EXCLUSIVE) */}
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

                {/* SUBMIT LOOP BUTTON */}
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full h-11 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:bg-blue-600/50 text-white font-bold text-xs sm:text-sm tracking-tight transition-all flex items-center justify-center gap-2 mt-2 shadow-lg shadow-blue-600/10 active:scale-[0.98]"
                >
                  <span>
                    {isSubmitting && 'Validating Gateway Parameters...'}
                    {!isSubmitting && authMode === 'login' && 'Enter Network'}
                    {!isSubmitting && authMode === 'signup' && 'Initialize Profile'}
                    {!isSubmitting && authMode === 'forgot' && 'Send Reset Token'}
                  </span>
                  {!isSubmitting && authMode !== 'forgot' && <ArrowRight className="w-4 h-4" />}
                  {!isSubmitting && authMode === 'forgot' && <KeyRound className="w-4 h-4" />}
                </button>
              </form>

              {/* FOOTER TOGGLE LINKS */}
              <div className="text-center  space-y-2">
                {authMode === 'login' && (
                  <button
                    onClick={() => handleModeSwitch('signup')}
                    className="text-xs text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors font-medium"
                  >
                    New to this perimeter? Initialize an account
                  </button>
                )}
                {authMode === 'signup' && (
                  <button
                    onClick={() => handleModeSwitch('login')}
                    className="text-xs text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors font-medium"
                  >
                    Already authenticated in this node? Log In
                  </button>
                )}
                {authMode === 'forgot' && (
                  <button
                    onClick={() => handleModeSwitch('login')}
                    className="text-xs text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors font-medium"
                  >
                    Return to Log In window
                  </button>
                )}
              </div>
            </>
          ) : (
            /* CHECK-YOUR-EMAIL SCREEN — replaces the old simulated OTP UI */
            <div className="space-y-6">
              <div className="p-3 w-fit rounded-xl bg-blue-600/10 text-blue-600 border border-blue-600/20">
                <Mail className="w-5 h-5" />
              </div>
              <div className="space-y-1">
                <h3 className="text-xl font-black tracking-tight">Check your email</h3>
                <p className="text-xs text-slate-400 leading-relaxed font-normal">
                  We sent a confirmation link to your email. Click it to activate your account within the <span className="text-foreground font-bold">{currentCampusLabel}</span> network.
                </p>
              </div>
              <button
                onClick={() => setIsVerifying(false)}
                className="w-full h-11 rounded-xl border border-slate-200 dark:border-slate-800 font-bold text-xs text-slate-500 hover:text-slate-950 dark:hover:text-white transition-all"
              >
                Edit Registration Inputs
              </button>
            </div>
          )}

        </div>
      </section>
    </main>
  );
}