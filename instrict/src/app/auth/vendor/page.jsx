'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Store, Mail, Lock, ArrowRight, KeyRound, ArrowLeft } from 'lucide-react';
import { createClient } from '@/utils/supabase/client';
import { useCampusStore } from '@/store/useCampusStore';
import { getCampusFullName } from '@/constants/universities';
import { resolveUserDestination } from '@/utils/auth/resolveDestination';

export default function VendorAuthForm() {
  const router = useRouter();
  const supabase = createClient();
  const campus = useCampusStore((state) => state.campus);

  const [authMode, setAuthMode] = useState('login');
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    businessName: '',
    email: '',
    password: '',
  });


 const campusLabel = getCampusFullName(campus);

  const switchMode = (newMode) => {
    setError('');
    setSuccessMessage('');
    setAuthMode(newMode);
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

    const handleBack = () => {
    router.back();
  };


  const handleFormSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccessMessage('');
    setIsLoading(true);

    try {
      if (authMode === 'signup') {
        // Check if this email already has the vendor role
        const { data: existingRoleCheck } = await supabase
          .rpc('check_existing_role', {
            check_email: formData.email,
            check_role: 'vendor',
          });

        if (existingRoleCheck === true) {
          setError('An account with this email already exists as a vendor. Please log in instead.');
          setIsLoading(false);
          return;
        }

        const { data, error: signUpError } = await supabase.auth.signUp({
          email: formData.email,
          password: formData.password,
          options: {
            data: {
              full_name: formData.businessName,
              business_name: formData.businessName,
              campus: campus,
              pending_role: 'vendor', // used after email confirm to know which role to attach
            },
            emailRedirectTo: `${window.location.origin}/auth/callback`,
          },
        });

        if (signUpError) {
          if (signUpError.message.toLowerCase().includes('already registered')) {
            setError('An account with this email already exists. Try logging in, or use "Become a Vendor" from your existing account.');
          } else {
            setError(signUpError.message);
          }
          setIsLoading(false);
          return;
        }

        setSuccessMessage('Check your email to confirm your account before continuing.');
        setIsLoading(false);
        return;
      }



     if (authMode === 'login') {
  const { data, error: loginError } = await supabase.auth.signInWithPassword({
    email: formData.email,
    password: formData.password,
  });

  if (loginError) {
    setError(loginError.message);
    setIsLoading(false);
    return;
  }

  setSuccessMessage('Welcome back! Loading storefront...');

  const destination = await resolveUserDestination(supabase, data.user.id);

  setTimeout(() => {
    router.push(destination);
  }, 1000);
  return;
}

      if (authMode === 'forgot') {
        const { error: resetError } = await supabase.auth.resetPasswordForEmail(
          formData.email,
          { redirectTo: `${window.location.origin}/auth/reset-password` }
        );

        if (resetError) {
          setError(resetError.message);
          setIsLoading(false);
          return;
        }

        setSuccessMessage('Password reset link sent. Check your email inbox.');
        setIsLoading(false);
        setTimeout(() => {
          switchMode('login');
        }, 2000);
        return;
      }
    } catch (err) {
      setError('Something went wrong. Please try again.');
      setIsLoading(false);
    }
  };

 const handleGoogleLogin = async () => {
  setError('');
  setIsLoading(true);

  // Store role/campus in cookies so they survive the Google redirect round-trip
  document.cookie = `pending_role=vendor; path=/; max-age=600; SameSite=Lax`;
  document.cookie = `pending_campus=${encodeURIComponent(campus || '')}; path=/; max-age=600; SameSite=Lax`;

  const { error: oauthError } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: `${window.location.origin}/auth/callback`,
    },
  });

  if (oauthError) {
    setError(oauthError.message);
    setIsLoading(false);
  }
};

  return (
    <main className="h-screen w-full flex flex-col md:flex-row overflow-hidden bg-white dark:bg-slate-950 text-slate-950 dark:text-white antialiased">

      {/* ── BRANDING SIDEBAR ── */}
      <section className="hidden md:flex flex-[0.9] p-16 flex-col justify-between text-white bg-gradient-to-br from-slate-950 via-blue-950 to-blue-900 relative">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_bottom_left,rgba(59,130,246,0.2),transparent_50%)]" />
        <div className="relative z-10 text-xl font-black tracking-tighter">
          Instrict<span className="text-blue-400">MarketPlace.</span>
        </div>
        <div className="relative z-10 space-y-5 max-w-sm">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 backdrop-blur-md border border-white/10">
            <Store className="w-3.5 h-3.5 text-blue-400" />
            <span className="text-[9px] font-black tracking-widest uppercase text-white/90">
              MERCHANT CREDENTIALS
            </span>
          </div>
          <h1 className="text-3xl lg:text-4xl font-black leading-[1.1] tracking-tight">
            Setup Security &<br />
            <span className="text-blue-400">Account Details</span>
          </h1>
          <p className="text-white/80 text-xs sm:text-sm leading-relaxed">
            Configure your secure dashboard to link catalogs, bind Paystack nodes, and fulfill terminal transactions.
          </p>
        </div>
        <div className="relative z-10 text-[11px] text-white/40 font-medium">
          &copy; Instrict Commerce — Distributed Merchant Infrastructure
        </div>
      </section>

      {/* ── FORM PANEL ── */}
      <section className="flex-1 flex justify-center p-6 sm:p-8 md:p-12 bg-white dark:bg-slate-950 overflow-y-auto py-10 relative">
        <div className="w-full max-w-sm space-y-4 my-auto relative">

 {/* BACK BUTTON */}
          <button
            onClick={handleBack}
            type="button"
            className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors -ml-1"
          >
            <ArrowLeft className="w-4 h-4" />
            Back
          </button>




          <div className="pt-2 md:pt-0">
            <h2 className="text-md font-black tracking-tight mt-2">
              {authMode === 'login'  && 'Merchant Portal'}
              {authMode === 'signup' && 'Register Your Business'}
              {authMode === 'forgot' && 'Recover Storefront Access'}
            </h2>
            <p className="text-xs text-slate-400 mt-1">
              {authMode === 'forgot'
                ? 'Enter your email to receive a password reset link'
                : <> Location: <span className="text-slate-900 dark:text-slate-200 font-bold">{campusLabel}</span></>
              }
            </p>
          </div>

          {/* Social Sign-in Trigger Row */}
          {authMode !== 'forgot' && (
            <>
              <button
                type="button"
                onClick={handleGoogleLogin}
                disabled={isLoading}
                className="w-full h-12 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 font-bold text-sm tracking-tight transition-all flex items-center justify-center gap-3 disabled:opacity-50"
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24">
                  <path fill="#EA4335" d="M12 5.04c1.65 0 3.13.57 4.3 1.69l3.22-3.22C17.56 1.63 14.97 1 12 1 7.28 1 3.25 3.72 1.34 7.68l3.78 2.92c.9-2.7 3.42-4.56 6.88-4.56z" />
                  <path fill="#4285F4" d="M23.45 12.27c0-.82-.07-1.61-.21-2.38H12v4.51h6.43c-.28 1.46-1.11 2.69-2.35 3.51l3.65 2.83c2.13-1.97 3.37-4.87 3.37-8.47z" />
                  <path fill="#FBBC05" d="M5.12 14.76c-.23-.69-.36-1.42-.36-2.18s.13-1.49.36-2.18L1.34 7.48C.49 9.18 0 11.04 0 13s.49 3.82 1.34 5.52l3.78-2.76z" />
                  <path fill="#34A853" d="M12 23c3.24 0 5.97-1.07 7.96-2.91l-3.65-2.83c-1.01.68-2.31 1.08-4.31 1.08-3.46 0-5.98-1.86-6.88-4.56L1.34 16.5C3.25 20.28 7.28 23 12 23z" />
                </svg>
                {authMode === 'signup' ? 'Sign up with Google' : 'Sign in with Google'}
              </button>

              <div className="relative flex items-center justify-center">
                <div className="absolute w-full border-b border-slate-100 dark:border-slate-800" />
                <span className="relative px-3 bg-white dark:bg-slate-950 text-[10px] font-black uppercase text-slate-400 tracking-widest">
                  or continue with email
                </span>
              </div>
            </>
          )}

          {/* Form Processing Fields */}
          <form onSubmit={handleFormSubmit} className="space-y-4">
            {authMode === 'signup' && (
              <div className="space-y-1.5">
                <label className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                  Business / Brand Name <span className="text-blue-500">*</span>
                </label>
                <div className="relative">
                  <Store className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    type="text"
                    name="businessName"
                    value={formData.businessName}
                    onChange={handleInputChange}
                    required
                    placeholder="e.g. Subomi Foods, Iya Ibadan"
                    className="w-full h-11 pl-11 pr-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-sm outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                  />
                </div>
              </div>
            )}

            <div className="space-y-1.5">
              <label className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                Business Email Address <span className="text-blue-500">*</span>
              </label>
              <div className="relative">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleInputChange}
                  required
                  placeholder="vendor@brand.com"
                  className="w-full h-11 pl-11 pr-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-sm outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                />
              </div>
            </div>

            {authMode !== 'forgot' && (
              <div className="space-y-1.5">
                <div className="flex justify-between items-center">
                  <label className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                    Password <span className="text-blue-500">*</span>
                  </label>
                  {authMode === 'login' && (
                    <button
                      type="button"
                      onClick={() => switchMode('forgot')}
                      className="text-[11px] font-bold text-blue-500 hover:text-blue-600 dark:text-blue-400 hover:underline"
                    >
                      Forgot Password?
                    </button>
                  )}
                </div>
                <div className="relative">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    type="password"
                    name="password"
                    value={formData.password}
                    onChange={handleInputChange}
                    required
                    placeholder="••••••••"
                    className="w-full h-11 pl-11 pr-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-sm outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                  />
                </div>
              </div>
            )}

            {error && (
              <div className="flex items-start gap-2 bg-rose-500/5 border border-rose-500/20 rounded-xl px-4 py-3">
                <span className="text-rose-500 text-lg leading-none mt-0.5">⚠</span>
                <p className="text-[11px] font-bold text-rose-500 leading-relaxed">{error}</p>
              </div>
            )}

            {successMessage && (
              <div className="flex items-start gap-2 bg-blue-500/5 border border-blue-500/20 rounded-xl px-4 py-3">
                <span className="text-blue-500 text-lg leading-none mt-0.5">✓</span>
                <p className="text-[11px] font-bold text-blue-500 leading-relaxed">{successMessage}</p>
              </div>
            )}

            <button
              type="submit"
              disabled={isLoading}
              className="w-full h-11 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-bold text-sm tracking-tight transition-all flex items-center justify-center gap-2 shadow-lg shadow-blue-600/10 active:scale-[0.98]"
            >
              <span>
                {isLoading                  && 'Please wait...'}
                {!isLoading && authMode === 'login'  && 'Open Dashboard'}
                {!isLoading && authMode === 'signup' && 'Deploy Storefront'}
                {!isLoading && authMode === 'forgot' && 'Send Reset Link'}
              </span>
              {!isLoading && authMode !== 'forgot' && <ArrowRight className="w-4 h-4" />}
              {!isLoading && authMode === 'forgot'  && <KeyRound className="w-4 h-4" />}
            </button>
          </form>

          {/* ── MODE SWITCHER ── */}
          <div className="text-center pt-2 border-t border-slate-100 dark:border-slate-900">
            {authMode === 'login' && (
              <button
                type="button"
                onClick={() => switchMode('signup')}
                className="text-xs hover:text-slate-500 text-blue-500 transition-colors font-semibold"
              >
                New vendor? Register your brand
              </button>
            )}
            {authMode === 'signup' && (
              <button
                type="button"
                onClick={() => switchMode('login')}
                className="text-xs hover:text-slate-500 text-blue-500 transition-colors font-semibold"
              >
                Already have a storefront? Log In
              </button>
            )}
            {authMode === 'forgot' && (
              <button
                type="button"
                onClick={() => switchMode('login')}
                className="text-xs hover:text-slate-500 text-blue-500 transition-colors font-semibold"
              >
                Return to login
              </button>
            )}
          </div>

        </div>
      </section>
    </main>
  );
}