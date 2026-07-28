'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { createClient } from '@/utils/supabase/client';
import { ShieldAlert, Mail, Lock, ArrowRight, HelpCircle, Loader2 } from 'lucide-react';

const loginSchema = z.object({
  email: z.string().email({ message: 'Enter a valid email address' }),
  password: z.string().min(1, { message: 'Password is required' }),
});

const forgotSchema = z.object({
  email: z.string().email({ message: 'Enter a valid email address' }),
});

const oauthErrorMessages = {
  missing_code: 'Something went wrong signing in with Google. Try again.',
  exchange_failed: 'Something went wrong signing in with Google. Try again.',
  not_admin: 'This account does not have admin access.',
  pending_approval: 'Your admin access is still pending approval.',
  access_rejected: 'Your admin access has been rejected. Contact engineering.',
};

export default function AdminAuth() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const supabase = createClient();

  const [authMode, setAuthMode] = useState('login');
  const [serverError, setServerError] = useState('');
  const [forgotSent, setForgotSent] = useState(false);

  useEffect(() => {
    const errorCode = searchParams.get('error');
    if (errorCode) {
      setServerError(oauthErrorMessages[errorCode] || 'Something went wrong signing in.');
    }
  }, [searchParams]);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(authMode === 'login' ? loginSchema : forgotSchema),
    defaultValues: { email: '', password: '' },
  });

  const handleLogin = async ({ email, password }) => {
    setServerError('');

    const { data: signInData, error: signInError } =
      await supabase.auth.signInWithPassword({ email, password });

    if (signInError) {
      setServerError('Incorrect email or password.');
      return;
    }

    const user = signInData.user;

    const { data: roleRow, error: roleError } = await supabase
      .from('user_roles')
      .select('status')
      .eq('user_id', user.id)
      .eq('role', 'admin')
      .maybeSingle();

    if (roleError || !roleRow) {
      await supabase.auth.signOut();
      setServerError('This account does not have admin access.');
      return;
    }

    if (roleRow.status !== 'active') {
      await supabase.auth.signOut();
      setServerError(
        roleRow.status === 'pending'
          ? 'Your admin access is still pending approval.'
          : 'Your admin access has been rejected. Contact engineering.'
      );
      return;
    }

    router.push('/admin/dashboard');
  };

  const handleForgot = async ({ email }) => {
    setServerError('');

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/reset-password`,
    });

    if (error) {
      setServerError('Something went wrong sending the reset email. Try again.');
      return;
    }

    setForgotSent(true);
  };

  const handleGoogleOAuth = async () => {
    setServerError('');

    const { error: oauthError } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/auth/callback/admin`,
      },
    });

    if (oauthError) {
      setServerError('Something went wrong starting Google sign-in. Try again.');
    }
  };

  const onSubmit = authMode === 'login' ? handleLogin : handleForgot;

  return (
    <main className="h-screen w-full flex bg-slate-950 text-white antialiased selection:bg-emerald-500/30 selection:text-emerald-400">

      <section className="hidden lg:flex flex-[0.8] p-16 flex-col justify-between border-r border-slate-900 bg-[radial-gradient(ellipse_at_top_right,rgba(16,185,129,0.05),transparent_50%)] relative">
        <div className="absolute top-0 right-0 w-px h-full bg-gradient-to-b from-transparent via-slate-800 to-transparent" />

        <div className="flex items-center gap-2 text-xs font-black tracking-widest text-slate-400 uppercase">
          <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          <span>Instrict Platform Core</span>
        </div>

        <div className="space-y-6 max-w-sm">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-md bg-slate-900 border border-slate-800">
            <ShieldAlert className="w-3.5 h-3.5 text-emerald-400" />
            <span className="text-[10px] font-mono tracking-tight text-emerald-400">ADMIN ACCESS</span>
          </div>
          <h1 className="text-3xl font-black tracking-tight leading-[1.1] text-slate-100">
            Platform Operations <br />
            & Core Dispatch Control
          </h1>
          <p className="text-slate-400 text-xs sm:text-sm leading-relaxed font-mono">
            Reserved for approved platform administrators. Access is granted manually — there is no self-registration.
          </p>
        </div>

        <div className="text-[10px] text-slate-600 font-mono">
          RESTRICTED ACCESS
        </div>
      </section>

      <section className="flex-1 flex justify-center p-6 sm:p-8 md:p-12 items-center relative overflow-y-auto">
        <div className="w-full max-w-xs space-y-8">

          <div className="space-y-2">
            <h2 className="text-xl font-black tracking-tight text-slate-100 font-mono">
              {authMode === 'login' ? 'ADMIN LOGIN' : 'RESET PASSWORD'}
            </h2>
            <p className="text-xs text-slate-500 leading-relaxed">
              {authMode === 'login'
                ? 'Sign in with your administrator credentials.'
                : "We'll email you a link to reset your password."}
            </p>
          </div>

          {forgotSent ? (
            <div className="space-y-4">
              <div className="rounded-lg border border-emerald-900/50 bg-emerald-500/5 px-4 py-3">
                <p className="text-[11px] font-mono text-emerald-400 leading-relaxed">
                  If that email matches an account, a reset link is on its way. Check your inbox.
                </p>
              </div>
              <button
                type="button"
                onClick={() => { setAuthMode('login'); setForgotSent(false); }}
                className="text-[11px] font-mono text-slate-500 hover:text-slate-300 transition-colors"
              >
                Return to log-in
              </button>
            </div>
          ) : (
            <>
              {authMode === 'login' && (
                <>
                  <button
                    onClick={handleGoogleOAuth}
                    type="button"
                    className="w-full h-10 rounded-lg border border-slate-800 bg-slate-900/50 hover:bg-slate-900 text-slate-200 font-bold text-xs tracking-tight transition-all flex items-center justify-center gap-3"
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
                    <div className="absolute w-full border-b border-slate-900" />
                    <span className="relative px-3 bg-slate-950 text-[9px] font-mono uppercase text-slate-600 tracking-widest">
                      OR USE CREDENTIALS
                    </span>
                  </div>
                </>
              )}

              <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-mono uppercase tracking-wider text-slate-500">Email</label>
                  <div className="relative">
                    <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-600" />
                    <input
                      {...register('email')}
                      type="email"
                      placeholder="admin@instrict.com"
                      className={`w-full h-10 pl-10 pr-4 rounded-lg border bg-slate-900/50 text-slate-200 text-xs font-mono outline-none transition-all ${
                        errors.email
                          ? 'border-rose-900 focus:border-rose-500 focus:ring-1 focus:ring-rose-500/20'
                          : 'border-slate-800 focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600/10'
                      }`}
                    />
                  </div>
                  {errors.email && <p className="text-[10px] font-mono text-rose-500 mt-0.5">{errors.email.message}</p>}
                </div>

                {authMode === 'login' && (
                  <div className="space-y-1.5">
                    <div className="flex justify-between items-center">
                      <label className="text-[10px] font-mono uppercase tracking-wider text-slate-500">Password</label>
                      <button
                        type="button"
                        onClick={() => { setAuthMode('forgot'); setServerError(''); }}
                        className="text-[10px] font-mono text-emerald-500 hover:underline bg-transparent border-none p-0 cursor-pointer"
                      >
                        Forgot password?
                      </button>
                    </div>
                    <div className="relative">
                      <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-600" />
                      <input
                        {...register('password')}
                        type="password"
                        placeholder="••••••••••••"
                        className={`w-full h-10 pl-10 pr-4 rounded-lg border bg-slate-900/50 text-slate-200 text-xs font-mono outline-none transition-all ${
                          errors.password
                            ? 'border-rose-900 focus:border-rose-500 focus:ring-1 focus:ring-rose-500/20'
                            : 'border-slate-800 focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600/10'
                        }`}
                      />
                    </div>
                    {errors.password && <p className="text-[10px] font-mono text-rose-500 mt-0.5">{errors.password.message}</p>}
                  </div>
                )}

                {serverError && (
                  <div className="rounded-lg border border-rose-900/50 bg-rose-500/5 px-3 py-2.5">
                    <p className="text-[10px] font-mono text-rose-400">{serverError}</p>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full h-10 rounded-lg bg-slate-100 hover:bg-white disabled:bg-slate-800 text-slate-950 disabled:text-slate-600 font-bold text-xs tracking-tight transition-all flex items-center justify-center gap-2 mt-2"
                >
                  {isSubmitting ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <>
                      <span>{authMode === 'login' ? 'Sign in' : 'Send reset link'}</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </>
                  )}
                </button>

                {authMode === 'forgot' && (
                  <div className="text-center pt-2">
                    <button
                      type="button"
                      onClick={() => { setAuthMode('login'); setServerError(''); }}
                      className="text-[11px] font-mono text-slate-500 hover:text-slate-300 transition-colors"
                    >
                      Return to log-in
                    </button>
                  </div>
                )}
              </form>
            </>
          )}

          <div className="pt-6 border-t border-slate-900 flex items-center gap-2 text-[10px] text-slate-600 font-mono">
            <HelpCircle className="w-3.5 h-3.5" />
            <span>Need admin access? Contact engineering.</span>
          </div>

        </div>
      </section>
    </main>
  );
}