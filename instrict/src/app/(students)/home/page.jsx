'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/utils/supabase/client';
import Link from 'next/link';
import {
  MapPin, Clock, Truck, Search, X,
  ChevronRight, Flame,
  UtensilsCrossed, ShoppingBag, Wrench,
} from 'lucide-react';

function cn(...c) { return c.filter(Boolean).join(' '); }

// Vendors must be approved (vendor_profiles.approved = true, kept in sync
// with vendor_verifications via a DB trigger) AND have at least this many
// available items in their catalogue to show up anywhere on Home.
const MIN_CATALOGUE_ITEMS = 2;

// ─── Avatar placeholder ───────────────────────────────────────────────────────
const GRADS = [
  ['#2563EB','#1d4ed8'],['#7c3aed','#6d28d9'],['#0891b2','#0e7490'],
  ['#059669','#047857'],['#d97706','#b45309'],['#dc2626','#b91c1c'],
];
const EMOJIS = {
  canteen: ['🍛','🍜','🍔','🥗','🍝','🥘','🍱','🌮'],
  retail:  ['👗','👟','💻','📱','🛒','🎒','💄','⌚'],
  service: ['🖨️','📚','🎨','💇','📸','🔧','👕','📐'],
};
function AvatarPlaceholder({ name = '', category = 'canteen', className = 'w-14 h-14 text-xl' }) {
  const i = name.split('').reduce((a, c) => a + c.charCodeAt(0), 0);
  const [from, to] = GRADS[i % GRADS.length];
  const emoji = (EMOJIS[category] || EMOJIS.service)[i % 8];
  return (
    <div
      className={cn('rounded-full flex items-center justify-center shrink-0', className)}
      style={{ background: `linear-gradient(135deg,${from},${to})` }}
    >
      {emoji}
    </div>
  );
}

// ─── Banner ───────────────────────────────────────────────────────────────────
const SLIDES = [
  { tag: 'Campus Marketplace', title: 'Food, Products & services — all in one place', from: '#1d4ed8', to: '#4f46e5', emoji: '🍛', sub: 'Order from canteens, retail shops and campus services' },
  { tag: 'Flash deals daily', title: 'Vendors drop promos just for students', from: '#7c3aed', to: '#a21caf', emoji: '🔥', sub: 'Discounts and offers updated every day' },
  { tag: 'Campus delivery', title: 'Campus runners bring it to your door', from: '#047857', to: '#0e7490', emoji: '🛵', sub: 'Fast delivery straight to your hostel or address' },
];

function Banner() {
  const [idx, setIdx] = useState(0);
  const [fading, setFading] = useState(false);

  const go = (n) => {
    setFading(true);
    setTimeout(() => { setIdx(n); setFading(false); }, 200);
  };

  useEffect(() => {
    const t = setInterval(() => go((idx + 1) % SLIDES.length), 5000);
    return () => clearInterval(t);
  }, [idx]);

  const s = SLIDES[idx];

  return (
    <div className="relative w-full rounded-md overflow-hidden" style={{ background: `linear-gradient(135deg, ${s.from}, ${s.to})` }}>
      <div className="absolute inset-0 opacity-[0.07]" style={{ backgroundImage: 'radial-gradient(circle, white 1px, transparent 1px)', backgroundSize: '20px 20px' }} />
      <div className="absolute -bottom-8 -right-8 w-48 h-48 rounded-full opacity-20 blur-2xl" style={{ background: 'white' }} />
      <div className={cn('relative z-10 flex items-center justify-between px-5 py-5 transition-opacity duration-200', fading ? 'opacity-0' : 'opacity-100')}>
        <div className="flex-1 min-w-0 space-y-2 pr-4">
          <p className="text-white font-black text-[14px] leading-snug tracking-tight">{s.title}</p>
          <p className="text-white/60 text-[10px] leading-relaxed hidden sm:block">{s.sub}</p>
        </div>
        <div className="shrink-0 w-16 h-16 rounded-2xl bg-white/15 flex items-center justify-center text-4xl select-none">{s.emoji}</div>
      </div>
      <div className="relative z-10 flex gap-1.5 px-5 pb-4">
        {SLIDES.map((_, j) => (
          <button key={j} onClick={() => go(j)} className={cn('h-1 rounded-full bg-white transition-all duration-300', j === idx ? 'w-6 opacity-100' : 'w-2 opacity-30')} />
        ))}
      </div>
    </div>
  );
}

// ─── Category cards ───────────────────────────────────────────────────────────
const CATS = [
  { id: 'canteen', label: 'Canteen', emoji: '🍛', icon: UtensilsCrossed, from: '#d97706', to: '#b45309' },
  { id: 'marketplace', label: 'Marketplace', emoji: '🛍️', icon: ShoppingBag, from: '#2563eb', to: '#1d4ed8' },
  { id: 'service', label: 'Services', emoji: '⚙️', icon: Wrench, from: '#7c3aed', to: '#6d28d9' },
];

function CategoryCards() {
  return (
    <div className="space-y-2">
      <p className="text-[10px] font-black uppercase tracking-[0.13em] text-slate-400">Browse by type</p>
      <div className="grid grid-cols-3 gap-2.5">
        {CATS.map(c => (
          <Link key={c.id} href={`/vendors/${c.id}`} className="group">
            <div className="relative rounded-md overflow-hidden h-[72px] flex flex-col justify-between p-3" style={{ background: `linear-gradient(135deg,${c.from},${c.to})` }}>
              <span className="text-xl select-none">{c.emoji}</span>
              <p className="text-white font-black text-[11px] leading-tight">{c.label}</p>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}

// ─── Vendor circle (used everywhere vendors are shown, incl. search) ──────────
function VendorCircle({ vendor }) {
  return (
    <Link href={`/store/${vendor.user_id}`} className="flex flex-col items-center gap-1.5 shrink-0 w-[72px]">
      <div className="relative">
        <div className="w-16 h-16 rounded-full overflow-hidden bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
          {vendor.avatar_url
            ? <img src={vendor.avatar_url} alt={vendor.legal_name} className="w-full h-full object-cover" />
            : <AvatarPlaceholder name={vendor.legal_name} category={vendor.category} className="w-full h-full text-xl" />
          }
        </div>
        <span className={cn(
          'absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full border-2 border-white dark:border-slate-950',
          vendor.is_open ? 'bg-emerald-500' : 'bg-slate-300 dark:bg-slate-600',
        )} />
      </div>
      <p className="text-[11px] font-black text-center truncate w-full text-slate-900 dark:text-white">
        {vendor.legal_name}
      </p>
    </Link>
  );
}

// ─── Product card ──────────────────────────────────────────────────────────────
function ProductCard({ product }) {
  return (
    <Link
      href={`vendors/marketplace/product/${product.id}`}
      className="flex flex-col rounded-2xl border border-slate-100 dark:border-slate-800 overflow-hidden bg-white dark:bg-slate-900 hover:border-blue-200 dark:hover:border-blue-800 hover:shadow-sm transition-all"
    >
      {/* Image container — fixed height, image contained inside it */}
      <div className="relative  w-full h-50 overflow-hidden bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
        {product.image_url ? (
          <img
            src={product.image_url}
            alt={product.name}
            className="w-full h-full"
            style={{ objectFit: 'cover' }}
          />
        ) : (
          <ShoppingBag className="w-8 h-8 text-slate-300" />
        )}
      </div>

      {/* Text container — separate, sits below */}
      <div className="p-2.5 space-y-1">
        <p className="text-xs font-bold leading-tight line-clamp-2 text-slate-900 dark:text-white">
          {product.name}
        </p>
        <p className="text-sm font-black text-slate-900 dark:text-white">
          ₦{Number(product.base_price).toLocaleString()}
        </p>
        {product.category && (
          <span className="inline-block text-[9px] font-bold px-1.5 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400">
            {product.category}
          </span>
        )}
      </div>
    </Link>
  );
}
// ─── Main ─────────────────────────────────────────────────────────────────────
export default function StudentHome() {
  const supabase = createClient();
  const [vendors, setVendors] = useState([]);
  const [deals, setDeals] = useState([]);
  const [products, setProducts] = useState([]); // full pool used for search
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');
  const searching = query.trim().length > 0;

  useEffect(() => { init(); }, []);

  // Runs once: gets the approved + catalogue-eligible vendor set first,
  // then scopes deals/products to only those vendors so nothing from an
  // unapproved or under-stocked store leaks into Home or search.
  const init = async () => {
    setLoading(true);

    const { data: vendorsData, error: vendorsError } = await supabase
      .from('vendor_profiles')
      .select('user_id,legal_name,description,category,sub_categories,avatar_url,is_open,fulfillment_method,landmark,opening_time,closing_time,account_status')
      .eq('phone_verified', true)
      .eq('approved', true)
      .neq('account_status', 'suspended')
      .order('is_open', { ascending: false })
      .limit(30); // pull extra since some get filtered out below by catalogue size

    if (vendorsError) console.error('vendor_profiles fetch error:', vendorsError.message);

    const list = vendorsData || [];
    if (list.length === 0) {
      setVendors([]);
      setDeals([]);
      setProducts([]);
      setLoading(false);
      return;
    }

    const vendorIds = list.map(v => v.user_id);

    const { data: menuItems, error: menuItemsError } = await supabase
      .from('menu_items')
      .select('vendor_id')
      .in('vendor_id', vendorIds)
      .eq('is_available', true);

    if (menuItemsError) console.error('menu_items fetch error:', menuItemsError.message);

    const counts = {};
    (menuItems || []).forEach(m => { counts[m.vendor_id] = (counts[m.vendor_id] || 0) + 1; });

    const eligibleVendorIds = new Set(
      Object.keys(counts).filter(id => counts[id] >= MIN_CATALOGUE_ITEMS)
    );

    const eligibleVendors = list
      .filter(v => eligibleVendorIds.has(v.user_id))
      .slice(0, 12);

    setVendors(eligibleVendors);
    setLoading(false);

    // Deals and search-pool products only ever pull from eligible vendors.
    fetchDeals(eligibleVendorIds);
    fetchProducts(eligibleVendorIds);
  };

  const fetchDeals = async (eligibleVendorIds) => {
    if (!eligibleVendorIds || eligibleVendorIds.size === 0) {
      setDeals([]);
      return;
    }
    const { data, error } = await supabase
      .from('menu_items')
      .select('id,name,base_price,image_url,category,vendor_id')
      .eq('is_featured', true)
      .eq('is_available', true)
      .in('vendor_id', [...eligibleVendorIds])
      .order('sort_order', { ascending: true })
      .limit(6);

    if (error) console.error('menu_items (deals) fetch error:', error.message);
    setDeals(data || []);
  };

  // Broader pool for search — not limited to featured items
  const fetchProducts = async (eligibleVendorIds) => {
    if (!eligibleVendorIds || eligibleVendorIds.size === 0) {
      setProducts([]);
      return;
    }
    const { data, error } = await supabase
      .from('menu_items')
      .select('id,name,base_price,image_url,category,vendor_id')
      .eq('is_available', true)
      .in('vendor_id', [...eligibleVendorIds])
      .limit(100);

    if (error) console.error('menu_items (products) fetch error:', error.message);
    setProducts(data || []);
  };

  const q = query.trim().toLowerCase();

  const filteredVendors = searching
    ? vendors.filter(v =>
        v.legal_name.toLowerCase().includes(q) ||
        v.description?.toLowerCase().includes(q) ||
        v.sub_categories?.some(s => s.toLowerCase().includes(q))
      )
    : vendors;

  const filteredProducts = searching
    ? products.filter(p =>
        p.name.toLowerCase().includes(q) ||
        p.category?.toLowerCase().includes(q)
      )
    : [];

  const noResults = searching && filteredVendors.length === 0 && filteredProducts.length === 0;

  if (loading) return (
    <div className="w-full space-y-5 animate-pulse px-4">
      <div className="w-full h-40 rounded-2xl bg-slate-200 dark:bg-slate-800" />
      <div className="h-10 rounded-2xl bg-slate-200 dark:bg-slate-800" />
      <div className="grid grid-cols-3 gap-2.5">
        {[1,2,3].map(i => <div key={i} className="h-[72px] rounded-2xl bg-slate-200 dark:bg-slate-800" />)}
      </div>
      <div className="flex gap-4">
        {[1,2,3,4].map(i => <div key={i} className="w-16 h-16 rounded-full bg-slate-200 dark:bg-slate-800 shrink-0" />)}
      </div>
    </div>
  );

  return (
    <div className="w-full space-y-5 px-4 lg:px-0 pt-5 pb-8">

      {/* Banner — hidden while searching */}
      {!searching && <Banner />}

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
        <input
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder="Search food, stores, services…"
          className="w-full h-11 pl-10 pr-9 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-sm text-slate-900 dark:text-white placeholder:text-slate-400 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 transition-all"
        />
        {searching && (
          <button
            onClick={() => setQuery('')}
            className="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition-colors"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {/* Category cards — hidden while searching */}
      {!searching && <CategoryCards />}

      {searching ? (
        <div className="space-y-6">
          {noResults ? (
            <div className="flex flex-col items-center justify-center py-16 text-center rounded-2xl border border-dashed border-slate-200 dark:border-slate-800">
              <span className="text-4xl mb-3">🔍</span>
              <p className="text-xs font-black text-slate-900 dark:text-white">Nothing found</p>
              <p className="text-[11px] text-slate-400 mt-1">Try a different search</p>
              <button onClick={() => setQuery('')} className="mt-3 text-[11px] font-black text-blue-500 hover:text-blue-600 transition-colors">
                Clear
              </button>
            </div>
          ) : (
            <>
              {filteredVendors.length > 0 && (
                <div className="space-y-3">
                  <p className="text-[10px] font-black uppercase tracking-[0.13em] text-slate-400">
                    Vendors ({filteredVendors.length})
                  </p>
                  <div className="flex gap-4 overflow-x-auto no-scrollbar pb-1">
                    {filteredVendors.map(v => <VendorCircle key={v.user_id} vendor={v} />)}
                  </div>
                </div>
              )}

              {filteredProducts.length > 0 && (
                <div className="space-y-3">
                  <p className="text-[10px] font-black uppercase tracking-[0.13em] text-slate-400">
                    Products ({filteredProducts.length})
                  </p>
                  <div className="grid grid-cols-2 gap-3">
                    {filteredProducts.map(p => <ProductCard key={p.id} product={p} />)}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      ) : (
        <div className="space-y-6">
          {/* Popular Campus Kitchens */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-sm font-black tracking-tight text-slate-900 dark:text-white">Popular Campus Kitchens</p>
              <Link href="/vendors/canteen" className="text-xs font-bold text-blue-500 hover:text-blue-600 transition-colors">
                See all
              </Link>
            </div>
            <div className="flex gap-4 overflow-x-auto no-scrollbar pb-1">
              {vendors.filter(v => v.category === 'canteen').slice(0, 8).map(v => (
                <VendorCircle key={v.user_id} vendor={v} />
              ))}
            </div>
          </div>

          {/* Featured Items */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-sm font-black tracking-tight text-slate-900 dark:text-white">Featured Items</p>
              <Link href="/vendors/marketplace" className="text-xs font-bold text-blue-500 hover:text-blue-600 transition-colors">
                View all
              </Link>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              {deals.map(d => <ProductCard key={d.id} product={d} />)}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}