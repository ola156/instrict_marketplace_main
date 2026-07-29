'use client';

import { useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  UtensilsCrossed,
  ClipboardList,
  Wallet,
  Bell,
  Settings,
  LogOut,
  Rss,
  Menu,
  X,
  ChevronRight,MessageSquare,MessageCircle, Briefcase, Tags, Calendar
} from 'lucide-react';
import { Image as ImageIcon } from 'lucide-react';
import { createClient } from '@/utils/supabase/client';
import Image from 'next/image';

const canteenNav = [
  { label: 'Overview',        icon: LayoutDashboard, section: 'overview' },
  { label: 'Live Kitchen',    icon: UtensilsCrossed,  section: 'kitchen' },
  { label: 'Menu',            icon: ClipboardList,    section: 'menu' },
  { label: 'Wallet',          icon: Wallet,           section: 'wallet' },
  { label: 'Notifications',   icon: Bell,             section: 'notifications' },
  { label: 'Community',       icon: Rss,              section: 'community' },
  { label: 'Settings',        icon: Settings,         section: 'settings' },
 
];

const retailNav = [
  { label: 'Overview',        icon: LayoutDashboard, section: 'overview' },
  { label: 'Orders',          icon: ClipboardList,    section: 'orders' },
  { label: 'Inventory',       icon: ClipboardList,    section: 'inventory' },
  { label: 'Wallet',          icon: Wallet,           section: 'wallet' },
  { label: 'Notifications',   icon: Bell,             section: 'notifications' },
  { label: 'Community',       icon: Rss,              section: 'community' },
  { label: 'Settings',        icon: Settings,         section: 'settings' },
];
const serviceFixedNav = [
  { label: 'Overview',      icon: LayoutDashboard, section: 'overview' },
  { label: 'Incoming Jobs', icon: ClipboardList,   section: 'orders' },
  { label: 'Price Matrix',  icon: Tags,            section: 'pricing' },
  { label: 'Portfolio',     icon: ImageIcon,       section: 'portfolio' },
  { label: 'Wallet',        icon: Wallet,          section: 'wallet' },
  { label: 'Notifications', icon: Bell,            section: 'notifications' },
  { label: 'Community',     icon: Rss,             section: 'community' },
  { label: 'Settings',      icon: Settings,        section: 'settings' },
];

const serviceVariableNav = [
  { label: 'Overview',      icon: LayoutDashboard, section: 'overview' },
  { label: 'Active Projects',icon: Briefcase,      section: 'projects' },
  { label: 'Portfolio',     icon: ImageIcon,       section: 'portfolio' },
  { label: 'Wallet',        icon: Wallet,          section: 'wallet' },
  { label: 'Notifications', icon: Bell,            section: 'notifications' },
  { label: 'Community',     icon: Rss,             section: 'community' },
  { label: 'Settings',      icon: Settings,        section: 'settings' }, 
];

export default function Sidebar({ category, activeSection, serviceSubtype, onSectionChange, vendorName }) {

    const navByCategory = {
    canteen: canteenNav,
    retail:  retailNav,
    service: serviceSubtype === 'fixed' ? serviceFixedNav : serviceVariableNav,
  };

  const router = useRouter();
  const supabase = createClient();
  const [mobileOpen, setMobileOpen] = useState(false);
  const navItems = navByCategory[category] || canteenNav;

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/auth/vendor');
  };

  const SidebarContent = () => (
    <div className="flex flex-col h-full">
      {/* Logo */}
      <div className="px-5 pt-6 pb-5 border-b border-slate-100 dark:border-slate-800 ">
        <div className="flex items-center gap-1">
        <div className="relative h-6 w-6 overflow-hidden rounded-md flex items-center justify-center transition-transform duration-500 group-hover:rotate-[15deg]">
                      <Image
                        src="/logo.svg" 
                        alt="Instrict Logo" 
                        width={20} 
                        height={18} 
                        className="object-contain"
                      />
                    </div> 
        <span className="text-base font-black tracking-tighter text-slate-900 dark:text-white">
          Instrict<span className="text-blue-500">.</span>
        </span> </div>
        {vendorName && (
          <p className="text-[10px] text-slate-400 font-medium mt-0.5 truncate">{vendorName}</p>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
        {navItems.map(({ label, icon: Icon, section }) => {
          const isActive = activeSection === section;
          return (
            <button
              key={section}
              onClick={() => {
                onSectionChange(section);
                setMobileOpen(false);
              }}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition-all duration-150 group ${
                isActive
                  ? 'bg-blue-600 text-white shadow-sm shadow-blue-600/20'
                  : 'text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/60 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <Icon className="w-4 h-4 shrink-0" />
              <span className="text-xs font-bold tracking-tight">{label}</span>
              {isActive && <ChevronRight className="w-3 h-3 ml-auto opacity-60" />}
            </button>
          );
        })}
      </nav>

      {/* Logout */}
      <div className="px-3 pb-5 pt-2 border-t border-slate-100 dark:border-slate-800">
        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-slate-400 hover:bg-rose-50 dark:hover:bg-rose-500/10 hover:text-rose-500 transition-all duration-150"
        >
          <LogOut className="w-4 h-4 shrink-0" />
          <span className="text-xs font-bold tracking-tight">Log out</span>
        </button>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop sidebar */}
      <aside className="hidden md:flex flex-col w-56 shrink-0 h-screen sticky top-0 bg-white dark:bg-slate-950 border-r border-slate-100 dark:border-slate-800">
        <SidebarContent />
      </aside>

      {/* Mobile top bar */}
      <div className="md:hidden fixed top-0 left-0 right-0 z-40 flex items-center justify-between px-4 h-14 bg-white dark:bg-slate-950 border-b border-slate-100 dark:border-slate-800">
         <div className="flex items-center gap-1">
        <div className="relative h-6 w-6 overflow-hidden rounded-md flex items-center justify-center transition-transform duration-500 group-hover:rotate-[15deg]">
                      <Image
                        src="/logo.svg" 
                        alt="Instrict Logo" 
                        width={20} 
                        height={18} 
                        className="object-contain"
                      />
                    </div> 
        <span className="text-base font-black tracking-tighter text-slate-900 dark:text-white">
          Instrict<span className="text-blue-500">.</span>
        </span> </div>
        <button
          onClick={() => setMobileOpen(true)}
          className="p-2 rounded-lg text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"
        >
          <Menu className="w-5 h-5" />
        </button>
      </div>

      {/* Mobile drawer */}
      {mobileOpen && (
        <div className="md:hidden fixed inset-0 z-50 flex">
          <div
            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            onClick={() => setMobileOpen(false)}
          />
          <aside className="relative w-64 h-full bg-white dark:bg-slate-950 border-r border-slate-100 dark:border-slate-800 shadow-2xl">
            <button
              onClick={() => setMobileOpen(false)}
              className="absolute top-4 right-4 p-1.5 rounded-lg text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
            >
              <X className="w-4 h-4" />
            </button>
            <SidebarContent />
          </aside>
        </div>
      )}
    </>
  );
}