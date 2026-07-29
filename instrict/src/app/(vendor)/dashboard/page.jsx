'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/utils/supabase/client';
import { Ban } from 'lucide-react';
import Sidebar from './components/shared/Sidebar';
import VendorHelpButton from './components/shared/VendorHelpButton';
import CanteenDashboard from './components/canteen/CanteenDashboard';
import RetailDashboard from './components/retail/RetailDashboard';
import FixedServiceDashboard from './components/service-fixed/FixedServiceDashboard';
import VariableServiceDashboard from './components/service-variable/VariableServiceDashboard';
import { usePushNotifications } from '@/hooks/usePushNotifications';

export default function DashboardPage() {
  const router = useRouter();
  const supabase = createClient();
  const [vendor, setVendor] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeSection, setActiveSection] = useState('overview');

usePushNotifications(vendor?.user_id, { table: 'vendor_profiles', idColumn: 'user_id' });

  const isSuspended = vendor?.account_status === 'suspended';

  useEffect(() => { fetchVendor(); }, []);

  const fetchVendor = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { router.push('/auth/vendor'); return; }

    const { data: vendorProfile, error } = await supabase
      .from('vendor_profiles')
      .select('*')
      .eq('user_id', user.id)
      .single();

    if (error || !vendorProfile) { router.push('/onboarding/vendor'); return; }
    if (!vendorProfile.phone_verified) { router.push('/onboarding/vendor'); return; }

    setVendor(vendorProfile);
    setLoading(false);
  };

  const handleVendorUpdate = (updatedVendor) => setVendor(updatedVendor);

  const handleRealtimeUpdate = useCallback((payload) => {
    setVendor((prev) => (prev ? { ...prev, ...payload.new } : prev));
  }, []);

  useEffect(() => {
    if (!vendor?.user_id) return;
    const channel = supabase
      .channel('vendor-account-status')
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'vendor_profiles', filter: `user_id=eq.${vendor.user_id}` },
        handleRealtimeUpdate
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [vendor?.user_id, handleRealtimeUpdate, supabase]);

  if (loading) {
    return (
      <div className="h-screen w-full flex items-center justify-center bg-slate-50 dark:bg-slate-950">
        <div className="space-y-3 text-center">
          <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-[11px] text-slate-400 font-medium">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  const renderDashboard = () => {
    switch (vendor.category) {
      case 'canteen':
        return (
          <CanteenDashboard
            vendor={vendor}
            activeSection={activeSection}
            onSectionChange={setActiveSection}
            onVendorUpdate={handleVendorUpdate}
            isSuspended={isSuspended}
          />
        );
      case 'retail':
        return (
          <RetailDashboard
            vendor={vendor}
            activeSection={activeSection}
            onSectionChange={setActiveSection}
            onVendorUpdate={handleVendorUpdate}
            isSuspended={isSuspended}
          />
        );
      case 'service':
        if (vendor.service_subtype === 'fixed') {
          return (
            <FixedServiceDashboard
              vendor={vendor}
              activeSection={activeSection}
              onSectionChange={setActiveSection}
              onVendorUpdate={handleVendorUpdate}
              isSuspended={isSuspended}
            />
          );
        }
        return (
          <VariableServiceDashboard
            vendor={vendor}
            activeSection={activeSection}
            onSectionChange={setActiveSection}
            onVendorUpdate={handleVendorUpdate}
            isSuspended={isSuspended}
          />
        );
      default:
        return null;
    }
  };

  return (
    <div className="flex min-h-screen w-full bg-slate-50 dark:bg-slate-950 text-slate-950 dark:text-white antialiased">
      <Sidebar
        category={vendor.category}
        serviceSubtype={vendor.service_subtype}
        activeSection={activeSection}
        onSectionChange={setActiveSection}
        vendorName={vendor.legal_name}
      />
      <div className="flex-1 flex flex-col">
        {renderDashboard()}
      </div>
      <VendorHelpButton />
    </div>
  );
}