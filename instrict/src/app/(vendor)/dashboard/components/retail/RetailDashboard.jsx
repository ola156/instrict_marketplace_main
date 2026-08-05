'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/utils/supabase/client';
import { LayoutDashboard, ClipboardList, Package, Wallet, Bell, Ban } from 'lucide-react';
import StoreStatusBanner from '../shared/StoreStatusBanner';
import RetailOverview from './RetailOverview';
import RetailOrders from './RetailOrders';
import ProductInventory from './ProductInventory';
import VendorSettings from '../shared/VendorSettings';
import VendorWallet from '../shared/VendorWallet';
import VendorNotifications from '../shared/VendorNotifications';
import CommunityFeed from '@/components/feed/CommunityFeed';
import VerificationBanner from '@/components/verification/VerificationBanner';
import HelpDesk from '@/components/HelpDesk';

const sectionTitle = {
  overview:      'Dashboard',
  orders:        'Orders',
  inventory:     'Inventory',
  wallet:        'Wallet',
  notifications: 'Notifications',
  settings:      'Settings',
   community:     'Community',
  help:           'Help & Support'
};

// Same rule as CanteenDashboard: store open/closed status only matters on
// sections where the vendor is actively managing live orders/listings.
// Wallet, Settings, Community, and Notifications have nothing to do with
// whether the store is open right now, so the banner is noise there.
const STORE_BANNER_SECTIONS = ['overview', 'orders', 'inventory'];

export default function RetailDashboard({ vendor, activeSection, onSectionChange, onVendorUpdate, isSuspended }) {
  const supabase = createClient();
  const [unreadCount, setUnreadCount] = useState(0);

  // Set only when a community notification is clicked (VendorNotifications
  // -> onNavigate). Handed down to CommunityFeed as highlightPostId so it
  // can scroll to and ring-highlight that specific post.
  const [highlightPostId, setHighlightPostId] = useState(null);

  // VendorNotifications has no URL to router.push to — everything here is
  // a local activeSection toggle, not a route. So instead of navigating,
  // it calls this with { section, postId? } and we flip the same state
  // the bottom nav / bell icon already use.
  const handleNotificationNavigate = (section, params) => {
    if (params?.postId) setHighlightPostId(params.postId);
    onSectionChange(section);
  };

  useEffect(() => {
    fetchUnread();
    const channel = supabase
      .channel('unread-count-retail')
      .on('postgres_changes', {
        event: '*', schema: 'public', table: 'notifications',
        filter: `vendor_id=eq.${vendor.user_id}`,
      }, () => fetchUnread())
      .subscribe();
    return () => supabase.removeChannel(channel);
  }, []);

  const fetchUnread = async () => {
    const { count } = await supabase
      .from('notifications')
      .select('*', { count: 'exact', head: true })
      .eq('vendor_id', vendor.user_id)
      .eq('is_read', false);
    setUnreadCount(count || 0);
  };

  const showStoreBanner = STORE_BANNER_SECTIONS.includes(activeSection);

  const bottomNav = [
    { label: 'Home',      section: 'overview',      icon: LayoutDashboard },
    { label: 'Orders',    section: 'orders',         icon: ClipboardList },
    { label: 'Inventory', section: 'inventory',      icon: Package },
    { label: 'Wallet',    section: 'wallet',         icon: Wallet },
    { label: 'Alerts',    section: 'notifications',  icon: Bell, badge: unreadCount },
  ];

  const renderSection = () => {
    switch (activeSection) {
      case 'overview':      return <RetailOverview vendorUserId={vendor.user_id} />;
      case 'orders':        return <RetailOrders vendorUserId={vendor.user_id} isSuspended={isSuspended} />;
      case 'inventory':     return <ProductInventory vendorUserId={vendor.user_id} isSuspended={isSuspended} />;
      case 'wallet':        return <VendorWallet vendor={vendor} isSuspended={isSuspended} />;
      case 'notifications': return <VendorNotifications vendor={vendor} onNavigate={handleNotificationNavigate} sectionMap={{ order: 'orders', payment: 'wallet' }} />;
      case 'community':     return <CommunityFeed authorType="vendor" isSuspended={isSuspended} highlightPostId={highlightPostId} />;
      case 'settings':      return <VendorSettings vendor={vendor} onUpdate={onVendorUpdate} />;
      case 'help':          return <HelpDesk authorType="vendor" vendor={vendor} />;
      default:
        return (
          <div className="flex flex-col items-center justify-center py-20 text-center border border-dashed border-slate-200 dark:border-slate-800 rounded-2xl">
            <p className="text-xs font-black text-slate-400">Coming soon</p>
          </div>
        );
    }
  };

  return (
    <div className="flex-1 flex flex-col min-h-screen bg-slate-50 dark:bg-slate-950">
      <header className="hidden md:block sticky top-0 z-30 bg-slate-50/80 dark:bg-slate-950/80 backdrop-blur-md border-b border-slate-100 dark:border-slate-800 px-8 py-3">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h1 className="text-sm font-black tracking-tight text-slate-900 dark:text-white">
              {sectionTitle[activeSection] || activeSection}
            </h1>
            <p className="text-[11px] text-slate-400">{vendor.legal_name}</p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => onSectionChange('notifications')}
              className="relative p-2 rounded-xl text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white transition-all"
            >
              <Bell className="w-5 h-5" />
              {unreadCount > 0 && (
                <span className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 bg-blue-500 text-white text-[9px] font-black rounded-full flex items-center justify-center px-1">
                  {unreadCount > 99 ? '99+' : unreadCount}
                </span>
              )}
            </button>
            {showStoreBanner && (
              <div className="w-72">
                <StoreStatusBanner isOpen={vendor.is_open} vendorUserId={vendor.user_id} disabled={isSuspended} />
              </div>
            )}
          </div>
        </div>
      </header>

      <main className="flex-1 px-4 md:px-8 pt-[72px] md:pt-6 py-4 md:py-6 pb-28 md:pb-10">
        {/* Mobile: status banner sits inside main's top padding, only when relevant */}
        {showStoreBanner && (
          <div className="md:hidden mb-2">
            <StoreStatusBanner isOpen={vendor.is_open} vendorUserId={vendor.user_id} disabled={isSuspended} />
          </div>
        )}

        {isSuspended && (
          <div className="flex items-start gap-2.5 rounded-2xl border border-rose-500/20 bg-rose-500/5 px-4 py-3.5 mb-4">
            <Ban className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
            <div>
              <p className="text-xs font-black text-rose-600 dark:text-rose-400">Your store is suspended</p>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                {vendor.suspended_reason || 'Contact support for more information.'}
                {' '}You can still view existing orders, but new orders, inventory changes, and community posts are locked until this is resolved.
              </p>
            </div>
          </div>
        )}

        <VerificationBanner role="vendor" userId={vendor.user_id} />

        <div className={activeSection === 'settings' || activeSection === 'wallet' ? 'w-full flex-1 min-h-screen bg-white dark:bg-slate-950 overflow-y-auto' : 'max-w-6xl mx-auto'}>
          {renderSection()}
        </div>
      </main>

      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white dark:bg-slate-950 border-t border-slate-100 dark:border-slate-800 px-1 py-2 flex items-center justify-around">
        {bottomNav.map(({ label, section, icon: Icon, badge }) => {
          const isActive = activeSection === section;
          return (
            <button
              key={section}
              onClick={() => onSectionChange(section)}
              className={`relative flex flex-col items-center gap-1 px-3 py-1.5 rounded-xl transition-all ${
                isActive ? 'text-blue-600 dark:text-blue-400' : 'text-slate-400 dark:text-slate-500'
              }`}
            >
              <Icon className="w-5 h-5" />
              {badge > 0 && (
                <span className="absolute -top-0.5 right-1 min-w-[15px] h-[15px] bg-blue-500 text-white text-[8px] font-black rounded-full flex items-center justify-center px-1">
                  {badge > 99 ? '99+' : badge}
                </span>
              )}
              <span className="text-[10px] font-black tracking-tight leading-none">{label}</span>
            </button>
          );
        })}
      </nav>
    </div>
  );
}