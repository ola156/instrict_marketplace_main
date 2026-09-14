'use client';

import { useEffect, useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/utils/supabase/client';
import { useCartStore } from '@/store/useCartStore';
import {
  ChevronLeft, ImageOff, MessageCircle, Upload, X,
  FileText, Minus, Plus, Loader2, AlertTriangle,
} from 'lucide-react';

function cn(...c) { return c.filter(Boolean).join(' '); }

const CLOUD_NAME = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
const UPLOAD_PRESET = process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET;

async function uploadToCloudinary(file) {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('upload_preset', UPLOAD_PRESET);
  formData.append('folder', 'instrict/print-orders');
  const res = await fetch(`https://api.cloudinary.com/v1_1/${CLOUD_NAME}/auto/upload`, {
    method: 'POST',
    body: formData,
  });
  const data = await res.json();
  if (!data.secure_url) throw new Error('Upload failed');
  return data.secure_url;
}

function formatNaira(value) {
  if (value === null || value === undefined || value === '') return '';
  const num = Number(String(value).replace(/[^\d.]/g, ''));
  if (Number.isNaN(num)) return String(value);
  return `₦${num.toLocaleString()}`;
}

const GRADIENTS = [
  'from-blue-500 to-indigo-600',
  'from-emerald-500 to-teal-600',
  'from-orange-500 to-rose-500',
  'from-purple-500 to-fuchsia-600',
  'from-cyan-500 to-blue-600',
  'from-amber-500 to-orange-600',
];

// Reads the actual field: sub_categories is an array, e.g. ["Printing & Photocopying"].
function isPrintingVendor(vendor) {
  return vendor.sub_categories?.includes('Printing & Photocopying');
}

export default function ServiceStore({ vendor, canOrder, orderingBlockedReason }) {
  const router = useRouter();
  const supabase = createClient();
  const printing = isPrintingVendor(vendor);

  return (
    <div className="relative bg-slate-50 dark:bg-slate-950 min-h-screen w-full flex flex-col transition-colors duration-200">
      {/* ============ BANNER ============ */}
      <div className="w-full lg:flex lg:justify-center lg:pt-6 lg:px-4">
        <div
          className={cn(
            'w-full py-8 px-5 relative flex flex-col justify-between transition-all duration-300 overflow-hidden md:rounded-xl',
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
                {vendor.is_open ? 'Available now' : 'Currently offline'}
              </span>
              {vendor.sub_categories?.length > 0 && (
                <>
                  <span className="opacity-40">•</span>
                  <span>{vendor.sub_categories.join(' · ')}</span>
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ============ CONTENT ============ */}
      {printing ? (
        <PrintOrderBuilder
          vendor={vendor}
          supabase={supabase}
          router={router}
          canOrder={canOrder}
          orderingBlockedReason={orderingBlockedReason}
        />
      ) : (
        <GalleryAndMessage vendor={vendor} supabase={supabase} />
      )}
    </div>
  );
}

/* ============================================================
   NON-PRINTING VENDORS — Gallery (₦, clickable preview) + WhatsApp
   (No order-blocking here — WhatsApp messaging isn't a real order,
   so it's never gated on canOrder / orderingBlockedReason.)
============================================================ */

function GalleryAndMessage({ vendor, supabase }) {
  const [activeTab, setActiveTab] = useState('gallery');
  const [items, setItems] = useState([]);
  const [galleryLoading, setGalleryLoading] = useState(true);
  const [galleryError, setGalleryError] = useState('');

  useEffect(() => { fetchGallery(); }, [vendor?.user_id]);

  const fetchGallery = async () => {
    if (!vendor?.user_id) return;
    const { data, error } = await supabase
      .from('portfolio_items')
      .select('vendor_id,image_url,description,price_tag,created_at')
      .eq('vendor_id', vendor.user_id)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('portfolio_items fetch error:', error.message);
      setGalleryError(error.message);
    }
    setItems(data || []);
    setGalleryLoading(false);
  };

  return (
    <>
      <div className="w-full bg-slate-50 dark:bg-slate-950 border-b border-slate-100 dark:border-slate-800/60 py-3.5 px-4 sticky top-0 z-20">
        <div className="flex gap-2 max-w-2xl lg:max-w-5xl mx-auto">
          {[
            { key: 'gallery', label: 'Gallery' },
            { key: 'action', label: 'Send a Message' },
          ].map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={cn(
                'shrink-0 text-[11px] lg:text-xs font-bold px-4 py-2 lg:px-5 lg:py-2.5 rounded-full border whitespace-nowrap transition-all duration-200',
                activeTab === tab.key
                  ? 'bg-blue-600 border-blue-600 text-white shadow-xs'
                  : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-50'
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 w-full max-w-2xl lg:max-w-5xl mx-auto px-4 py-5 lg:py-8">
        {activeTab === 'gallery' ? (
          <GalleryTab loading={galleryLoading} error={galleryError} items={items} />
        ) : (
          <WhatsAppTab vendor={vendor} />
        )}
      </div>
    </>
  );
}

function GalleryTab({ loading, error, items }) {
  const [previewImage, setPreviewImage] = useState(null);

  if (loading) {
    return (
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="rounded-2xl overflow-hidden border border-slate-100 dark:border-slate-800 animate-pulse">
            <div className="aspect-[4/3] bg-slate-200 dark:bg-slate-800" />
            <div className="p-3 space-y-2">
              <div className="h-2.5 w-3/4 rounded bg-slate-200 dark:bg-slate-800" />
              <div className="h-2.5 w-1/3 rounded bg-slate-200 dark:bg-slate-800" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <p className="text-xs font-black text-rose-500">Couldn't load the gallery</p>
        <p className="text-[11px] text-slate-400 mt-1">{error}</p>
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <span className="text-4xl mb-3">🖼️</span>
        <p className="text-xs font-black text-slate-900 dark:text-white">No work uploaded yet</p>
        <p className="text-[11px] text-slate-400 mt-1">Check back soon</p>
      </div>
    );
  }

  return (
    <>
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
        {items.map((item, i) => {
          const gradient = GRADIENTS[i % GRADIENTS.length];
          return (
            <div
              key={`${item.vendor_id}-${item.created_at}-${i}`}
              className="group flex flex-col overflow-hidden bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 hover:border-blue-200 dark:hover:border-blue-800 hover:shadow-sm rounded-2xl transition-all duration-300 hover:-translate-y-0.5"
            >
              <button
                type="button"
                onClick={() => item.image_url && setPreviewImage(item.image_url)}
                className={cn(
                  'w-full aspect-[4/3] relative overflow-hidden bg-slate-100 dark:bg-slate-800',
                  item.image_url ? 'cursor-zoom-in' : 'cursor-default'
                )}
              >
                {item.image_url ? (
                  <img
                    src={item.image_url}
                    alt={item.description || 'Past work'}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    loading="lazy"
                  />
                ) : (
                  <div className={cn('w-full h-full flex items-center justify-center bg-gradient-to-br', gradient)}>
                    <ImageOff className="w-6 h-6 text-white/70" />
                  </div>
                )}
              </button>

              {(item.description || item.price_tag) && (
                <div className="p-3 flex-1 flex flex-col justify-between gap-2">
                  {item.description && (
                    <p className="text-xs font-semibold text-slate-700 dark:text-slate-200 leading-snug line-clamp-2">
                      {item.description}
                    </p>
                  )}
                  {item.price_tag && (
                    <span className="self-start text-[9px] font-mono font-black bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400 px-2 py-0.5 rounded">
                      {formatNaira(item.price_tag)}
                    </span>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {previewImage && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center p-4"
          onClick={() => setPreviewImage(null)}
        >
          <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" />
          <button
            onClick={() => setPreviewImage(null)}
            className="absolute top-4 right-4 z-10 h-9 w-9 rounded-full bg-white/10 backdrop-blur-md flex items-center justify-center text-white border border-white/10 hover:bg-white/20 transition-all"
          >
            <X className="w-4 h-4" />
          </button>
          <img
            src={previewImage}
            alt="Preview"
            onClick={(e) => e.stopPropagation()}
            className="relative z-10 max-h-[85vh] max-w-full rounded-2xl object-contain shadow-2xl"
          />
        </div>
      )}
    </>
  );
}

function WhatsAppTab({ vendor }) {
  const [message, setMessage] = useState('');

  const sendToWhatsApp = () => {
    if (!message.trim() || !vendor.support_phone) return;
    const phone = vendor.support_phone.replace(/[^\d]/g, '');
    const url = `https://wa.me/${phone}?text=${encodeURIComponent(message.trim())}`;
    window.open(url, '_blank');
  };

  return (
    <div className="max-w-lg mx-auto space-y-5">
      <div>
        <p className="text-sm font-black text-slate-900 dark:text-white">Message {vendor.legal_name}</p>
        <p className="text-xs text-slate-400 mt-1">
          Type what you need — it'll open in WhatsApp ready to send.
        </p>
      </div>

      <textarea
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        rows={5}
        placeholder="Hi! I'd like to ask about..."
        className="w-full rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm text-slate-900 dark:text-white placeholder:text-slate-400 p-4 outline-none focus:ring-2 focus:ring-blue-500/20 transition-all resize-none"
      />

      {!vendor.support_phone && (
        <p className="text-[11px] font-bold text-rose-500">
          This vendor hasn't added a WhatsApp number yet.
        </p>
      )}

      <button
        onClick={sendToWhatsApp}
        disabled={!message.trim() || !vendor.support_phone}
        className="w-full h-12 rounded-full text-white font-black text-sm flex items-center justify-center gap-2 transition-opacity hover:opacity-90 disabled:opacity-50"
        style={{ backgroundColor: '#25D366' }}
      >
        <MessageCircle className="w-4 h-4" />
        Send on WhatsApp
      </button>
    </div>
  );
}

/* ============================================================
   PRINTING VENDORS — price list drives the customization,
   builds one cart line item and hands off to the shared
   cart-driven /checkout flow (same pipeline as Canteen/Retail).
   This is the ONLY place a real order happens, so it's the only
   place canOrder gates submission and orderingBlockedReason renders.
============================================================ */

function PrintOrderBuilder({ vendor, supabase, router, canOrder, orderingBlockedReason }) {
  const addItem = useCartStore((s) => s.addItem);

  const [priceItems, setPriceItems] = useState([]);
  const [priceLoading, setPriceLoading] = useState(true);
  const [priceError, setPriceError] = useState('');

  const [quantities, setQuantities] = useState({});
  const [flatSelected, setFlatSelected] = useState({});

  const [files, setFiles] = useState([]);
  const [description, setDescription] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const [conflict, setConflict] = useState(null);

  useEffect(() => { fetchPriceList(); }, [vendor?.user_id]);

  const fetchPriceList = async () => {
    if (!vendor?.user_id) return;
    const { data, error } = await supabase
      .from('service_price_matrix')
      .select('id,label,price,unit,created_at')
      .eq('vendor_id', vendor.user_id)
      .order('created_at', { ascending: true });

    if (error) {
      console.error('service_price_matrix fetch error:', error.message);
      setPriceError(error.message);
    }
    setPriceItems(data || []);
    setPriceLoading(false);
  };

  const keyOf = (item) => item.id;
  const isFlat = (item) => !item.unit;

  const adjustQty = (key, delta) => {
    setQuantities((prev) => ({ ...prev, [key]: Math.max(0, (prev[key] || 0) + delta) }));
  };

  const toggleFlat = (key) => {
    setFlatSelected((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const selectedLines = useMemo(() => {
    return priceItems
      .map((item) => {
        const key = keyOf(item);
        const unitPrice = Number(item.price) || 0;
        if (isFlat(item)) {
          if (!flatSelected[key]) return null;
          return { label: item.label, qty: 1, unitPrice, subtotal: unitPrice };
        }
        const qty = quantities[key] || 0;
        if (qty <= 0) return null;
        return { label: item.label, unit: item.unit, qty, unitPrice, subtotal: qty * unitPrice };
      })
      .filter(Boolean);
  }, [priceItems, quantities, flatSelected]);

  const total = selectedLines.reduce((sum, l) => sum + l.subtotal, 0);

  const handleFileSelect = (e) => {
    const picked = Array.from(e.target.files || []);
    const tooBig = picked.filter((f) => f.size > 10 * 1024 * 1024);
    if (tooBig.length) {
      setError('Each file must be under 10MB');
      e.target.value = '';
      return;
    }
    setError('');
    setFiles((prev) => [...prev, ...picked]);
    e.target.value = '';
  };

  const removeFile = (index) => setFiles((prev) => prev.filter((_, i) => i !== index));

  const canSubmit = files.length > 0 && total > 0 && !submitting && canOrder;

  const commitToCart = (pendingItem, { force = false } = {}) => {
    const result = addItem(pendingItem, { force });
    if (result.blocked) {
      setConflict({ pendingItem, existingVendorName: result.existingVendorName });
      setSubmitting(false);
      return false;
    }
    router.push('/checkout');
    return true;
  };

  const handleSubmit = async () => {
    setError('');
    if (!canSubmit) return;
    setSubmitting(true);

    try {
      const fileUrls = await Promise.all(files.map(uploadToCloudinary));

      const pendingItem = {
        vendorId: vendor.user_id,
        vendorName: vendor.legal_name,
        type: 'service_fixed',
        name: 'Print Job',
        unitPrice: total,
        quantity: 1,
        meta: {
          files: fileUrls,
          breakdown: selectedLines,
          notes: description.trim(),
        },
      };

      commitToCart(pendingItem);
    } catch (err) {
      console.error('print order submit error:', err.message);
      setError('Upload failed. Check your connection and try again.');
      setSubmitting(false);
    }
  };

  const confirmSwap = () => {
    if (!conflict) return;
    commitToCart(conflict.pendingItem, { force: true });
    setConflict(null);
  };

  if (priceLoading) {
    return (
      <div className="flex-1 w-full max-w-2xl lg:max-w-5xl mx-auto px-4 py-8">
        <div className="max-w-lg mx-auto space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-14 rounded-2xl bg-slate-200 dark:bg-slate-800 animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  if (priceError) {
    return (
      <div className="flex-1 w-full max-w-2xl mx-auto px-4 py-16 text-center">
        <p className="text-xs font-black text-rose-500">Couldn't load pricing</p>
        <p className="text-[11px] text-slate-400 mt-1">{priceError}</p>
      </div>
    );
  }

  if (priceItems.length === 0) {
    return (
      <div className="flex-1 w-full max-w-2xl mx-auto px-4 py-16 text-center">
        <span className="text-4xl mb-3 block">🖨️</span>
        <p className="text-xs font-black text-slate-900 dark:text-white">Pricing not set up yet</p>
        <p className="text-[11px] text-slate-400 mt-1">{vendor.legal_name} hasn't added their price list</p>
      </div>
    );
  }

  return (
    <div className="flex-1 w-full max-w-2xl lg:max-w-5xl mx-auto px-4 py-5 lg:py-8">
      {/* ============ ORDERING BLOCKED BANNER ============ */}
      {orderingBlockedReason && (
        <div className="max-w-lg mx-auto mb-5">
          <div className="flex items-start gap-2.5 rounded-2xl border border-amber-500/20 bg-amber-500/5 px-4 py-3.5">
            <orderingBlockedReason.icon className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
            <div>
              <p className="text-xs font-black text-amber-600 dark:text-amber-400">{orderingBlockedReason.title}</p>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">{orderingBlockedReason.detail}</p>
            </div>
          </div>
        </div>
      )}

      <div className="max-w-lg mx-auto space-y-6">

        <div>
          <p className="text-sm font-black text-slate-900 dark:text-white">Price list</p>
          <p className="text-xs text-slate-400 mt-1">
            Pick what you need — the total updates as you go.
          </p>
        </div>

        <div className="space-y-2">
          <label className="text-[11px] font-bold text-slate-500 dark:text-slate-400">
            Documents / Photos
          </label>
          <label className="flex flex-col items-center justify-center gap-1.5 border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-2xl py-6 cursor-pointer hover:border-blue-400 dark:hover:border-blue-500 transition-colors">
            <Upload className="w-5 h-5 text-slate-400" />
            <span className="text-xs font-bold text-slate-500 dark:text-slate-400">
              Tap to upload files or images
            </span>
            <input
              type="file"
              multiple
              accept=".pdf,.doc,.docx,.ppt,.pptx,image/*"
              onChange={handleFileSelect}
              className="hidden"
            />
          </label>

          {files.length > 0 && (
            <div className="space-y-1.5">
              {files.map((file, i) => (
                <div
                  key={`${file.name}-${i}`}
                  className="flex items-center justify-between gap-2 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-xl px-3 py-2"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <FileText className="w-4 h-4 text-blue-500 shrink-0" />
                    <span className="text-xs font-semibold text-slate-700 dark:text-slate-200 truncate">
                      {file.name}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => removeFile(i)}
                    className="h-6 w-6 rounded-full flex items-center justify-center text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 shrink-0"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="space-y-2">
          <label className="text-[11px] font-bold text-slate-500 dark:text-slate-400">
            Customize your order
          </label>
          <div className="space-y-2">
            {priceItems.map((item) => {
              const key = keyOf(item);
              const unitPrice = Number(item.price) || 0;

              if (isFlat(item)) {
                const selected = !!flatSelected[key];
                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => toggleFlat(key)}
                    className={cn(
                      'w-full flex items-center justify-between gap-3 rounded-2xl border px-4 py-3 transition-colors',
                      selected
                        ? 'bg-blue-50 dark:bg-blue-500/10 border-blue-300 dark:border-blue-700'
                        : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700'
                    )}
                  >
                    <span className="text-sm font-bold text-slate-800 dark:text-slate-200">{item.label}</span>
                    <span className="text-xs font-mono font-black text-slate-500 dark:text-slate-400">
                      {formatNaira(unitPrice)}
                    </span>
                  </button>
                );
              }

              const qty = quantities[key] || 0;
              return (
                <div
                  key={key}
                  className="flex items-center justify-between gap-3 rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-4 py-3"
                >
                  <div>
                    <p className="text-sm font-bold text-slate-800 dark:text-slate-200">{item.label}</p>
                    <p className="text-[11px] text-slate-400">{formatNaira(unitPrice)} / {item.unit}</p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      type="button"
                      onClick={() => adjustQty(key, -1)}
                      className="h-7 w-7 rounded-full flex items-center justify-center text-slate-500 border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800"
                    >
                      <Minus className="w-3.5 h-3.5" />
                    </button>
                    <span className="w-5 text-center text-sm font-black text-slate-900 dark:text-white">{qty}</span>
                    <button
                      type="button"
                      onClick={() => adjustQty(key, 1)}
                      className="h-7 w-7 rounded-full flex items-center justify-center text-slate-500 border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800"
                    >
                      <Plus className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="space-y-2">
          <label className="text-[11px] font-bold text-slate-500 dark:text-slate-400">
            Any other instructions?
          </label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
            placeholder="Paper size, single or double-sided, layout notes..."
            className="w-full rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm text-slate-900 dark:text-white placeholder:text-slate-400 p-4 outline-none focus:ring-2 focus:ring-blue-500/20 transition-all resize-none"
          />
        </div>

        {error && <p className="text-[11px] font-bold text-rose-500">{error}</p>}
      </div>

      <div className="inset-x-0 z-30 bg-white dark:bg-slate-900 border-t border-slate-100 dark:border-slate-800 px-6 md:px-4 py-3 rounded-2xl mt-2">
        <div className="max-w-lg mx-auto flex items-center gap-3">
          <div className="flex-1">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Total</p>
            <p className="text-lg font-black text-slate-900 dark:text-white leading-tight">
              {formatNaira(total)}
            </p>
          </div>
          <button
            onClick={handleSubmit}
            disabled={!canSubmit}
            className="h-12 px-6 rounded-full text-white font-black text-sm flex items-center justify-center gap-2 transition-opacity hover:opacity-90 disabled:opacity-50 shrink-0"
            style={{ backgroundColor: '#2563eb' }}
          >
            {submitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Uploading...
              </>
            ) : (
              'Continue to Checkout'
            )}
          </button>
        </div>
        {!canSubmit && !submitting && (
          <p className="max-w-lg mx-auto text-[10px] text-slate-400 mt-1.5">
            {!canOrder
              ? 'Ordering is currently unavailable — see the notice above.'
              : 'Upload a file and select at least one item to continue.'}
          </p>
        )}
      </div>

      {conflict && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-5">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-[2px]" onClick={() => setConflict(null)} />
          <div className="relative w-full max-w-xs bg-white dark:bg-slate-900 rounded-2xl shadow-2xl p-5">
            <div className="flex items-start gap-2.5">
              <div className="h-8 w-8 rounded-full bg-amber-100 dark:bg-amber-500/10 flex items-center justify-center shrink-0">
                <AlertTriangle className="w-4 h-4 text-amber-500" />
              </div>
              <div className="flex-1">
                <h3 className="text-sm font-black text-slate-900 dark:text-white">Replace your cart?</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  Your cart has items from {conflict.existingVendorName}. Adding this print job will clear them.
                </p>
              </div>
            </div>
            <div className="flex gap-2 mt-4">
              <button
                onClick={() => setConflict(null)}
                className="flex-1 h-9 rounded-full border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={confirmSwap}
                className="flex-1 h-9 rounded-full bg-blue-600 hover:bg-blue-700 text-xs font-black text-white transition-colors"
              >
                Replace
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}