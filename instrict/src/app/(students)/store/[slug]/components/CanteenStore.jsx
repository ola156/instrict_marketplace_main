'use client';

import { useEffect, useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/utils/supabase/client';
import { ChevronLeft, Star, Plus, Check, X } from 'lucide-react';
import { useCartStore } from '@/store/useCartStore'; // adjust path/name if yours differs

function cn(...c) { return c.filter(Boolean).join(' '); }



export default function CanteenStore({ vendor, canOrder, orderingBlockedReason }) {
  const router = useRouter();
  const supabase = createClient();

  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState('All');
  const [error, setError] = useState('');

  // --- Customize Order modal state ---
  const [customizeItem, setCustomizeItem] = useState(null); // menu item being customized
  const [extras, setExtras] = useState([]); // flat list of menu_extras rows for that item
  const [selectedExtraIds, setSelectedExtraIds] = useState([]);
  const [extrasLoading, setExtrasLoading] = useState(false);

  // --- Cart store integration (matches actual useCartStore.js API) ---
  const cartItems = useCartStore((state) => state.items);
  const storeAddItem = useCartStore((state) => state.addItem);
  const updateQuantity = useCartStore((state) => state.updateQuantity);

  // Vendor-conflict prompt state (store signals this via addItem's return value)
  const [pendingCartItem, setPendingCartItem] = useState(null);
  const [conflictVendorName, setConflictVendorName] = useState(null);

  // Deterministic line id: same item + same chosen extras = same cart line,
  // so repeated adds bump quantity instead of creating duplicate lines.
  const buildLineId = (item, chosenExtras = []) => {
    const extrasKey = chosenExtras.map((e) => e.id).sort().join(',');
    return `${vendor.user_id}::${item.id}::${extrasKey}`;
  };

  // Total quantity of a menu item across ALL its extras variations,
  // for the quantity badge on the item row.
  const getItemQuantity = (menuItemId) => {
    return cartItems
      .filter((i) => i.meta?.menuItemId === menuItemId)
      .reduce((sum, i) => sum + i.quantity, 0);
  };

  const addToCart = (item, chosenExtras = [], unitPrice = item.base_price) => {
    const lineId = buildLineId(item, chosenExtras);
    const existingLine = cartItems.find((i) => i.id === lineId);

    if (existingLine) {
      updateQuantity(lineId, existingLine.quantity + 1);
      return;
    }

    const cartLine = {
      id: lineId,
      vendorId: vendor.user_id,
      vendorName: vendor.legal_name,
      type: 'canteen',
      name: item.name,
      image: item.image_url,
      unitPrice,
      quantity: 1,
      meta: {
        menuItemId: item.id,
        extras: chosenExtras.map((e) => ({ id: e.id, label: e.name, price: e.price })),
      },
    };

    const result = storeAddItem(cartLine);
    if (result?.blocked) {
      setPendingCartItem(cartLine);
      setConflictVendorName(result.existingVendorName);
    }
  };

  const confirmVendorSwitch = () => {
    if (pendingCartItem) {
      storeAddItem(pendingCartItem, { force: true });
    }
    setPendingCartItem(null);
    setConflictVendorName(null);
  };

  const cancelVendorSwitch = () => {
    setPendingCartItem(null);
    setConflictVendorName(null);
  };


  // Clicking + : check for extras first
  const handlePlusClick = async (item) => {
     if (!canOrder) return; // guard the action itself, not just the UI
    setExtrasLoading(true);
    const { data, error } = await supabase
      .from('menu_extras')
      .select('id,name,price,is_available,image_url,menu_item_id')
      .eq('menu_item_id', item.id)
      .eq('is_available', true)
      .order('name', { ascending: true });

    setExtrasLoading(false);

    if (error) {
      console.error('menu_extras fetch error:', error.message);
      addToCart(item); // don't block ordering on a DB hiccup
      return;
    }

    if (!data || data.length === 0) {
      addToCart(item);
      return;
    }

    setCustomizeItem(item);
    setExtras(data);
    setSelectedExtraIds([]);
  };

  const toggleExtra = (extraId) => {
    setSelectedExtraIds((prev) =>
      prev.includes(extraId) ? prev.filter((id) => id !== extraId) : [...prev, extraId]
    );
  };

  const selectedExtras = useMemo(
    () => extras.filter((e) => selectedExtraIds.includes(e.id)),
    [extras, selectedExtraIds]
  );

  const customizeTotal = useMemo(() => {
    if (!customizeItem) return 0;
    const extrasSum = selectedExtras.reduce((sum, e) => sum + Number(e.price || 0), 0);
    return Number(customizeItem.base_price) + extrasSum;
  }, [customizeItem, selectedExtras]);

  const closeCustomize = () => {
    setCustomizeItem(null);
    setExtras([]);
    setSelectedExtraIds([]);
  };

  const confirmCustomize = () => {
    addToCart(customizeItem, selectedExtras, customizeTotal);
    closeCustomize();
  };

  useEffect(() => { fetchItems(); }, [vendor?.user_id]);

  const fetchItems = async () => {
    if (!vendor?.user_id) return;
    const { data, error } = await supabase
      .from('menu_items')
      .select('id,name,description,base_price,image_url,category')
      .eq('vendor_id', vendor.user_id)
      .order('created_at', { ascending: true });

    if (error) {
      console.error('menu_items fetch error:', error.message);
      setError(error.message);
    }
    setItems(data || []);
    setLoading(false);
  };

  const categories = useMemo(
    () => ['All', ...new Set(items.map((i) => i.category).filter(Boolean))],
    [items]
  );

  const filteredMenuItems = useMemo(() => {
    if (activeCategory === 'All') return items;
    return items.filter((item) => item.category === activeCategory);
  }, [items, activeCategory]);

  return (
    <div className="relative bg-slate-50 dark:bg-slate-950 min-h-screen w-full flex flex-col transition-colors duration-200">

      {/* ============ BANNER ============ */}
      <div className="w-full lg:flex lg:justify-center lg:pt-6 lg:px-4">
        <div
          className={cn(
            'w-full py-8 px-5 relative flex flex-col justify-between transition-all duration-300 overflow-hidden rounded-xl',
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
              <span className="opacity-40">•</span>
              <span>15 min delivery</span>
            </div>
          </div>
        </div>
      </div>

      {/* ============ CATEGORY TABS ============ */}
      <div className="w-full bg-slate-50 dark:bg-slate-950 border-b border-slate-200 dark:border-slate-800 sticky top-0 z-20">
        <div className="flex gap-6 overflow-x-auto no-scrollbar max-w-2xl lg:max-w-5xl mx-auto px-4">
          {categories.map((c) => {
            const isActive = activeCategory === c;
            return (
              <button
                key={c}
                onClick={() => setActiveCategory(c)}
                className={cn(
                  'relative shrink-0 text-[12px] lg:text-sm font-bold whitespace-nowrap py-3.5 transition-colors duration-200 border-b-2',
                  isActive
                    ? 'text-blue-600 dark:text-blue-400 border-blue-600 dark:border-blue-400'
                    : 'text-slate-400 dark:text-slate-500 border-transparent hover:text-slate-600 dark:hover:text-slate-300'
                )}
              >
                {c}
              </button>
            );
          })}
        </div>
      </div>

{/* ============ ORDERING BLOCKED BANNER ============ */}
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


      {/* ============ MENU ITEMS — single stacked column at every screen size ============ */}
      <div className="flex-1 w-full max-w-2xl mx-auto px-4 py-2 lg:py-6">
        {loading ? (
          <div className="flex flex-col">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="flex gap-3.5 py-4 animate-pulse">
                <div className="h-16 w-16 rounded-xl bg-slate-200 dark:bg-slate-800 shrink-0" />
                <div className="flex-1 space-y-2 pt-1">
                  <div className="h-3.5 w-1/2 rounded bg-slate-200 dark:bg-slate-800" />
                  <div className="h-2.5 w-2/3 rounded bg-slate-200 dark:bg-slate-800" />
                  <div className="h-2.5 w-1/4 rounded bg-slate-200 dark:bg-slate-800" />
                </div>
              </div>
            ))}
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <p className="text-xs font-black text-amber-500">Couldn't load menu</p>
            <p className="text-[11px] text-slate-400 mt-1">{error}</p>
          </div>
        ) : filteredMenuItems.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <span className="text-4xl mb-3">🍽️</span>
            <p className="text-xs font-black text-slate-900 dark:text-white">No items in this category</p>
          </div>
        ) : (
          <div className="flex flex-col">
            {filteredMenuItems.map((item) => {
              const itemCount = getItemQuantity(item.id);
              return (
                <div
                  key={item.id}
                  className="flex items-center justify-between gap-4 py-4 border-b border-slate-100 dark:border-slate-800/80"
                >
                  <div className="flex items-start gap-3.5 min-w-0 flex-1">
                    <div className="h-16 w-16 lg:h-20 lg:w-20 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-100 dark:border-slate-800/80 overflow-hidden flex-shrink-0 relative">
                      {item.image_url ? (
                        <img
                          src={item.image_url}
                          alt={item.name}
                          className="w-full h-full object-cover"
                          loading="lazy"
                        />
                      ) : null}
                      {itemCount > 0 && (
                        <div className="absolute inset-0 bg-blue-600/10 dark:bg-blue-400/10 backdrop-blur-2xs flex items-center justify-center">
                          <span className="bg-blue-600 text-white text-[9px] font-black h-4 px-1.5 rounded-full flex items-center justify-center">
                            {itemCount}x
                          </span>
                        </div>
                      )}
                    </div>

                    <div className="flex flex-col min-w-0 justify-center">
                      <h4 className="text-xs lg:text-sm font-black tracking-tight text-slate-900 dark:text-white truncate">
                        {item.name}
                      </h4>
                      <p className="text-[10px] lg:text-xs text-slate-400 tracking-normal mt-0.5 leading-tight line-clamp-2 max-w-md">
                        {item.description}
                      </p>
                      <span className="text-xs lg:text-sm font-black font-mono text-slate-900 dark:text-white mt-1.5 block">
                        ₦{Number(item.base_price).toLocaleString()}
                      </span>
                    </div>
                  </div>

                  <div className="flex-shrink-0 ml-2">
                  <button
  onClick={() => handlePlusClick(item)}
  disabled={extrasLoading || !canOrder}
  className={cn(
    'h-7 w-7 lg:h-8 lg:w-8 rounded-lg border flex items-center justify-center transition-all duration-200 active:scale-90 disabled:opacity-40 disabled:cursor-not-allowed',
    itemCount > 0
      ? 'bg-blue-50 border-blue-200 text-blue-600 dark:bg-blue-500/10 dark:border-blue-500/30 dark:text-blue-400'
      : 'bg-white border-blue-500 text-blue-600 dark:bg-slate-900 dark:border-blue-400 dark:text-blue-400 hover:bg-blue-500/5'
  )}
>
                      {itemCount > 0 ? (
                        <Check className="h-3.5 w-3.5 stroke-[3]" />
                      ) : (
                        <Plus className="h-3.5 w-3.5 stroke-[3]" />
                      )}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ============ CUSTOMIZE ORDER SHEET ============ */}
      {customizeItem && (
        <div className="absolute inset-0 z-50 flex items-end lg:items-center justify-center">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/40 backdrop-blur-[2px]"
            onClick={closeCustomize}
          />

          {/* Sheet / dialog */}
          <div className="relative w-full lg:max-w-md bg-white dark:bg-slate-900 rounded-t-3xl lg:rounded-3xl max-h-[85vh] flex flex-col shadow-2xl">
            {/* Drag handle (mobile only) */}
            <div className="lg:hidden flex justify-center pt-3">
              <div className="h-1 w-10 rounded-full bg-slate-200 dark:bg-slate-700" />
            </div>

            {/* Header */}
            <div className="flex items-center justify-between px-5 pt-4 pb-2">
              <h2 className="text-lg font-black text-slate-900 dark:text-white">Customize Order</h2>
              <button
                onClick={closeCustomize}
                className="h-8 w-8 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-500 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Item being customized */}
            <div className="px-5 pb-3">
              <p className="text-sm font-bold text-slate-900 dark:text-white">{customizeItem.name}</p>
              <p className="text-xs text-slate-400">Base price ₦{Number(customizeItem.base_price).toLocaleString()}</p>
            </div>

            {/* Scrollable extras list */}
            <div className="flex-1 min-h-0 overflow-y-auto px-5 pb-4">
              <p className="text-xs font-bold text-slate-500 dark:text-slate-400 mb-2">Add Extras</p>
              <div>
                {extras.map((extra) => {
                  const checked = selectedExtraIds.includes(extra.id);
                  return (
                    <button
                      key={extra.id}
                      type="button"
                      onClick={() => toggleExtra(extra.id)}
                      className="w-full flex items-center justify-between py-2.5 border-b border-slate-100 dark:border-slate-800 last:border-0"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <span
                          className={cn(
                            'h-5 w-5 rounded-md flex items-center justify-center border-2 transition-colors shrink-0',
                            checked
                              ? 'bg-slate-900 border-slate-900 dark:bg-blue-600 dark:border-blue-600'
                              : 'bg-white border-slate-300 dark:bg-slate-900 dark:border-slate-600'
                          )}
                        >
                          {checked && <Check className="h-3 w-3 text-white stroke-[3]" />}
                        </span>

                        {extra.image_url && (
                          <img
                            src={extra.image_url}
                            alt={extra.name}
                            className="h-8 w-8 rounded-md object-cover shrink-0"
                          />
                        )}

                        <span className="text-sm font-semibold text-slate-800 dark:text-slate-200 truncate">
                          {extra.name}
                        </span>
                      </div>
                      <span className="text-xs font-bold text-slate-400 shrink-0 ml-2">
                        +₦{Number(extra.price).toLocaleString()}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Footer */}
            <div className="shrink-0 px-5 pb-6 pt-3 border-t border-slate-100 dark:border-slate-800">
              <button
                onClick={confirmCustomize}
                className="w-full lg:w-auto lg:min-w-[240px] lg:mx-auto lg:block h-12 px-8 rounded-full text-white font-black text-sm transition-opacity hover:opacity-90"
                style={{ backgroundColor: '#2563eb' }}
              >
                Add to Cart — ₦{customizeTotal.toLocaleString()}
              </button>
            </div>
          </div>
        </div>
      )}
      {/* ============ VENDOR CONFLICT PROMPT ============ */}
      {pendingCartItem && (
        <div className="absolute inset-0 z-[60] flex items-center justify-center p-5">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-[2px]" onClick={cancelVendorSwitch} />
          <div className="relative w-full max-w-sm bg-white dark:bg-slate-900 rounded-2xl shadow-2xl p-5">
            <h3 className="text-base font-black text-slate-900 dark:text-white">Start a new order?</h3>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-2">
              Your cart has items from <span className="font-bold">{conflictVendorName}</span>. Adding this item will clear your current cart and start a new order from {vendor.legal_name}.
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