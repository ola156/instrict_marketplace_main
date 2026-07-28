'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/utils/supabase/client';
import { ChevronLeft, Search, ArrowRight } from 'lucide-react';
import { ProductSkeleton } from "@/components/ui/ProductSleleton";

function cn(...c) { return c.filter(Boolean).join(' '); }

// Deterministic gradient + initials placeholder for vendors with no avatar_url
const GRADIENTS = [
  'from-blue-500 to-indigo-600',
  'from-emerald-500 to-teal-600',
  'from-orange-500 to-rose-500',
  'from-purple-500 to-fuchsia-600',
  'from-cyan-500 to-blue-600',
  'from-amber-500 to-orange-600',
];

function hashName(name = '') {
  return name.split('').reduce((a, c) => a + c.charCodeAt(0), 0);
}

function initials(name = '') {
  const parts = name.trim().split(/\s+/);
  return ((parts[0]?.[0] || '') + (parts[1]?.[0] || '')).toUpperCase();
}

// Vendors must be approved (vendor_profiles.approved = true, kept in sync
// with vendor_verifications via a DB trigger) AND have at least this many
// catalogue items to show up in the directory. For service vendors,
// "catalogue" means their price list (service_price_matrix, used by
// printing vendors) plus their portfolio (portfolio_items, used by
// gallery/WhatsApp vendors) — whichever applies to that vendor.
const MIN_CATALOGUE_ITEMS = 2;

export default function ServiceDirectory() {
  const router = useRouter();
  const supabase = createClient();

  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');

  useEffect(() => { fetchServices(); }, []);

  const fetchServices = async () => {
    const { data: vendorsData, error: vendorsError } = await supabase
      .from('vendor_profiles')
      .select('user_id,legal_name,avatar_url,sub_categories,is_open')
      .eq('category', 'service')
      .eq('phone_verified', true)
      .eq('approved', true)
      .neq('account_status', 'suspended')
      .order('is_open', { ascending: false });

    if (vendorsError) {
      console.error('vendor_profiles fetch error:', vendorsError.message);
      setServices([]);
      setLoading(false);
      return;
    }

    const list = vendorsData || [];
    if (list.length === 0) {
      setServices([]);
      setLoading(false);
      return;
    }

    const vendorIds = list.map(v => v.user_id);

    const [{ data: priceItems, error: priceError }, { data: portfolioItems, error: portfolioError }] =
      await Promise.all([
        supabase
          .from('service_price_matrix')
          .select('vendor_id')
          .in('vendor_id', vendorIds),
        supabase
          .from('portfolio_items')
          .select('vendor_id')
          .in('vendor_id', vendorIds),
      ]);

    if (priceError) console.error('service_price_matrix fetch error:', priceError.message);
    if (portfolioError) console.error('portfolio_items fetch error:', portfolioError.message);

    const counts = {};
    (priceItems || []).forEach(i => { counts[i.vendor_id] = (counts[i.vendor_id] || 0) + 1; });
    (portfolioItems || []).forEach(i => { counts[i.vendor_id] = (counts[i.vendor_id] || 0) + 1; });

    const eligible = list.filter(v => (counts[v.user_id] || 0) >= MIN_CATALOGUE_ITEMS);

    setServices(eligible);
    setLoading(false);
  };

  const list = services.filter(s =>
    s.legal_name.toLowerCase().includes(query.toLowerCase()) ||
    s.sub_categories?.some(sub => sub.toLowerCase().includes(query.toLowerCase()))
  );

  return (
    <div className="w-full max-w-lg mx-auto px-4 md:px-1 pt-5 pb-8 space-y-5">

      {/* Header */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => router.back()}
          className="w-9 h-9 rounded-full flex items-center justify-center text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors -ml-1"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>
        <h1 className="text-xs font-black tracking-tight text-slate-900 dark:text-white">
          Service Directory
        </h1>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
        <input
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder="Search services..."
          className="w-full h-11 pl-11 pr-4 rounded-full bg-slate-100 dark:bg-slate-800 text-sm text-slate-900 dark:text-white placeholder:text-slate-400 outline-none focus:ring-2 focus:ring-blue-500/20 transition-all"
        />
      </div>

      {/* Card Grid: 2-wide, exact template card design */}
      <div className="grid grid-cols-2 gap-4 relative z-10">
        {loading ? (
          Array.from({ length: 4 }).map((_, i) => <ServiceSkeletonCard key={i} />)
        ) : list.length === 0 ? (
          <div className="col-span-2 flex flex-col items-center justify-center py-16 text-center">
            <span className="text-4xl mb-3">🔍</span>
            <p className="text-xs font-black text-slate-900 dark:text-white">No services found</p>
            <p className="text-[11px] text-slate-400 mt-1">Try a different search</p>
          </div>
        ) : (
          list.map(s => {
            const category = s.sub_categories?.[0] || 'Service';
            const gradient = GRADIENTS[hashName(s.legal_name) % GRADIENTS.length];

            return (
              <Link
                key={s.user_id}
                href={`/store/${s.user_id}`}
                className="group flex flex-col overflow-hidden bg-muted/20 dark:bg-slate-900 border border-border/40 dark:border-slate-800 hover:border-primary/30 rounded-2xl transition-all duration-300 cursor-pointer hover:-translate-y-0.5"
              >
                <div className="w-full h-36 relative overflow-hidden bg-muted">
                  {s.avatar_url ? (
                    <>
                      <img
                        src={s.avatar_url}
                        alt={s.legal_name}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 opacity-70"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-background/90 via-transparent to-transparent" />
                    </>
                  ) : (
                    <div className={cn('w-full h-full flex items-center justify-center bg-gradient-to-br', gradient)}>
                      <span className="text-3xl font-black text-blue-500 tracking-tight">
                        {initials(s.legal_name)}
                      </span>
                    </div>
                  )}
                </div>

                <div className="p-4 pt-0 relative flex-1 flex flex-col justify-between">
                  <div className="space-y-3">
                    <div className="w-10 h-10 rounded-xl bg-background border border-border flex items-center justify-center text-[10px] font-black uppercase text-center shadow-sm -mt-5 relative z-10 tracking-tighter px-0.5 truncate">
                      {category.substring(0, 4)}
                    </div>

                    <div className="space-y-2">
                      <h4 className="font-bold text-sm text-foreground tracking-tight group-hover:text-primary transition-colors line-clamp-1">
                        {s.legal_name}
                      </h4>
                      <div className="flex flex-wrap items-center gap-1">
                        {(s.sub_categories?.length ? s.sub_categories : [category]).slice(0, 2).map(sub => (
                          <span
                            key={sub}
                            className="text-[9px] font-mono bg-background text-muted-foreground border border-border/40 px-2 py-0.5 rounded"
                          >
                            {sub}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="mt-4 pt-3 border-t border-border/20 flex items-center justify-between text-xs font-mono font-bold">
                    <span
                      className={cn(
                        'inline-flex items-center gap-1 text-[10px]',
                        s.is_open ? 'text-emerald-500' : 'text-muted-foreground'
                      )}
                    >
                      <span className={cn('w-1.5 h-1.5 rounded-full', s.is_open ? 'bg-emerald-500' : 'bg-muted-foreground/50')} />
                      {s.is_open ? 'Open Now' : 'Closed'}
                    </span>
                    <span className="text-primary text-[10px] uppercase tracking-wider font-black group-hover:translate-x-0.5 transition-transform inline-flex items-center gap-0.5">
                      <span>View</span>
                      <ArrowRight className="w-3 h-3" />
                    </span>
                  </div>
                </div>
              </Link>
            );
          })
        )}
      </div>
    </div>
  );
}

function ServiceSkeletonCard() {
  return (
    <div className="flex flex-col overflow-hidden bg-muted/20 border border-border/40 rounded-2xl p-4 pt-0 space-y-3">
      <div className="w-full h-36 -mx-4 relative bg-muted/60" />
      <ProductSkeleton className="w-10 h-10 rounded-xl bg-muted -mt-5 relative z-10" />
      <ProductSkeleton className="h-4 w-3/4 bg-muted/50" />
      <ProductSkeleton className="h-3 w-1/2 bg-muted/30" />
      <div className="pt-3 border-t border-border/20 flex justify-between items-center">
        <ProductSkeleton className="h-3 w-16 bg-muted/40" />
        <ProductSkeleton className="h-3 w-12 bg-muted/40" />
      </div>
    </div>
  );
}