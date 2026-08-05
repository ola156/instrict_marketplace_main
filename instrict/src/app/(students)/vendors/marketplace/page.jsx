'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/utils/supabase/client';
import { ChevronLeft, Search, ShoppingBag } from 'lucide-react';

function cn(...c) { return c.filter(Boolean).join(' '); }

// Vendors must be verified (vendor_verifications.status = 'approved')
// AND have at least this many available items to show up here.
const MIN_CATALOGUE_ITEMS = 2;

export default function CampusMarketplace() {
  const router = useRouter();
  const supabase = createClient();

  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState('All');

  useEffect(() => { fetchProducts(); }, []);

const fetchProducts = async () => {
  setLoading(true);

  const { data: vendors, error: vendorsError } = await supabase
    .from('vendor_profiles')
    .select('user_id')
    .eq('category', 'retail')
    .eq('phone_verified', true)
    .eq('approved', true)
    .neq('account_status', 'suspended');



  const vendorIds = (vendors || []).map(v => v.user_id);
  if (vendorIds.length === 0) {
    setProducts([]);
    setLoading(false);
    return;
  }

  const { data: items, error: itemsError } = await supabase
    .from('menu_items')
    .select('id,name,base_price,image_url,category,is_featured,is_available,vendor_id')
    .in('vendor_id', vendorIds)
    .eq('is_available', true)
    .order('created_at', { ascending: false });



  const counts = {};
  (items || []).forEach(i => { counts[i.vendor_id] = (counts[i.vendor_id] || 0) + 1; });
 

  const eligibleVendorIds = new Set(
    Object.keys(counts).filter(id => counts[id] >= MIN_CATALOGUE_ITEMS)
  );
 

  const eligibleItems = (items || []).filter(i => eligibleVendorIds.has(i.vendor_id));
 

  setProducts(eligibleItems);
  setLoading(false);
};
  // Filter pills built from whatever categories these items actually use —
  // no hardcoded list that can drift out of sync with real vendor data.
  const categories = ['All', ...new Set(products.map(p => p.category).filter(Boolean))];

  const list = products.filter(p => {
    const matchesQuery = p.name.toLowerCase().includes(query.toLowerCase());
    const matchesFilter = filter === 'All' || p.category === filter;
    return matchesQuery && matchesFilter;
  });

  return (
    <div className="w-full px-4 pt-5 pb-8 space-y-5">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center">
          <button
            onClick={() => router.back()}
            className="w-9 h-9 rounded-full flex items-center justify-center text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors -ml-1"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <h1 className="text-xs font-black tracking-tight text-slate-900 dark:text-white">
            Campus Marketplace
          </h1>
        </div>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
        <input
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder="Search marketplace items..."
          className="w-full h-11 pl-11 pr-4 rounded-full bg-slate-100 dark:bg-slate-800 text-sm text-slate-900 dark:text-white placeholder:text-slate-400 outline-none focus:ring-2 focus:ring-blue-500/20 transition-all"
        />
      </div>

      {/* Filter pills */}
      {categories.length > 1 && (
        <div className="flex gap-2 overflow-x-auto no-scrollbar">
          {categories.map(f => (
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
      )}

      {/* Grid */}
      {loading ? (
        <div className="grid grid-cols-2 gap-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="space-y-2 animate-pulse">
              <div className="w-full h-32 rounded-2xl bg-slate-200 dark:bg-slate-800" />
              <div className="h-3 w-3/4 rounded bg-slate-200 dark:bg-slate-800" />
              <div className="h-3 w-1/2 rounded bg-slate-200 dark:bg-slate-800" />
            </div>
          ))}
        </div>
      ) : list.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <span className="text-4xl mb-3">🔍</span>
          <p className="text-xs font-black text-slate-900 dark:text-white">No items found</p>
          <p className="text-[11px] text-slate-400 mt-1">Try a different search</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
          {list.map(p => (
 <Link
      href={`/vendors/marketplace/product/${p.id}`}
      className="flex flex-col h-full rounded-2xl border border-slate-100 dark:border-slate-800 overflow-hidden bg-white dark:bg-slate-900 hover:border-blue-200 dark:hover:border-blue-800 hover:shadow-sm transition-all"
    >
      {/* Image container — fixed height, image covers it */}
      <div className="relative w-full h-40 overflow-hidden bg-slate-100 dark:bg-slate-800 flex items-center justify-center shrink-0">
        {p.image_url ? (
          <img
            src={p.image_url}
            alt={p.name}
            className="w-full h-full object-cover"
          />
        ) : (
          <ShoppingBag className="w-8 h-8 text-slate-300" />
        )}
      </div>

      {/* Text container — flex-1 so it fills remaining space, pushing
          price/category to the same spot regardless of name length */}
      <div className="flex flex-col flex-1 p-2.5">
        <p className="text-xs font-bold leading-tight line-clamp-2 min-h-[2.2em] text-slate-900 dark:text-white">
          {p.name}
        </p>
        <div className="mt-auto pt-1.5 space-y-1">
          <p className="text-sm font-black text-slate-900 dark:text-white">
            ₦{Number(p.base_price).toLocaleString()}
          </p>
          {p.category && (
            <span className="inline-block text-[9px] font-bold px-1.5 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400">
              {p.category}
            </span>
          )}
        </div>
      </div>
    </Link>
          ))}
        </div>
      )}
    </div>
  );
}