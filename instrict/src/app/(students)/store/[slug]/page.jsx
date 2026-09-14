'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { createClient } from '@/utils/supabase/client';
import { Ban, AlertTriangle, ShieldAlert, ChevronLeft } from 'lucide-react';
import CanteenStore from '../[slug]/components/CanteenStore';
import RetailStore from '../[slug]/components/RetailStore';
import ServiceStore from '../[slug]/components/ServiceStore';

const MIN_CATALOGUE_ITEMS = 2;
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// Returns a Supabase query builder for counting this vendor's catalogue,
// or null if the category isn't recognized. Kept in one place so the three
// store components can't quietly drift out of sync with each other again
// (retail filters is_available, canteen doesn't — that's intentional, matches
// each component's own product-fetching query).
function buildCatalogueQuery(supabase, vendor) {
  switch (vendor.category) {
    case 'canteen':
      return supabase
        .from('menu_items')
        .select('id')
        .eq('vendor_id', vendor.user_id);
    case 'retail':
      return supabase
        .from('menu_items')
        .select('id')
        .eq('vendor_id', vendor.user_id)
        .eq('is_available', true);
    case 'service': {
      const table = vendor.sub_categories?.includes('Printing & Photocopying')
        ? 'service_price_matrix'
        : 'portfolio_items';
      return supabase
        .from(table)
        .select('*', { count: 'exact', head: false })
        .eq('vendor_id', vendor.user_id);
    }
    default:
      return null;
  }
}

export default function StorePage() {
  const { slug } = useParams();
  const router = useRouter();
  const supabase = createClient();

  const [vendor, setVendor] = useState(null);
  const [studentSuspended, setStudentSuspended] = useState(false);
  const [eligible, setEligible] = useState(true);
  const [loading, setLoading] = useState(true);

  useEffect(() => { fetchData(); }, [slug]);

  const fetchData = async () => {
    // Legacy links (shared before slugs existed) point at the raw user_id.
    // Look up by whichever column the param actually matches.
    const isLegacyIdLink = UUID_RE.test(slug);

    const [{ data: { user } }, vendorRes] = await Promise.all([
      supabase.auth.getUser(),
      supabase
        .from('vendor_profiles')
        .select('user_id,legal_name,slug,avatar_url,banner_url,is_open,category,sub_categories,support_phone,account_status,approved')
        .eq(isLegacyIdLink ? 'user_id' : 'slug', slug)
        .maybeSingle(),
    ]);

    const vendorData = vendorRes.data || null;

    // Canonicalize: bounce old UUID links to the slug URL so links people
    // copy going forward are always the readable version.
    if (vendorData && isLegacyIdLink && vendorData.slug) {
      router.replace(`/store/${vendorData.slug}`);
      return;
    }

    setVendor(vendorData);

    const studentCheck = user
      ? supabase
          .from('student_profiles')
          .select('account_status')
          .eq('user_id', user.id)
          .maybeSingle()
      : Promise.resolve({ data: null });

    const catalogueQuery = vendorData ? buildCatalogueQuery(supabase, vendorData) : null;
    const catalogueCheck = catalogueQuery ?? Promise.resolve({ data: null, error: null });

    const [{ data: studentProfile }, { data: countItems, error: countError }] =
      await Promise.all([studentCheck, catalogueCheck]);

    if (countError) {
      console.error(`${vendorData?.category} catalogue count fetch error:`, countError.message);
    }
    setStudentSuspended(studentProfile?.account_status === 'suspended');

    if (vendorData) {
      const catalogueOk = catalogueQuery ? (countItems || []).length >= MIN_CATALOGUE_ITEMS : true;
      setEligible(!!vendorData.approved && catalogueOk);
    }

    setLoading(false);
  };

  if (loading) return null; // or a shared skeleton if you want one that fits all 3

  if (!vendor || vendor.account_status === 'suspended') {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center px-4">
        <span className="text-4xl mb-3">🔍</span>
        <p className="text-sm font-black text-slate-900 dark:text-white">Vendor not found</p>
        <button onClick={() => router.back()} className="mt-3 text-xs font-black text-blue-500">
          Go back
        </button>
      </div>
    );
  }

  if (!eligible) {
    return (
      <div className="min-h-screen w-full flex flex-col items-center justify-center px-6 text-center bg-slate-50 dark:bg-slate-950">
        <button
          onClick={() => router.back()}
          className="absolute top-5 left-4 h-9 w-9 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>
        <ShieldAlert className="w-10 h-10 text-amber-500 mb-3" />
        <p className="text-sm font-black text-slate-900 dark:text-white">This store isn't available right now</p>
        <p className="text-xs text-slate-400 mt-1 max-w-xs">
          It may still be under review or hasn't finished setting up.
        </p>
      </div>
    );
  }

  // Ordering is blocked if the store is closed OR the student's own account
  // is suspended. Vendor-suspended is handled above (store doesn't render at
  // all in that case). Vendor-ineligible (unapproved / no catalogue) is also
  // handled above.
  const canOrder = vendor.is_open && !studentSuspended;

  const orderingBlockedReason = studentSuspended
    ? { icon: Ban, title: 'Your account is suspended', detail: 'Contact support to resolve this before placing new orders.' }
    : !vendor.is_open
    ? { icon: AlertTriangle, title: 'This store is closed', detail: 'You can browse, but ordering is disabled until they reopen.' }
    : null;

  const storeProps = { vendor, canOrder, orderingBlockedReason };

  if (vendor.category === 'canteen') return <CanteenStore {...storeProps} />;
  if (vendor.category === 'retail') return <RetailStore {...storeProps} />;
  if (vendor.category === 'service') return <ServiceStore {...storeProps} />;

  return null; // unknown category fallback
}