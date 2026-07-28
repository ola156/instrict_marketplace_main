'use client';

import { useState } from 'react';
import { createClient } from '@/utils/supabase/client';
import { Radio, Coffee } from 'lucide-react';

export default function StoreStatusBanner({ isOpen: initialIsOpen, vendorUserId }) {
  const supabase = createClient();
  const [isOpen, setIsOpen] = useState(initialIsOpen);
  const [loading, setLoading] = useState(false);

  const toggle = async () => {
    setLoading(true);
    const newState = !isOpen;

    const { error } = await supabase
      .from('vendor_profiles')
      .update({
        is_open: newState,
        store_status: newState ? 'open' : 'closed',
      })
      .eq('user_id', vendorUserId);

    if (!error) setIsOpen(newState);
    setLoading(false);
  };

  return (
    <div className={`flex items-center justify-between px-4 py-2.5 rounded-xl border transition-all duration-300 ${
      isOpen
        ? 'bg-emerald-500/5 border-emerald-500/20'
        : 'bg-slate-100/60 dark:bg-slate-800/40 border-slate-200 dark:border-slate-700'
    }`}>
      <div className="flex items-center gap-2.5">
        <div className={`relative flex items-center justify-center w-7 h-7 rounded-lg ${
          isOpen ? 'bg-emerald-500/10 text-emerald-500' : 'bg-slate-200 dark:bg-slate-700 text-slate-400'
        }`}>
          {isOpen
            ? <Radio className="w-3.5 h-3.5" />
            : <Coffee className="w-3.5 h-3.5" />
          }
          {isOpen && (
            <span className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
          )}
        </div>
        <div>
          <p className="text-xs font-black tracking-tight text-slate-900 dark:text-white">
            {isOpen ? 'Store is open' : 'Store is closed'}
          </p>
          <p className="text-[10px] text-slate-400">
            {isOpen ? 'Accepting orders now' : 'Students cannot order from you'}
          </p>
        </div>
      </div>

      <button
        onClick={toggle}
        disabled={loading}
        className={`relative w-11 h-6 rounded-full transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 ${
          isOpen ? 'bg-emerald-500' : 'bg-slate-300 dark:bg-slate-600'
        } ${loading ? 'opacity-60 cursor-not-allowed' : 'cursor-pointer'}`}
      >
        <span className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow-sm transition-all duration-300 ${
          isOpen ? 'left-5' : 'left-0.5'
        }`} />
      </button>
    </div>
  );
}