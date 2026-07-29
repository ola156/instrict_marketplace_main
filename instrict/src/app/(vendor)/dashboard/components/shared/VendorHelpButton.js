'use client';

import { useState } from 'react';
import { MessageCircle, X } from 'lucide-react';
import HelpDesk from '@/components/HelpDesk';

export default function VendorHelpButton() {
  const [open, setOpen] = useState(false);

  return (
    <>
      {open && (
        <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center md:justify-end">
          <div onClick={() => setOpen(false)} className="absolute inset-0 bg-slate-950/40 backdrop-blur-sm" />
          <div className="relative w-full md:w-[420px] md:mr-6 max-h-[85vh] md:max-h-[80vh] md:mb-6 bg-white dark:bg-slate-950 rounded-t-3xl md:rounded-3xl shadow-2xl flex flex-col animate-in slide-in-from-bottom md:slide-in-from-bottom-4 duration-200 overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3.5 border-b border-slate-100 dark:border-slate-900 shrink-0">
              <span className="text-xs font-black text-slate-900 dark:text-white uppercase flex items-center gap-2">
                <MessageCircle className="w-4 h-4 text-emerald-500" /> Support
              </span>
              <button onClick={() => setOpen(false)} className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-900">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="flex-1 p-4 overflow-y-auto">
              <HelpDesk authorType="vendor" />
            </div>
          </div>
        </div>
      )}

      <button
        onClick={() => setOpen(true)}
        aria-label="Support"
        className="fixed bottom-20 md:bottom-6 right-4 md:right-6 z-40 w-14 h-14 rounded-full bg-emerald-600 hover:bg-emerald-700 text-white shadow-lg shadow-emerald-600/30 flex items-center justify-center transition-all hover:scale-105 active:scale-95"
      >
        <MessageCircle className="w-6 h-6" />
      </button>
    </>
  );
}