'use client';

import { useCampusStore } from '@/store/useCampusStore';
import { useRouter } from 'next/navigation';
import { User, Globe, LayoutGrid, LogOut } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import Image from 'next/image';

export default function Header({ user, onLogout }) {
  const { campus } = useCampusStore();
  const router = useRouter();

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
              className="  object-contain"
            />
          </div>
          <span className="text-sm font-black tracking-tight uppercase text-slate-950 dark:text-white">
            Instrict
          </span>
        </div>

        {/* Right Side: Action Interface Elements */}
        <div className="flex items-center gap-4">
          
          {/* Perimeter Scope Selector Button */}
          <button
            onClick={handleCampusReset}
            className="flex items-center gap-2 h-9 px-3.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800 hover:border-blue-500/40 dark:hover:border-blue-400/30 hover:bg-white dark:hover:bg-slate-950 transition-all group"
          >
            <Globe className="h-3.5 w-3.5 text-slate-400 group-hover:text-blue-500 dark:group-hover:text-blue-400 transition-colors" />
            <span className="text-[10px] font-black tracking-wider text-slate-600 dark:text-slate-300 uppercase">
              {campus ? (
                <>
                  <span className="md:hidden">{campus}</span>
                  <span className="hidden md:inline">{campus}</span>
                </>
              ) : (
                "SELECT CAMPUS"
              )}
            </span>
          </button>
          
          {user && <UserProfileDropdown user={user} onLogout={onLogout} />}
        </div>
      </div>
    </header>
  );
}

function UserProfileDropdown({ user, onLogout }) {
  const router = useRouter();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button className="h-9 w-9 rounded-xl overflow-hidden border border-slate-100 dark:border-slate-900 bg-slate-50 dark:bg-slate-900 flex items-center justify-center text-slate-700 dark:text-slate-300 outline-none transition-all hover:border-slate-300 dark:hover:border-slate-700">
          {user.avatar ? (
            <Image src={user.avatar} alt="Avatar" width={36} height={36} className="object-cover h-full w-full" />
          ) : (
            <User className="h-4 w-4" />
          )}
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56 rounded-xl mt-1 border-slate-100 dark:border-slate-900 bg-white dark:bg-slate-950 shadow-xl">
        <DropdownMenuLabel className="font-normal p-3">
          <div className="flex flex-col space-y-1">
            <p className="text-xs font-bold leading-none text-slate-900 dark:text-white">{user.name || 'Student User'}</p>
            <p className="text-[10px] leading-none text-slate-400 mt-0.5 truncate">{user.email}</p>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator className="bg-slate-100 dark:bg-slate-900" />
        <DropdownMenuItem onClick={() => router.push('/dashboard')} className="text-xs font-medium p-2.5 rounded-lg cursor-pointer flex items-center gap-2 focus:bg-slate-50 dark:focus:bg-slate-900">
          <LayoutGrid className="w-3.5 h-3.5 text-slate-400" /> User Dashboard
        </DropdownMenuItem>
        <DropdownMenuSeparator className="bg-slate-100 dark:bg-slate-900" />
        <DropdownMenuItem onClick={onLogout} className="text-xs font-medium p-2.5 rounded-lg cursor-pointer flex items-center gap-2 text-red-600 focus:bg-red-50 dark:focus:bg-red-950/20 focus:text-red-600">
          <LogOut className="w-3.5 h-3.5" /> Log Out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}