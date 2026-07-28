'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/utils/supabase/client';
import { ChevronLeft, ChevronRight, Search } from 'lucide-react';

function cn(...c) { return c.filter(Boolean).join(' '); }

// ─── Avatar placeholder (same pattern as Home) ────────────────────────────────
const GRADS = [
  ['#2563EB','#1d4ed8'],['#7c3aed','#6d28d9'],['#0891b2','#0e7490'],
  ['#059669','#047857'],['#d97706','#b45309'],['#dc2626','#b91c1c'],
];
const EMOJIS = ['🍛','🍜','🍔','🥗','🍝','🥘','🍱','🌮'];
function AvatarPlaceholder({ name = '' }) {
  const i = name.split('').reduce((a, c) => a + c.charCodeAt(0), 0);
  const [from, to] = GRADS[i % GRADS.length];
  return (
    <div
      className="w-14 h-14 rounded-2xl flex items-center justify-center shrink-0 text-2xl"
      style={{ background: `linear-gradient(135deg,${from},${to})` }}
    >
      {EMOJIS[i % EMOJIS.length]}
    </div>
  );
}

// ─── Placeholder rating/time (no real columns yet — hardcoded per-vendor for variety) ──
const RATINGS = [4.8, 4.6, 4.9, 4.5, 4.7, 4.4];
const TIMES = ['15-25 min', '20-30 min', '10-20 min', '25-35 min', '15-20 min'];
function fakeRating(name = '') {
  const i = name.split('').reduce((a, c) => a + c.charCodeAt(0), 0);
  return RATINGS[i % RATINGS.length];
}
function fakeTime(name = '') {
  const i = name.split('').reduce((a, c) => a + c.charCodeAt(0), 0);
  return TIMES[i % TIMES.length];
}

const FILTERS = ['All', 'Open Now', 'Top Rated', 'Fastest'];

// Vendors must be approved (vendor_profiles.approved = true, kept in sync
// with vendor_verifications via a DB trigger) AND have at least this many
// items in their catalogue to be shown.
const MIN_CATALOGUE_ITEMS = 2;

export default function AllCanteens() {
  const router = useRouter();
  const supabase = createClient();

  const [vendors, setVendors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState('All');

  useEffect(() => { fetchCanteens(); }, []);

  const fetchCanteens = async () => {
    const { data: vendorsData, error: vendorsError } = await supabase
      .from('vendor_profiles')
      .select('user_id,legal_name,avatar_url,sub_categories,is_open')
      .eq('category', 'canteen')
      .eq('phone_verified', true)
      .eq('approved', true)
      .neq('account_status', 'suspended')
      .order('is_open', { ascending: false });

    if (vendorsError) {
      console.error('vendor_profiles fetch error:', vendorsError.message);
      setVendors([]);
      setLoading(false);
      return;
    }

    const list = vendorsData || [];
    if (list.length === 0) {
      setVendors([]);
      setLoading(false);
      return;
    }

    const vendorIds = list.map((v) => v.user_id);

    // Only need catalogue counts now — approval is already filtered
    // in the query above via vendor_profiles.approved.
    const { data: menuItems, error: menuItemsError } = await supabase
      .from('menu_items')
      .select('vendor_id')
      .in('vendor_id', vendorIds)
      .eq('is_available', true);

    if (menuItemsError) console.error('menu_items fetch error:', menuItemsError.message);

    const itemCounts = {};
    (menuItems || []).forEach((m) => {
      itemCounts[m.vendor_id] = (itemCounts[m.vendor_id] || 0) + 1;
    });

    const eligible = list.filter(
      (v) => (itemCounts[v.user_id] || 0) >= MIN_CATALOGUE_ITEMS
    );

    setVendors(eligible);
    setLoading(false);
  };

  let list = vendors.filter(v =>
    v.legal_name.toLowerCase().includes(query.toLowerCase()) ||
    v.sub_categories?.some(s => s.toLowerCase().includes(query.toLowerCase()))
  );

  if (filter === 'Open Now') {
    list = list.filter(v => v.is_open);
  } else if (filter === 'Top Rated') {
    list = [...list].sort((a, b) => fakeRating(b.legal_name) - fakeRating(a.legal_name));
  } else if (filter === 'Fastest') {
    list = [...list].sort((a, b) =>
      parseInt(fakeTime(a.legal_name)) - parseInt(fakeTime(b.legal_name))
    );
  }

  return (
    <div className="w-full mx-auto px-2 pt-5 pb-8 space-y-5">

      {/* Header */}
      <div className="flex items-center">
        <button
          onClick={() => router.back()}
          className="w-9 h-9 rounded-full flex items-center justify-center text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors -ml-1"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>
        <h3 className="text-xs font-black tracking-tight text-slate-900 dark:text-white">
          All Canteens
        </h3>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
        <input
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder="Search canteens..."
          className="w-full h-11 pl-11 pr-4 rounded-full bg-slate-100 dark:bg-slate-800 text-sm text-slate-900 dark:text-white placeholder:text-slate-400 outline-none focus:ring-2 focus:ring-blue-500/20 transition-all"
        />
      </div>

      {/* Filter pills */}
      <div className="flex gap-2 overflow-x-auto no-scrollbar">
        {FILTERS.map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={cn(
              'shrink-0 px-3 py-2 rounded-full text-xs font-bold border transition-all',
              filter === f
                ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900 border-slate-900 dark:border-white'
                : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-800',
            )}
          >
            {f}
          </button>
        ))}
      </div>

      {/* List */}
      <div className="divide-y divide-slate-100 dark:divide-slate-800">
        {loading ? (
          Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="flex items-center gap-3.5 py-4 animate-pulse">
              <div className="w-14 h-14 rounded-2xl bg-slate-200 dark:bg-slate-800 shrink-0" />
              <div className="flex-1 space-y-2">
                <div className="h-3.5 w-1/2 rounded bg-slate-200 dark:bg-slate-800" />
                <div className="h-2.5 w-2/3 rounded bg-slate-200 dark:bg-slate-800" />
                <div className="h-2.5 w-1/3 rounded bg-slate-200 dark:bg-slate-800" />
              </div>
            </div>
          ))
        ) : list.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <span className="text-4xl mb-3">🔍</span>
            <p className="text-xs font-black text-slate-900 dark:text-white">No canteens found</p>
            <p className="text-[11px] text-slate-400 mt-1">Try a different search</p>
          </div>
        ) : (
          list.map(v => (
            <Link
              key={v.user_id}
              href={`/store/${v.user_id}`}
              className="flex items-center gap-3.5 py-4 group"
            >
              {v.avatar_url ? (
                <img src={v.avatar_url} alt={v.legal_name} className="w-14 h-14 rounded-2xl object-cover shrink-0" />
              ) : (
                <AvatarPlaceholder name={v.legal_name} />
              )}

              <div className="flex-1 min-w-0">
                <p className="text-sm font-black text-slate-900 dark:text-white truncate">
                  {v.legal_name}
                </p>
                <p className="text-xs text-slate-400 truncate mt-0.5">
                  {v.sub_categories?.length > 0 ? v.sub_categories.join(' · ') : 'Campus kitchen'}
                </p>

                <div className="flex items-center gap-2 mt-2">
                  <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400">
                    {fakeRating(v.legal_name)} ★
                  </span>
                  <span className={cn(
                    'text-[11px] font-bold px-2 py-0.5 rounded-full',
                    v.is_open
                      ? 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                      : 'bg-rose-50 dark:bg-rose-500/10 text-rose-500',
                  )}>
                    {v.is_open ? 'Open' : 'Closed'}
                  </span>
                  <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400">
                    {fakeTime(v.legal_name)}
                  </span>
                </div>
              </div>

              <ChevronRight className="w-4 h-4 text-slate-300 dark:text-slate-700 shrink-0 group-hover:text-blue-400 group-hover:translate-x-0.5 transition-all" />
            </Link>
          ))
        )}
      </div>
    </div>
  );
}