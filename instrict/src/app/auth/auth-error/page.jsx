'use client';

import React from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { ShieldAlert, ArrowLeft, RefreshCw, Home } from 'lucide-react';

export default function AuthErrorPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const role = searchParams.get('role') || searchParams.get('type') || 'user';

  // Determine where to send them back based on their portal role
  const getLoginPath = () => {
    switch (role) {
      case 'vendor': return '/auth/vendor';
      case 'rider': return '/auth/rider';
      case 'user':
      default:
        return '/auth/student'; // Adjust to your specific student auth route if different
    }
  };

  const handleReturn = () => {
    router.push(getLoginPath());
  };

  const handleHome = () => {
    router.push('/');
  };

  return (
    <main className="h-screen w-full flex flex-col md:flex-row overflow-hidden bg-white dark:bg-slate-950 text-slate-950 dark:text-white transition-colors duration-500 antialiased">
      
      {/* BRANDING GRAPHIC COLUMN (DESKTOP) */}
      <section className="hidden md:flex flex-[0.9] p-16 flex-col justify-between text-white bg-gradient-to-br from-rose-600 via-indigo-950 to-slate-950 transition-all duration-500 relative">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_bottom_left,rgba(225,29,72,0.3),transparent_45%)]" />
        
        <div className="relative z-10 text-xl font-black tracking-tighter">
          Instrict<span className="text-blue-400">MarketPlace.</span>
        </div>

        <div className="relative z-10 space-y-3 max-w-sm">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 backdrop-blur-md border border-white/10">
            <ShieldAlert className="w-3.5 h-3.5 text-rose-300" />
            <span className="text-[9px] font-black tracking-widest uppercase text-white/90">
              GATEWAY EXCEPTION INTERCEPT
            </span>
          </div>
          <h1 className="text-3xl lg:text-4xl font-black leading-[1.1] tracking-tight text-white">
            Authentication <br />
            <span className="text-rose-300">Handshake Failed</span>
          </h1>
          <p className="text-white/80 text-xs sm:text-sm leading-relaxed font-normal">
            The verification token may have expired, been invalidated, or encountered a routing mismatch inside your perimeter node.
          </p>
        </div>

        <div className="relative z-10 text-[11px] text-white/40 font-medium">
          &copy; Instrict Ecosystem — National Perimeter Network
        </div>
      </section>

      {/* ERROR ACTION SHEET */}
      <section className="flex-1 flex justify-center items-center p-6 sm:p-8 md:p-12 bg-white dark:bg-slate-950 transition-colors duration-500 overflow-y-auto">
        <div className="w-full max-w-sm space-y-6">

          {/* BACK BUTTON */}
          <button
            onClick={handleReturn}
            type="button"
            className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors -ml-1"
          >
            <ArrowLeft className="w-4 h-4" />
            Return to Login Portal
          </button>

          <div className="space-y-2">
            <div className="p-3 w-fit rounded-xl bg-rose-500/10 text-rose-500 border border-rose-500/20">
              <ShieldAlert className="w-6 h-6" />
            </div>
            <h2 className="text-2xl font-black tracking-tight">
              Unable to complete sign-in
            </h2>
            <p className="text-xs sm:text-sm text-slate-400 leading-relaxed">
              We couldn't authenticate your credentials or session link. Please retry the gateway authentication sequence or return home.
            </p>
          </div>

          <div className="space-y-3 pt-2">
            <button
              onClick={handleReturn}
              className="w-full h-11 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs sm:text-sm tracking-tight transition-all flex items-center justify-center gap-2 shadow-lg shadow-blue-600/10 active:scale-[0.98]"
            >
              <RefreshCw className="w-4 h-4" />
              <span>Try Logging In Again</span>
            </button>

            <button
              onClick={handleHome}
              className="w-full h-11 rounded-xl border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-900 font-bold text-xs text-slate-700 dark:text-slate-300 transition-all flex items-center justify-center gap-2"
            >
              <Home className="w-4 h-4" />
              <span>Return to Ecosystem Home</span>
            </button>
          </div>

        </div>
      </section>
    </main>
  );
}