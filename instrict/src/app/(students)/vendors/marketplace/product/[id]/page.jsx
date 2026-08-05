'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/utils/supabase/client';
import {
  ChevronLeft, Heart, MapPin, ChevronRight,
  ShoppingBag, Minus, Plus, Check, Star, X, Ban, AlertTriangle, Share2, Clock,
} from 'lucide-react';
import { useCartStore } from '@/store/useCartStore';

function cn(...c) { return c.filter(Boolean).join(' '); }

const COLOR_MAP = {
  'sierra blue': '#8FA9C4', 'space grey': '#7d7e80', 'space gray': '#7d7e80',
  'rose gold': '#e6c3ba', 'midnight': '#1c1c1e', 'graphite': '#4a4a4a',
  'starlight': '#f0e6d8', 'silver': '#c0c0c0', 'gold': '#d4af37',
  'champagne': '#f7e7ce', 'cream': '#fffdd0', 'wine': '#722f37',
  'olive': '#808000', 'mint': '#98d8c8', 'lilac': '#c8a2c8',
  'coral': '#ff7f50', 'charcoal': '#36454f', 'khaki': '#c3b091',
};
function swatchColor(name = '') {
  const key = name.trim().toLowerCase();
  return COLOR_MAP[key] || key;
}

const GRADS = [
  ['#2563EB','#1d4ed8'],['#7c3aed','#6d28d9'],['#0891b2','#0e7490'],
  ['#059669','#047857'],['#d97706','#b45309'],['#dc2626','#b91c1c'],
];
const EMOJIS = {
  canteen: ['🍛','🍜','🍔','🥗','🍝','🥘','🍱','🌮'],
  retail:  ['👗','👟','💻','📱','🛒','🎒','💄','⌚'],
  service: ['🖨️','📚','🎨','💇','📸','🔧','👕','📐'],
};
function AvatarPlaceholder({ name = '', category = 'canteen' }) {
  const i = name.split('').reduce((a, c) => a + c.charCodeAt(0), 0);
  const [from, to] = GRADS[i % GRADS.length];
  const emoji = (EMOJIS[category] || EMOJIS.service)[i % 8];
  return (
    <div
      className="w-11 h-11 rounded-full flex items-center justify-center shrink-0 text-lg"
      style={{ background: `linear-gradient(135deg,${from},${to})` }}
    >
      {emoji}
    </div>
  );
}

// Main gallery image — fades in on load, and re-fades whenever the active
// image changes (keyed by src) so switching photos never flashes a blank
// or stale frame while the new one decodes.
function GalleryImage({ src, alt }) {
  const [loaded, setLoaded] = useState(false);

  return (
    <>
      {!loaded && (
        <div className="absolute inset-0 animate-pulse bg-slate-200 dark:bg-slate-800" />
      )}
      <img
        key={src}
        src={src}
        alt={alt}
        decoding="async"
        onLoad={() => setLoaded(true)}
        className={cn(
          'w-full h-full object-contain transition-opacity duration-200 ease-out',
          loaded ? 'opacity-100' : 'opacity-0'
        )}
      />
    </>
  );
}

export default function ProductDescriptionPage() {
  const { id } = useParams();
  const router = useRouter();
  const supabase = createClient();

  const [product, setProduct] = useState(null);
  const [vendor, setVendor] = useState(null);
  const [studentSuspended, setStudentSuspended] = useState(false);
  const [variants, setVariants] = useState([]);
  const [images, setImages] = useState([]); // gallery: array of image_url strings
  const [activeImage, setActiveImage] = useState(0);
  const [loading, setLoading] = useState(true);

  const [selectedSize, setSelectedSize] = useState(null);
  const [selectedColor, setSelectedColor] = useState(null);
  const [qty, setQty] = useState(1);
  const [saved, setSaved] = useState(false);
  const [added, setAdded] = useState(false);
  const [shared, setShared] = useState(false); // brief "Link copied" feedback for the clipboard fallback

  // --- Real cart store integration ---
  const cartItems = useCartStore((state) => state.items);
  const storeAddItem = useCartStore((state) => state.addItem);
  const updateQuantity = useCartStore((state) => state.updateQuantity);

  const [pendingCartItem, setPendingCartItem] = useState(null);
  const [conflictVendorName, setConflictVendorName] = useState(null);

  useEffect(() => { fetchProduct(); }, [id]);

  const fetchProduct = async () => {
    setLoading(true);

    const [{ data: item }, { data: { user } }] = await Promise.all([
      supabase
        .from('menu_items')
        .select('id,vendor_id,name,description,base_price,image_url,is_available,is_featured,category,estimated_duration_minutes')
        .eq('id', id)
        .single(),
      supabase.auth.getUser(),
    ]);

    // Student's own suspension status — checked regardless of which product
    // they're looking at, so it can't be routed around.
    if (user) {
      const { data: studentProfile } = await supabase
        .from('student_profiles')
        .select('account_status')
        .eq('user_id', user.id)
        .maybeSingle();
      setStudentSuspended(studentProfile?.account_status === 'suspended');
    }

    if (item) {
      setProduct(item);
      const [{ data: v }, { data: vr }, { data: imgs }] = await Promise.all([
        supabase.from('vendor_profiles')
          .select('user_id,legal_name,avatar_url,category,is_open,landmark,account_status')
          .eq('user_id', item.vendor_id)
          .single(),
        supabase.from('product_variants')
          .select('id,size,color,stock,price_adjustment,sku')
          .eq('menu_item_id', item.id),
        supabase.from('product_images')
          .select('image_url,position')
          .eq('menu_item_id', item.id)
          .order('position', { ascending: true }),
      ]);

      setVendor(v);
      const variantList = vr || [];
      setVariants(variantList);

      // Gallery: use product_images if present, otherwise fall back to the
      // single legacy image_url so older products still display something.
      const gallery = imgs?.length
        ? imgs.map(i => i.image_url)
        : item.image_url ? [item.image_url] : [];
      setImages(gallery);
      setActiveImage(0);

      const sizes = [...new Set(variantList.map(x => x.size).filter(Boolean))];
      const colors = [...new Set(variantList.map(x => x.color).filter(Boolean))];
      const firstInStock = variantList.find(x => x.stock > 0) || variantList[0];
      if (firstInStock) {
        if (sizes.length) setSelectedSize(firstInStock.size);
        if (colors.length) setSelectedColor(firstInStock.color);
      }
    }
    setLoading(false);
  };

  const sizes = [...new Set(variants.map(v => v.size).filter(Boolean))];
  const colors = [...new Set(variants.map(v => v.color).filter(Boolean))];
  const hasVariants = variants.length > 0;

  const selectedVariant = hasVariants
    ? variants.find(v =>
        (!sizes.length || v.size === selectedSize) &&
        (!colors.length || v.color === selectedColor)
      )
    : null;

  // Cap on how many can be ordered: the selected variant's stock if this
  // product has variants, otherwise uncapped (menu_items has no stock
  // column of its own for non-variant products).
  const maxQty = hasVariants ? Math.max(selectedVariant?.stock || 0, 1) : Infinity;

  // Whenever the chosen size/color changes, qty could be left pointing at
  // a number higher than the new variant's actual stock — reset it back
  // to 1 rather than silently clamping to an unexpected value.
  useEffect(() => {
    setQty(1);
  }, [selectedSize, selectedColor]);

  const sizeHasStock = (size) =>
    variants.some(v => v.size === size && v.stock > 0);

  const colorHasStock = (color) =>
    variants.some(v => v.color === color && v.stock > 0);

  const unitPrice = product
    ? Number(product.base_price) + Number(selectedVariant?.price_adjustment || 0)
    : 0;

  // Ordering is blocked if the store is closed OR the student's own account
  // is suspended. Vendor-suspended is handled separately below (treated as
  // "not found" — the store shouldn't be reachable at all in that case).
  const canOrder = !!vendor?.is_open && !studentSuspended;

  const orderingBlockedReason = studentSuspended
    ? { icon: Ban, text: 'Your account is suspended — contact support to place orders.' }
    : vendor && !vendor.is_open
    ? { icon: AlertTriangle, text: 'This store is closed right now.' }
    : null;

  // Variant availability is a SEPARATE concern from ordering permission —
  // it only gates whether THIS specific combination can be added, not the
  // quantity steppers, which should always be usable.
  const variantAvailable = !hasVariants || (selectedVariant && selectedVariant.stock > 0);
  const canAdd = product?.is_available && canOrder && variantAvailable;

  // Calculate order duration in days from estimated_duration_minutes
  const durationDays = product?.estimated_duration_minutes
    ? Math.max(1, Math.round(product.estimated_duration_minutes / 1440))
    : null;

  // Deterministic line id: same product + same variant (or no variant) from
  // the same vendor always maps to the same cart line, so repeated adds
  // bump quantity instead of creating duplicate lines.
  const buildLineId = () => {
    const variantKey = selectedVariant?.id || 'novariant';
    return `${vendor?.user_id}::${product.id}::${variantKey}`;
  };

  const handleAddToCart = () => {
    if (!canAdd || !product || !vendor) return;

    const lineId = buildLineId();
    const existingLine = cartItems.find((i) => i.id === lineId);

    // Same vendor, same exact product+variant already in cart — just bump quantity.
    if (existingLine) {
      updateQuantity(lineId, existingLine.quantity + qty);
      setAdded(true);
      setTimeout(() => setAdded(false), 1600);
      return;
    }

    const cartItem = {
      id: lineId,
      vendorId: vendor.user_id,
      vendorName: vendor.legal_name,
      type: 'retail',
      name: product.name,
      image: images[0] || product.image_url,
      unitPrice,
      quantity: qty,
      meta: {
        productId: product.id,
        variantId: selectedVariant?.id || null,
        size: selectedVariant?.size || null,
        color: selectedVariant?.color || null,
        sku: selectedVariant?.sku || null,
      },
    };

    const result = storeAddItem(cartItem);

    if (result?.blocked) {
      setPendingCartItem(cartItem);
      setConflictVendorName(result.existingVendorName);
      return;
    }

    setAdded(true);
    setTimeout(() => setAdded(false), 1600);
  };

  const confirmVendorSwitch = () => {
    if (pendingCartItem) {
      storeAddItem(pendingCartItem, { force: true });
      setAdded(true);
      setTimeout(() => setAdded(false), 1600);
    }
    setPendingCartItem(null);
    setConflictVendorName(null);
  };

  const cancelVendorSwitch = () => {
    setPendingCartItem(null);
    setConflictVendorName(null);
  };

  // Native share sheet where supported (mobile browsers, most modern
  // desktop browsers); falls back to copying the link to the clipboard
  // with brief inline feedback where navigator.share isn't available.
  const handleShare = async () => {
    if (!product) return;

    const shareData = {
      title: product.name,
      text: `Check out ${product.name}${vendor ? ` from ${vendor.legal_name}` : ''}`,
      url: window.location.href,
    };

    try {
      if (navigator.share) {
        await navigator.share(shareData);
      } else {
        await navigator.clipboard.writeText(window.location.href);
        setShared(true);
        setTimeout(() => setShared(false), 1800);
      }
    } catch (err) {
      // AbortError when the person cancels the native share sheet — not a
      // real failure, nothing to show for it.
    }
  };

  if (loading) {
    return (
      <div className="w-full max-w-2xl mx-auto animate-pulse px-4 pt-4">
        <div className="space-y-6">
          <div className="w-full aspect-[4/3] rounded-3xl bg-slate-200 dark:bg-slate-800" />
          <div className="space-y-3 pt-2">
            <div className="h-8 w-1/2 rounded bg-slate-200 dark:bg-slate-800" />
            <div className="h-5 w-3/4 rounded bg-slate-200 dark:bg-slate-800" />
            <div className="h-4 w-1/3 rounded bg-slate-200 dark:bg-slate-800" />
            <div className="h-20 w-full rounded bg-slate-200 dark:bg-slate-800" />
          </div>
        </div>
      </div>
    );
  }

  // Treat a suspended vendor the same as a missing product — if they
  // shouldn't be visible anywhere, a direct link to their product shouldn't
  // work either.
  if (!product || vendor?.account_status === 'suspended') {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center px-4">
        <span className="text-4xl mb-3">🔍</span>
        <p className="text-sm font-black text-slate-900 dark:text-white">Item not found</p>
        <p className="text-xs text-slate-400 mt-1">It may have been removed by the vendor</p>
        <button onClick={() => router.push('/')} className="mt-4 text-xs font-black text-blue-500">
          Back to home
        </button>
      </div>
    );
  }

  return (
    <div className="relative w-full max-w-2xl mx-auto pb-24 lg:pb-12 px-4 lg:px-6">

      {/* Single column, always — image gallery on top, details below,
          regardless of screen size. */}
      <div className="space-y-6">

        {/* ── Image gallery ──────────────────────────────────────────────── */}
        <div className="space-y-3">
          <div className="relative w-full aspect-[4/3] rounded-2xl overflow-hidden bg-slate-100 dark:bg-slate-900 border border-slate-100 dark:border-slate-800 shadow-sm">
            {images.length > 0
              ? <GalleryImage src={images[activeImage]} alt={product.name} />
              : <div className="w-full h-full flex items-center justify-center"><ShoppingBag className="w-14 h-14 text-slate-300" /></div>
            }

            <button
              onClick={() => router.back()}
              aria-label="Go back"
              className="absolute top-4 left-4 w-10 h-10 rounded-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 flex items-center justify-center shadow-md active:scale-95 transition-transform"
            >
              <ChevronLeft className="w-5 h-5 text-slate-900 dark:text-white" />
            </button>

            <button
              onClick={handleShare}
              aria-label="Share this product"
              className="absolute top-4 right-4 w-10 h-10 rounded-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 flex items-center justify-center shadow-md active:scale-95 transition-transform"
            >
              {shared ? (
                <Check className="w-4 h-4 text-emerald-500" />
              ) : (
                <Share2 className="w-4 h-4 text-slate-900 dark:text-white" />
              )}
            </button>

            {product.is_featured && (
              <span className="absolute bottom-4 left-4 text-[10px] font-black uppercase tracking-wide px-2.5 py-1 rounded-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-blue-600 dark:text-blue-400 shadow-sm">
                Featured
              </span>
            )}

            {!product.is_available && (
              <div className="absolute inset-0 bg-black/45 flex items-center justify-center">
                <span className="text-white text-xs font-black uppercase tracking-wide px-3 py-1.5 rounded-full bg-black/50 border border-white/20">
                  Out of stock
                </span>
              </div>
            )}

            {images.length > 1 && (
              <span className="absolute bottom-4 right-4 text-[10px] font-black px-2 py-1 rounded-full bg-black/60 text-white">
                {activeImage + 1}/{images.length}
              </span>
            )}

            {images.length > 1 && (
              <>
                <button
                  onClick={() => setActiveImage(i => (i - 1 + images.length) % images.length)}
                  aria-label="Previous photo"
                  className="absolute left-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-white/90 dark:bg-slate-900/90 border border-slate-200 dark:border-slate-700 flex items-center justify-center shadow active:scale-90 transition-transform"
                >
                  <ChevronLeft className="w-4 h-4 text-slate-900 dark:text-white" />
                </button>
                <button
                  onClick={() => setActiveImage(i => (i + 1) % images.length)}
                  aria-label="Next photo"
                  className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-white/90 dark:bg-slate-900/90 border border-slate-200 dark:border-slate-700 flex items-center justify-center shadow active:scale-90 transition-transform"
                >
                  <ChevronRight className="w-4 h-4 text-slate-900 dark:text-white" />
                </button>
              </>
            )}
          </div>

          {shared && (
            <p className="text-center text-[11px] font-bold text-emerald-500">Link copied to clipboard</p>
          )}

          {images.length > 1 && (
            <div className="flex gap-2 overflow-x-auto pb-1">
              {images.map((url, i) => (
                <button
                  key={url + i}
                  onClick={() => setActiveImage(i)}
                  className={cn(
                    'relative w-16 h-16 shrink-0 rounded-xl overflow-hidden border-2 transition-all duration-150',
                    activeImage === i
                      ? 'border-slate-900 dark:border-white shadow-sm'
                      : 'border-transparent opacity-60 hover:opacity-100 hover:border-slate-300 dark:hover:border-slate-600',
                  )}
                >
                  <img
                    src={url}
                    alt=""
                    loading="lazy"
                    decoding="async"
                    className="w-full h-full object-cover"
                  />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* ── Details ──────────────────────────────────────────────────────── */}
        <div className="divide-y divide-slate-100 dark:divide-slate-800">

          {/* Ordering blocked banner — closed store OR suspended student */}
          {orderingBlockedReason && (
            <div className="pb-5">
              <div className="flex items-start gap-2.5 rounded-2xl border border-rose-500/20 bg-rose-500/5 px-4 py-3.5">
                <orderingBlockedReason.icon className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
                <p className="text-xs font-bold text-rose-600 dark:text-rose-400">
                  {orderingBlockedReason.text}
                </p>
              </div>
            </div>
          )}

          <div className="flex items-center justify-between">
            <div className="pb-5 space-y-2">
              {product.category && (
                <p className="text-[9px] text-blue-600 font-bold uppercase tracking-[0.13em] dark:text-blue-400">
                  {product.category}
                </p>
              )}
              <h1 className="text-xl lg:text-2xl font-black text-slate-900 dark:text-white leading-snug">
                {product.name}
              </h1>
              <div className="flex items-center gap-1.5">
                <Star className="w-4 h-4" style={{ fill: '#fbbf24', color: '#fbbf24' }} />
                <span className="text-sm font-black text-slate-900 dark:text-white">4.5</span>
              </div>
            </div>
            <p className="text-2xl font-bold text-blue-600 dark:text-blue-400 tracking-tight">
              ₦{unitPrice.toLocaleString()}
            </p>
          </div>

          {product.description && (
            <div className="py-4 space-y-1.5">
              <p className="text-[10px] font-black uppercase tracking-[0.13em] text-slate-400">Description</p>
              <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                {product.description}
              </p>
            </div>
          )}

          {/* ── Order Duration ──────────────────────────────────────────────── */}
          {durationDays && (
            <div className="py-4 space-y-1.5">
              <p className="text-[10px] font-black uppercase tracking-[0.13em] text-slate-400">Order Duration</p>
              <div className="flex items-center gap-2 text-sm font-bold text-slate-700 dark:text-slate-200">
                <Clock className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0" />
                <span>
                  {durationDays} {durationDays === 1 ? 'day' : 'days'}
                </span>
              </div>
            </div>
          )}

          {colors.length > 0 && (
            <div className="py-4 space-y-2">
              <div className="flex items-center justify-between">
                <p className="text-[10px] font-black uppercase tracking-[0.13em] text-slate-400">Colors</p>
                <span className="text-xs font-bold text-slate-500 dark:text-slate-400 capitalize">{selectedColor}</span>
              </div>
              <div className="flex flex-wrap gap-3">
                {colors.map(color => {
                  const inStock = colorHasStock(color);
                  const active = selectedColor === color;
                  return (
                    <button
                      key={color}
                      onClick={() => setSelectedColor(color)}
                      title={color}
                      className={cn(
                        'relative w-10 h-10 rounded-full border-2 transition-all shrink-0',
                        active ? 'border-slate-900 dark:border-white scale-110' : 'border-slate-200 dark:border-slate-700 hover:border-slate-400',
                        !inStock && 'opacity-35',
                      )}
                      style={{ background: swatchColor(color) }}
                    >
                      {active && (
                        <span className="absolute inset-0 flex items-center justify-center">
                          <Check className="w-4 h-4 text-white drop-shadow-[0_1px_1px_rgba(0,0,0,0.7)]" />
                        </span>
                      )}
                      {!inStock && (
                        <span className="absolute -bottom-1 -right-1 w-3.5 h-3.5 rounded-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-600 flex items-center justify-center">
                          <span className="w-2 h-px bg-slate-400 rotate-45" />
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {sizes.length > 0 && (
            <div className="py-4 space-y-2">
              <div className="flex items-center justify-between">
                <p className="text-[10px] font-black uppercase tracking-[0.13em] text-slate-400">Size</p>
                <span className="text-xs font-bold text-slate-500 dark:text-slate-400">{selectedSize}</span>
              </div>
              <div className="flex flex-wrap gap-2">
                {sizes.map(size => {
                  const inStock = sizeHasStock(size);
                  const active = selectedSize === size;
                  return (
                    <button
                      key={size}
                      onClick={() => setSelectedSize(size)}
                      className={cn(
                        'relative w-12 h-12 rounded-xl border text-sm font-black flex items-center justify-center transition-all',
                        active
                          ? 'border-slate-900 dark:border-white bg-slate-900 dark:bg-white text-white dark:text-slate-900'
                          : 'border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:border-slate-400',
                        !inStock && 'opacity-40',
                      )}
                    >
                      {size}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {hasVariants && (
            <div className="py-4">
              <p className={cn(
                'text-xs font-bold',
                !selectedVariant ? 'text-slate-400' :
                selectedVariant.stock === 0 ? 'text-red-500' :
                selectedVariant.stock <= 5 ? 'text-amber-600 dark:text-amber-400' : 'text-emerald-600 dark:text-emerald-400',
              )}>
                {!selectedVariant
                  ? 'This combination is not available'
                  : selectedVariant.stock === 0
                    ? 'Out of stock in this option'
                    : `${selectedVariant.stock} in stock`}
              </p>
            </div>
          )}

          {vendor && (
            <div className="py-5">
              <Link
                href={`/store/${vendor.user_id}`}
                className="flex items-center gap-3 p-3 rounded-2xl border border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-blue-200 dark:hover:border-blue-800 transition-colors group"
              >
                <div className="relative shrink-0">
                  {vendor.avatar_url
                    ? <img src={vendor.avatar_url} alt={vendor.legal_name} loading="lazy" decoding="async" className="w-11 h-11 rounded-full object-cover" />
                    : <AvatarPlaceholder name={vendor.legal_name} category={vendor.category} />
                  }
                  <span className={cn(
                    'absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-white dark:border-slate-900',
                    vendor.is_open ? 'bg-emerald-500' : 'bg-slate-300 dark:bg-slate-600',
                  )} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-black text-slate-900 dark:text-white truncate">
                    {vendor.legal_name}
                  </p>
                  <p className="text-[11px] text-slate-400">
                    {vendor.is_open ? 'Open now' : 'Closed'} · View store
                  </p>
                </div>
                <ChevronRight className="w-4 h-4 text-slate-300 dark:text-slate-700 shrink-0 group-hover:text-blue-400 group-hover:translate-x-0.5 transition-all" />
              </Link>
            </div>
          )}

          <div className="hidden lg:flex items-center gap-3 pt-5">
            <div className="flex items-center gap-3 px-1 shrink-0">
              <button
                onClick={() => setQty(q => Math.max(1, q - 1))}
                className="w-9 h-9 rounded-full border border-slate-200 dark:border-slate-700 flex items-center justify-center text-slate-500 active:scale-90 transition-transform"
              >
                <Minus className="w-3.5 h-3.5" />
              </button>
              <span className="w-6 text-center text-sm font-black text-slate-900 dark:text-white">{qty}</span>
              <button
                onClick={() => setQty(q => Math.min(maxQty, q + 1))}
                disabled={qty >= maxQty}
                className="w-9 h-9 rounded-full border border-slate-200 dark:border-slate-700 flex items-center justify-center text-slate-500 active:scale-90 transition-transform disabled:opacity-30 disabled:active:scale-100"
              >
                <Plus className="w-3.5 h-3.5" />
              </button>
            </div>
            <button
              onClick={handleAddToCart}
              disabled={!canAdd}
              className={cn(
                'flex-1 h-12 rounded-2xl font-black text-sm flex items-center justify-center gap-2 transition-all active:scale-[0.98]',
                !canAdd
                  ? 'bg-slate-100 dark:bg-slate-800 text-slate-400 cursor-not-allowed'
                  : added
                    ? 'bg-emerald-500 text-white'
                    : 'bg-slate-900 dark:bg-white text-white dark:text-slate-900',
              )}
            >
              {added ? (<><Check className="w-4 h-4" /> Added to cart</>) : (
                <><ShoppingBag className="w-4 h-4" /> Add to Cart — ₦{(unitPrice * qty).toLocaleString()}</>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* ── Sticky mobile Add to Cart bar — sits above the bottom nav ────────── */}
      <div
        className="fixed left-0 right-0 z-20 lg:hidden"
        style={{ bottom: '64px' }}
      >
        <div className="max-w-lg mx-auto px-4 pb-3 pt-3 bg-white/95 dark:bg-slate-950 backdrop-blur border-t border-slate-100 dark:border-slate-800 shadow-[0_-4px_12px_rgba(0,0,0,0.04)]">
          <div className="flex items-center gap-3">
            {/* Quantity steppers are always usable — NOT tied to canAdd */}
            <div className="flex items-center gap-3 px-1 shrink-0">
              <button
                onClick={() => setQty(q => Math.max(1, q - 1))}
                className="w-8 h-8 rounded-full border border-slate-200 dark:border-slate-700 flex items-center justify-center text-slate-500 active:scale-90 transition-transform"
              >
                <Minus className="w-3.5 h-3.5" />
              </button>
              <span className="w-5 text-center text-sm font-black text-slate-900 dark:text-white">{qty}</span>
              <button
                onClick={() => setQty(q => Math.min(maxQty, q + 1))}
                disabled={qty >= maxQty}
                className="w-8 h-8 rounded-full border border-slate-200 dark:border-slate-700 flex items-center justify-center text-slate-500 active:scale-90 transition-transform disabled:opacity-30 disabled:active:scale-100"
              >
                <Plus className="w-3.5 h-3.5" />
              </button>
            </div>

            <button
              onClick={handleAddToCart}
              disabled={!canAdd}
              className={cn(
                'flex-1 h-12 rounded-2xl font-black text-sm flex items-center justify-center gap-2 transition-all active:scale-[0.98]',
                !canAdd
                  ? 'bg-blue-600 text-slate-400 cursor-not-allowed'
                  : added
                    ? 'bg-blue-500 text-white'
                    : 'bg-blue-600 text-white ',
              )}
            >
              {added ? (
                <><Check className="w-4 h-4" /> Added to cart</>
              ) : canAdd ? (
                `Add to Cart — ₦ ${(unitPrice * qty).toLocaleString()}`
              ) : orderingBlockedReason ? (
                orderingBlockedReason.text
              ) : !variantAvailable ? (
                'Select an option'
              ) : (
                'Unavailable'
              )}
            </button>
          </div>
        </div>
      </div>

      {/* ── Vendor conflict prompt ──────────────────────────────────────────── */}
      {pendingCartItem && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-5">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-[2px]" onClick={cancelVendorSwitch} />
          <div className="relative w-full max-w-sm bg-white dark:bg-slate-900 rounded-2xl shadow-2xl p-5">
            <div className="flex items-start justify-between">
              <h3 className="text-base font-black text-slate-900 dark:text-white">Start a new order?</h3>
              <button onClick={cancelVendorSwitch} className="text-slate-400 hover:text-slate-600">
                <X className="w-4 h-4" />
              </button>
            </div>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-2">
              Your cart has items from <span className="font-bold">{conflictVendorName}</span>. Adding this item will clear your current cart and start a new order from {vendor?.legal_name}.
            </p>
            <div className="flex gap-2 mt-5">
              <button
                onClick={cancelVendorSwitch}
                className="flex-1 h-11 rounded-full border border-slate-200 dark:border-slate-700 text-sm font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={confirmVendorSwitch}
                className="flex-1 h-11 rounded-full text-sm font-black text-white hover:opacity-90 transition-opacity"
                style={{ backgroundColor: '#2563eb' }}
              >
                Clear & Continue
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}