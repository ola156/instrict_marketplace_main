'use client';

import { useEffect, useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/utils/supabase/client';
import { ChevronLeft, Star, ShoppingBag } from 'lucide-react';

function cn(...c) { return c.filter(Boolean).join(' '); }

function ProductCard({ product }) {
  return (
    <Link
      href={`/vendors/marketplace/product/${product.id}`}
      className="flex flex-col rounded-2xl border border-slate-100 dark:border-slate-800 overflow-hidden bg-white dark:bg-slate-900 hover:border-blue-200 dark:hover:border-blue-800 hover:shadow-sm transition-all"
    >
      {/* Image container — fixed height, image contained inside it */}
      <div className="relative  w-full h-48 overflow-hidden bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
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

export default function RetailStore({ vendor, canOrder, orderingBlockedReason }) {
  const router = useRouter();
  const supabase = createClient();

  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState('All');
  const [error, setError] = useState('');

  useEffect(() => { fetchProducts(); }, [vendor?.user_id]);

  const fetchProducts = async () => {
    if (!vendor?.user_id) return;
    const { data, error } = await supabase
      .from('menu_items')
      .select('id,name,base_price,image_url,category,is_featured,is_available')
      .eq('vendor_id', vendor.user_id)
      .eq('is_available', true)
      .order('created_at', { ascending: true });

    if (error) {
      console.error('menu_items fetch error:', error.message);
      setError(error.message);
    }
    setProducts(data || []);
    setLoading(false);
  };

  const categories = useMemo(
    () => ['All', ...new Set(products.map((p) => p.category).filter(Boolean))],
    [products]
  );

  const filteredProducts = useMemo(() => {
    if (activeCategory === 'All') return products;
    return products.filter((p) => p.category === activeCategory);
  }, [products, activeCategory]);

  return (
    <div className="relative bg-slate-50 dark:bg-slate-950 min-h-screen w-full flex flex-col transition-colors duration-200">

      {/* ============ BANNER ============ */}
      <div className="w-full lg:flex lg:justify-center lg:pt-6 lg:px-4">
        <div
          className={cn(
            'w-full py-8 px-5 relative flex flex-col justify-between transition-all duration-300 overflow-hidden sm:rounded-xl',
            'lg:max-w-5xl lg:rounded-3xl lg:pt-10 lg:pb-10 lg:px-10',
            vendor.banner_url ? 'bg-cover bg-center' : ''
          )}
          style={{
            backgroundImage: vendor.banner_url ? `url(${vendor.banner_url})` : 'none',
            backgroundColor: vendor.banner_url ? 'transparent' : '#12294f',
          }}
        >
          {vendor.banner_url && (
            <div className="absolute inset-0 bg-slate-950/40 backdrop-blur-xs z-0" />
          )}

          <div className="relative z-10 mb-12 lg:mb-16">
            <button
              onClick={() => router.back()}
              className="h-9 w-9 rounded-full bg-white/10 backdrop-blur-md flex items-center justify-center text-white border border-white/10 hover:bg-white/20 transition-all active:scale-95"
            >
              <ChevronLeft className="h-4 w-4 stroke-[2.5]" />
            </button>
          </div>

          <div className="relative z-10 flex flex-col gap-1 text-white">
            <h1 className="text-xl lg:text-3xl font-black tracking-tight leading-tight">
              {vendor.legal_name}
            </h1>
            <div className="flex items-center gap-1.5 text-[11px] lg:text-sm font-bold tracking-normal opacity-90">
              <span className="flex items-center gap-1.5">
                <span
                  className={cn(
                    'h-2 w-2 rounded-full inline-block',
                    vendor.is_open ? 'bg-emerald-400' : 'bg-slate-400'
                  )}
                />
                {vendor.is_open ? 'Open now' : 'Closed'}
              </span>
              <span className="opacity-40">•</span>
              <span className="flex items-center gap-0.5">
                4.8 <Star className="h-3 w-3 lg:h-3.5 lg:w-3.5 text-amber-400 fill-amber-400 inline" />
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* ============ CATEGORY FILTERS ============ */}
      <div className="w-full bg-slate-50 dark:bg-slate-950 border-b border-slate-100 dark:border-slate-800/60 py-3.5 px-4 sticky top-0 z-20">
        <div className="flex gap-2 overflow-x-auto no-scrollbar max-w-2xl lg:max-w-5xl mx-auto">
          {categories.map((c) => (
            <button
              key={c}
              onClick={() => setActiveCategory(c)}
              className={cn(
                'shrink-0 text-[11px] lg:text-xs font-bold px-4 py-2 lg:px-5 lg:py-2.5 rounded-full border whitespace-nowrap transition-all duration-200',
                activeCategory === c
                  ? 'bg-blue-600 border-blue-600 text-white shadow-xs'
                  : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-50'
              )}
            >
              {c}
            </button>
          ))}
        </div>
      </div>

  {orderingBlockedReason && (
        <div className="w-full max-w-2xl lg:max-w-5xl mx-auto px-4 pt-4">
          <div className="flex items-start gap-2.5 rounded-2xl border border-amber-500/20 bg-amber-500/5 px-4 py-3.5">
            <orderingBlockedReason.icon className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
            <div>
              <p className="text-xs font-black text-amber-600 dark:text-amber-400">{orderingBlockedReason.title}</p>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">{orderingBlockedReason.detail}</p>
            </div>
          </div>
        </div>
      )}
      {/* ============ PRODUCT GRID ============ */}
      <div className="flex-1 w-full max-w-2xl lg:max-w-5xl mx-auto px-4 py-4 lg:py-6">
        {loading ? (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="space-y-2 animate-pulse">
                <div className="w-full h-44 rounded-2xl bg-slate-200 dark:bg-slate-800" />
                <div className="h-3 w-3/4 rounded bg-slate-200 dark:bg-slate-800" />
                <div className="h-3 w-1/2 rounded bg-slate-200 dark:bg-slate-800" />
              </div>
            ))}
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <p className="text-xs font-black text-rose-500">Couldn't load products</p>
            <p className="text-[11px] text-slate-400 mt-1">{error}</p>
          </div>
        ) : filteredProducts.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <span className="text-4xl mb-3">🛍️</span>
            <p className="text-xs font-black text-slate-900 dark:text-white">No products in this category</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
            {filteredProducts.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}