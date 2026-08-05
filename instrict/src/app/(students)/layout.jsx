'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { createClient } from '@/utils/supabase/client';
import { useCartStore } from '@/store/useCartStore';
import CheckoutBasket from '@/components/cart/CheckoutBasket';
import NotificationCenter from '@/components/notifications/NotificationCenter';
import HelpDesk from '@/components/HelpDesk';
import { usePushNotifications } from '@/hooks/usePushNotifications';
import {
  Home, ShoppingBag, User, Bell, LogOut,
  Rss, ShoppingCart, X, Bike, ArrowRight,
  MessageCircle,
} from 'lucide-react';
import Image from 'next/image';

const navTabs = [
  { name: 'Home',      href: '/home',      icon: Home },
  { name: 'Community', href: '/community', icon: Rss },
  { name: 'Orders',    href: '/orders',    icon: ShoppingBag },
  { name: 'Errands',   href: '/errands',   icon: Bike },
  { name: 'Profile',   href: '/profile',   icon: User },
];

export default function StudentLayout({ children }) {
  const pathname = usePathname();
  const router = useRouter();
  const supabase = createClient();
  const { items } = useCartStore();
  const cartCount = items.reduce((s, i) => s + i.quantity, 0);

  const [mobileCartOpen, setMobileCartOpen]   = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showHelpDesk, setShowHelpDesk] = useState(false);
  const [profile, setProfile] = useState(null);
  const [unreadCount, setUnreadCount] = useState(0);
  // Nothing in this layout renders until this flips true — otherwise the
  // full sidebar/nav/children render immediately while fetchProfile is
  // still checking auth, and only redirect after the fact. That's a
  // visible flash of the authenticated shell for anyone not logged in,
  // even if only for a moment.
  const [authChecked, setAuthChecked] = useState(false);

  // IMPORTANT: keyed on user_id (auth uid), not profile.id — the
  // notifications table stores the recipient id as the auth uid, so the
  // push token has to live under that same key or the sender will never
  // find it. This used to pass profile?.id with idColumn 'id', which saved
  // the token under student_profiles' own primary key instead — a
  // different value from user_id, so tokens were silently unfindable by
  // anything looking up a recipient by auth id.
  usePushNotifications(profile?.user_id, { table: 'student_profiles', idColumn: 'user_id' });

  useEffect(() => { fetchProfile(); fetchUnread(); }, []);

  const fetchProfile = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { router.push('/auth/student'); return; } // authChecked stays false — layout never renders
    const { data } = await supabase
      .from('student_profiles')
      .select('id, user_id, full_name, avatar_url')
      .eq('user_id', user.id)
      .single();
    setProfile(data);
    setAuthChecked(true);
  };

  const fetchUnread = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { count } = await supabase
      .from('notifications')
      .select('*', { count: 'exact', head: true })
      .eq('vendor_id', user.id)
      .eq('is_read', false);
    setUnreadCount(count || 0);
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/auth/student');
  };

  const firstName = profile?.full_name?.split(' ')[0] || 'Student';

  if (!authChecked) {
    return (
      <div className="h-screen w-full flex items-center justify-center bg-slate-50 dark:bg-slate-950">
        <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen w-full bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-50 antialiased flex flex-col overflow-x-hidden">

      {/* ── Mobile top bar ── */}
      <header className="lg:hidden sticky top-0 z-40 w-full bg-white dark:bg-slate-900 border-b border-slate-100 dark:border-slate-800 px-4 py-3 flex items-center justify-between">
        <div className="flex items-center  gap-2 min-w-0">
          {profile?.avatar_url
            ? <img src={profile.avatar_url} alt={firstName} className="w-9 h-9 rounded-full object-cover ring-2 ring-blue-500/20 shrink-0" />
            : <div className="w-9 h-9 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center shrink-0">
                <span className="text-white text-xs font-black">{firstName[0]}</span>
              </div>
          }
          <div className="min-w-0 mt-1">
            <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider leading-none">Welcome back</p>
            <p className="text-sm font-black text-slate-900 dark:text-white mt-0.5 truncate">{firstName}</p>
          </div>
        </div>

        <div className="flex items-center gap-0.5">
          {/* Cart */}
          <button
            onClick={() => { setMobileCartOpen(true); setShowNotifications(false); }}
            className="relative p-2 rounded-xl text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <ShoppingCart className="w-5 h-5" />
            {cartCount > 0 && (
              <span className="absolute top-1 right-1 min-w-[16px] h-4 bg-blue-500 text-white text-[9px] font-black rounded-full flex items-center justify-center px-1">
                {cartCount}
              </span>
            )}
          </button>

          {/* Community */}
          <Link href="/community"
            onClick={() => setShowNotifications(false)}
            className={`p-2 rounded-xl transition-colors ${pathname === '/community' ? 'bg-blue-500/10 text-blue-600' : 'text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800'}`}
          >
            <Rss className="w-5 h-5" />
          </Link>

          {/* Notifications */}
          <button
            onClick={() => setShowNotifications(p => !p)}
            className={`relative p-2 rounded-xl transition-colors ${showNotifications ? 'bg-blue-500/10 text-blue-600' : 'text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800'}`}
          >
            <Bell className="w-5 h-5" />
            {unreadCount > 0 && (
              <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-rose-500 rounded-full" />
            )}
          </button>
        </div>
      </header>

      {/* ── Mobile cart drawer ── */}
      {mobileCartOpen && (
        <div className="lg:hidden fixed inset-0 z-50 flex justify-end">
          <div onClick={() => setMobileCartOpen(false)} className="absolute inset-0 bg-slate-950/40 backdrop-blur-sm" />
          <div className="relative w-full max-w-[320px] h-full bg-white dark:bg-slate-950 shadow-2xl flex flex-col animate-in slide-in-from-right duration-200">
            <div className="flex items-center justify-between px-4 py-3.5 border-b border-slate-100 dark:border-slate-900 shrink-0">
              <span className="text-xs font-black text-slate-900 dark:text-white uppercase flex items-center gap-2">
                <ShoppingCart className="w-4 h-4 text-blue-500" /> Basket
              </span>
              <button onClick={() => setMobileCartOpen(false)} className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-900">
                <X className="w-4 h-4" />
              </button>
            </div>
           <div className="flex-1 p-4 overflow-hidden">
  <CheckoutBasket isMobile={true} onClose={() => setMobileCartOpen(false)} />
</div>
          </div>
        </div>
      )}

      {/* ── Help Desk panel ── */}
      {showHelpDesk && (
        <div className="fixed inset-0 z-50 flex items-end lg:items-center justify-center lg:justify-end">
          <div onClick={() => setShowHelpDesk(false)} className="absolute inset-0 bg-slate-950/40 backdrop-blur-sm" />
          <div className="relative w-full lg:w-[420px] lg:mr-6 max-h-[85vh] lg:max-h-[80vh] lg:mb-6 bg-white dark:bg-slate-950 rounded-t-3xl lg:rounded-3xl shadow-2xl flex flex-col animate-in slide-in-from-bottom lg:slide-in-from-bottom-4 duration-200 overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3.5 border-b border-slate-100 dark:border-slate-900 shrink-0">
              <span className="text-xs font-black text-slate-900 dark:text-white uppercase flex items-center gap-2">
                <MessageCircle className="w-4 h-4 text-blue-500" /> Support
              </span>
              <button onClick={() => setShowHelpDesk(false)} className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-900">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="flex-1 p-4 overflow-y-auto">
              <HelpDesk authorType="student" />
            </div>
          </div>
        </div>
      )}

      {/* ── Desktop three-column layout ── */}
      <div className="flex-1 w-full max-w-7xl mx-auto flex lg:px-6 xl:px-8 lg:gap-6 xl:gap-8">

        {/* LEFT — Sidebar */}
        <aside className="hidden lg:flex w-60 xl:w-64 flex-col justify-between py-8 h-screen sticky top-0 shrink-0 border-r border-slate-100 dark:border-slate-900 pr-4 xl:pr-6">
          <div className="space-y-6">
            {/* Logo */}
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

            {/* Profile card */}
            <div className="p-3 rounded-2xl bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 flex items-center gap-3">
              {profile?.avatar_url
                ? <img src={profile.avatar_url} alt={firstName} className="w-10 h-10 rounded-full object-cover ring-2 ring-blue-500/10 shrink-0" />
                : <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center shrink-0">
                    <span className="text-white text-sm font-black">{firstName[0]}</span>
                  </div>
              }
              <div className="min-w-0">
                <p className="text-[9px] font-black tracking-widest text-blue-600 dark:text-blue-400 uppercase">Student</p>
                <p className="text-xs font-black text-slate-900 dark:text-white mt-0.5 truncate">{profile?.full_name || 'Loading...'}</p>
              </div>
            </div>

            {/* Nav */}
            <nav className="space-y-0.5">
              {navTabs.map(({ name, href, icon: Icon }) => {
                const active = pathname === href && !showNotifications;
                return (
                  <Link key={name} href={href}
                    onClick={() => setShowNotifications(false)}
                    className={`w-full h-10 px-3 rounded-xl flex items-center justify-between group text-xs font-bold tracking-tight transition-all ${
                      active
                        ? 'bg-blue-600 text-white shadow-sm shadow-blue-600/20'
                        : 'text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-900 hover:text-slate-900 dark:hover:text-white'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <Icon className="w-4 h-4 shrink-0" />
                      <span>{name}</span>
                    </div>
                    {!active && <ArrowRight className="w-3.5 h-3.5 opacity-0 -translate-x-1 group-hover:opacity-100 group-hover:translate-x-0 transition-all text-slate-400" />}
                  </Link>
                );
              })}

              {/* Notifications in sidebar */}
              <button
                onClick={() => setShowNotifications(p => !p)}
                className={`w-full h-10 px-3 rounded-xl flex items-center justify-between group text-xs font-bold tracking-tight transition-all ${
                  showNotifications
                    ? 'bg-blue-600 text-white shadow-sm shadow-blue-600/20'
                    : 'text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-900 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <Bell className="w-4 h-4 shrink-0" />
                  <span>Notifications</span>
                </div>
                {unreadCount > 0 && (
                  <span className="min-w-[18px] h-[18px] bg-rose-500 text-white text-[9px] font-black rounded-full flex items-center justify-center px-1">
                    {unreadCount}
                  </span>
                )}
              </button>
            </nav>
          </div>

          <button onClick={handleLogout}
            className="w-full h-10 px-3 rounded-xl flex items-center gap-2.5 text-xs font-bold text-slate-400 hover:bg-rose-500/5 hover:text-rose-500 transition-all">
            <LogOut className="w-4 h-4" />
            Log out
          </button>
        </aside>

        {/* CENTER — Main content */}
        <main className="flex-1 min-w-0 lg:px-0 py-3 lg:py-8 pb-24 lg:pb-8 overflow-y-auto h-screen scrollbar-none">
          {showNotifications
            ? <NotificationCenter onNavigate={() => setShowNotifications(false)} portal="student" />
            : children
          }
        </main>

        {/* RIGHT — Basket shelf (desktop only) */}
        <aside className="hidden xl:flex w-72 flex-col py-8 h-screen sticky top-0 shrink-0 pl-6 border-l border-slate-100 dark:border-slate-900">
          <div className="flex items-center justify-between mb-4 shrink-0">
            <h4 className="text-[10px] font-black uppercase tracking-wider text-slate-400">Activity Desk</h4>
            <button
              onClick={() => setShowNotifications(p => !p)}
              className={`relative p-2 rounded-xl border transition-all ${
                showNotifications
                  ? 'bg-blue-500/10 text-blue-600 border-blue-500/20'
                  : 'bg-white dark:bg-slate-900 border-slate-100 dark:border-slate-800 text-slate-500'
              }`}
            >
              <Bell className="w-3.5 h-3.5" />
              {unreadCount > 0 && <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 bg-rose-500 rounded-full" />}
            </button>
          </div>

          <div className="flex-1 p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 flex flex-col overflow-hidden">
            <div className="flex items-center gap-2 pb-3 border-b border-slate-100 dark:border-slate-800 shrink-0">
              <ShoppingBag className="w-4 h-4 text-blue-500" />
              <span className="text-xs font-black text-slate-900 dark:text-white uppercase tracking-tight">Basket</span>
              {cartCount > 0 && (
                <span className="ml-auto min-w-[18px] h-[18px] bg-blue-500 text-white text-[9px] font-black rounded-full flex items-center justify-center px-1">
                  {cartCount}
                </span>
              )}
            </div>
            <div className="flex-1 overflow-hidden min-h-0 mt-3">
              <CheckoutBasket isMobile={false} />
            </div>
          </div>
        </aside>
      </div>

      {/* ── Mobile bottom nav ── */}
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-t border-slate-100 dark:border-slate-800">
        <div className="flex items-center justify-around px-2 h-16">
          {navTabs.filter(t => t.name !== 'Community').map(({ name, href, icon: Icon }) => {
            const active = pathname === href && !showNotifications;
            return (
              <Link key={name} href={href}
                onClick={() => setShowNotifications(false)}
                className="flex flex-col items-center gap-1 px-3 py-1.5 rounded-xl relative group"
              >
                <Icon className={`w-5 h-5 transition-colors ${active ? 'text-blue-600 dark:text-blue-400' : 'text-slate-400'}`} />
                <span className={`text-[9px] font-black tracking-tight ${active ? 'text-blue-600 dark:text-blue-400' : 'text-slate-400'}`}>
                  {name}
                </span>
                {active && <span className="absolute bottom-0.5 w-1 h-1 bg-blue-500 rounded-full" />}
              </Link>
            );
          })}
        </div>
      </nav>

      {/* ── Floating support button ── */}
      <button
        onClick={() => { setShowHelpDesk(true); setShowNotifications(false); }}
        aria-label="Support"
        className="fixed bottom-20 lg:bottom-6 right-4 lg:right-6 z-40 w-14 h-14 rounded-full bg-blue-600 hover:bg-blue-700 text-white shadow-lg shadow-blue-600/30 flex items-center justify-center transition-all hover:scale-105 active:scale-95"
      >
        <MessageCircle className="w-6 h-6" />
      </button>
    </div>
  );
}