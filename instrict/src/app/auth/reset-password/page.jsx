'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/utils/supabase/client';
import { Lock, ArrowRight, CheckCircle } from 'lucide-react';

const loginRoutes = {
  user: '/auth/student?mode=login',
  rider: '/auth/rider?mode=login',
  vendor: '/auth/vendor?mode=login',
};

export default function ResetPassword() {
  const router = useRouter();
  const supabase = createClient();

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isDone, setIsDone] = useState(false);
  const [error, setError] = useState('');

  const handleReset = async (e) => {
    e.preventDefault();
    setError('');

    if (password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    setIsLoading(true);

    try {
      const { error: updateError } = await supabase.auth.updateUser({ password });
      if (updateError) throw updateError;

      // Figure out which role this user belongs to, so we redirect
      // them to the correct login form (user/rider/vendor) instead
      // of a hardcoded one.
      const { data: { user } } = await supabase.auth.getUser();

      const { data: roles } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id);

      const role = roles?.[0]?.role || 'user';
      const destination = loginRoutes[role] || loginRoutes.user;

      setIsDone(true);
      setTimeout(() => router.replace(destination), 3000);

    } catch (err) {
      setError(err.message || 'Failed to reset password');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <main className="h-screen w-full flex flex-col md:flex-row overflow-hidden bg-white dark:bg-slate-950 text-slate-950 dark:text-white antialiased">

      {/* ── BRANDING SIDEBAR ── */}
      <section className="hidden md:flex flex-[0.9] p-16 flex-col justify-between text-white bg-gradient-to-br from-slate-950 via-blue-950 to-blue-900 relative">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_bottom_left,rgba(59,130,246,0.2),transparent_50%)]" />

        <div className="relative z-10 text-xl font-black tracking-tighter">
          Instrict<span className="text-blue-400">Hub.</span>
        </div>

        <div className="relative z-10 space-y-5 max-w-sm">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 backdrop-blur-md border border-white/10">
            <Lock className="w-3.5 h-3.5 text-blue-400" />
            <span className="text-[9px] font-black tracking-widest uppercase text-white/90">
              ACCOUNT SECURITY
            </span>
          </div>
          <h1 className="text-3xl lg:text-4xl font-black leading-[1.1] tracking-tight">
            Reset Your <br />
            <span className="text-blue-400">Password</span>
          </h1>
          <p className="text-white/80 text-xs sm:text-sm leading-relaxed">
            Choose a strong password to keep your merchant account and storefront secure.
          </p>
        </div>

        <div className="relative z-10 text-[11px] text-white/40 font-medium">
          &copy; Instrict Commerce — Distributed Merchant Infrastructure
        </div>
      </section>

      {/* ── FORM PANEL ── */}
      <section className="flex-1 flex justify-center p-6 sm:p-8 md:p-12 bg-white dark:bg-slate-950 overflow-y-auto items-center">
        <div className="w-full max-w-sm space-y-6">

          {!isDone ? (
            <>
              <div>
                <h2 className="text-xl font-black tracking-tight">Choose a new password</h2>
                <p className="text-xs text-slate-400 mt-1">
                  Must be at least 6 characters
                </p>
              </div>

              <form onSubmit={handleReset} className="space-y-4">

                {/* New password */}
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                    New Password <span className="text-blue-500">*</span>
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      placeholder="••••••••"
                      className="w-full h-11 pl-11 pr-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-sm outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                    />
                  </div>
                </div>

                {/* Confirm password */}
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                    Confirm Password <span className="text-blue-500">*</span>
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input
                      type="password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      required
                      placeholder="••••••••"
                      className="w-full h-11 pl-11 pr-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-sm outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                    />
                  </div>
                </div>

                {/* Error */}
                {error && (
                  <p className="text-[11px] font-bold text-rose-500 bg-rose-500/5 border border-rose-500/20 rounded-lg px-3 py-2">
                    {error}
                  </p>
                )}

                {/* Submit */}
                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full h-11 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-bold text-sm tracking-tight transition-all flex items-center justify-center gap-2 shadow-lg shadow-blue-600/10 active:scale-[0.98]"
                >
                  <span>{isLoading ? 'Updating...' : 'Update Password'}</span>
                  {!isLoading && <ArrowRight className="w-4 h-4" />}
                </button>
              </form>
            </>
          ) : (
            /* ── SUCCESS SCREEN ── */
            <div className="space-y-4 text-center">
              <div className="w-fit mx-auto p-4 rounded-2xl bg-blue-500/10 text-blue-500 border border-blue-500/20">
                <CheckCircle className="w-8 h-8" />
              </div>
              <div className="space-y-1">
                <h3 className="text-xl font-black tracking-tight">Password Updated</h3>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Your password has been reset successfully. Redirecting you to login...
                </p>
              </div>
              <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto" />
            </div>
          )}

        </div>
      </section>
    </main>
  );
}