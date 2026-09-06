'use client';

import { useEffect, useState } from 'react';
import { useCampusStore } from '@/store/useCampusStore';
import { useRouter } from 'next/navigation';
import { User, Globe, ChevronsUpDown, LayoutGrid, LogOut } from 'lucide-react';
import { createClient } from '@/utils/supabase/client';
import Image from 'next/image';

export default function Header() {
  const { campus } = useCampusStore();
  const router = useRouter();
  const supabase = createClient();
  const [campusName, setCampusName] = useState('');

  useEffect(() => {
    if (!campus) return;
    let active = true;

    supabase
      .from('campuses')
      .select('name')
      .eq('slug', campus)
      .single()
      .then(({ data }) => {
        if (active && data?.name) setCampusName(data.name);
      });

    return () => {
      active = false;
    };
  }, [campus]);

  const handleCampusReset = () => {
    localStorage.removeItem("selected_campus");
    router.push("/");
  };

  return (
    <header className="sticky top-0 z-50 w-full border-b border-slate-100 dark:border-slate-900 bg-white/70 dark:bg-slate-950/70 backdrop-blur-xl transition-all duration-300">
      <div className="container mx-auto max-w-6xl flex h-16 items-center justify-between px-6">

        {/* Left Side: Brand Anchor */}
        <div
          className="flex items-center gap-2.5 cursor-pointer group select-none"
          onClick={() => router.push('/')}
        >
          <div className="relative h-6 w-6 overflow-hidden rounded-md flex items-center justify-center transition-transform duration-500 group-hover:rotate-[15deg]">
            <Image
              src="/logo.svg"
              alt="Instrict Logo"
              width={20}
              height={18}
              className="object-contain"
            />
          </div>
          <span className="text-sm font-black tracking-tight uppercase text-slate-950 dark:text-white">
            Instrict
          </span>
        </div>

        {/* Right Side: Campus Selector + Account */}
        <div className="flex items-center gap-3">

          <button
            onClick={handleCampusReset}
            title="Change campus"
            className="flex items-center gap-2 h-9 px-3.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800 hover:border-blue-500/40 dark:hover:border-blue-400/30 hover:bg-white dark:hover:bg-slate-950 transition-all group"
          >
            <Globe className="h-3.5 w-3.5 text-slate-400 group-hover:text-blue-500 dark:group-hover:text-blue-400 transition-colors shrink-0" />

            {/* Full name on larger screens, slug on small screens */}
            <span className="hidden sm:inline text-xs font-black tracking-tight text-slate-600 dark:text-slate-300 group-hover:text-slate-950 dark:group-hover:text-white transition-colors whitespace-nowrap">
              {campusName || (campus ? campus.toUpperCase() : "Select campus")}
            </span>
            <span className="sm:hidden text-[10px] font-black tracking-wider text-slate-600 dark:text-slate-300 uppercase">
              {campus || "SELECT"}
            </span>

            <ChevronsUpDown className="h-3 w-3 text-slate-300 dark:text-slate-600 group-hover:text-blue-500 dark:group-hover:text-blue-400 transition-colors shrink-0" />
          </button>

        </div>
      </div>
    </header>
  );
}

