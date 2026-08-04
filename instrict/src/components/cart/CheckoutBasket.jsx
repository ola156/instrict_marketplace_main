'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useCartStore } from '@/store/useCartStore';
import { Minus, Plus, Trash2, ShoppingBag, Store, X } from 'lucide-react';

export default function CheckoutBasket({ isMobile = false, onClose }) {
  const router = useRouter();
  const { items, vendorName, updateQuantity, removeItem, clearCart } = useCartStore();
  const [confirmingClear, setConfirmingClear] = useState(false);

  const subtotal = items.reduce((sum, i) => sum + Number(i.unitPrice) * i.quantity, 0);
  const count = items.reduce((s, i) => s + i.quantity, 0);

  const handleProceedToCheckout = () => {
    // Cart lives in the Zustand store (persisted), so /checkout can read
    // items/vendorId/vendorName straight from useCartStore — no need to
    // pass anything through the URL or props.
      onClose?.()
    router.push('/checkout');
  };

  if (items.length === 0) {
    return (
      <div className="h-full flex flex-col items-center justify-center text-center py-8 space-y-3">
        <div className="w-12 h-12 bg-slate-100 dark:bg-slate-800 rounded-2xl flex items-center justify-center">
          <ShoppingBag className="w-6 h-6 text-slate-400" />
        </div>
        <div>
          <p className="text-xs font-black text-slate-900 dark:text-white">Your basket is empty</p>
          <p className="text-[11px] text-slate-400 mt-0.5">Add items from a store to get started</p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative flex flex-col h-full">
      {/* Vendor header — makes the single-vendor-per-cart rule visible rather
          than something the user only discovers via the conflict modal */}
      <div className="flex items-center justify-between pb-2.5 mb-2.5 border-b border-slate-100 dark:border-slate-800 shrink-0">
        <div className="flex items-center gap-1.5 min-w-0">
          <Store className="w-3.5 h-3.5 text-slate-400 shrink-0" />
          <p className="text-[11px] font-bold text-slate-500 dark:text-slate-400 truncate">
            Ordering from <span className="text-slate-900 dark:text-white">{vendorName}</span>
          </p>
        </div>
        <button
          onClick={() => setConfirmingClear(true)}
          className="text-[10px] font-bold text-slate-400 hover:text-rose-500 transition-colors shrink-0 ml-2"
        >
          Clear
        </button>
      </div>

      {/* Items */}
      <div className="flex-1 overflow-y-auto space-y-2.5 pr-1 scrollbar-none">
        {items.map((item) => {
          const itemTotal = Number(item.unitPrice) * item.quantity;
          const extraLabels = item.meta?.extras || [];
          return (
            <div key={item.id} className="flex gap-2.5 p-2.5 bg-slate-50 dark:bg-slate-800/50 rounded-xl">
              {item.image
                ? <img src={item.image} alt={item.name} className="w-12 h-12 rounded-xl object-cover shrink-0" />
                : <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center shrink-0 text-lg">🍽️</div>
              }
              <div className="flex-1 min-w-0">
                <p className="text-[11px] font-black text-slate-900 dark:text-white truncate">{item.name}</p>
                {extraLabels.length > 0 && (
                  <p className="text-[10px] text-slate-400 truncate">
                    +{extraLabels.map(e => e.label).join(', ')}
                  </p>
                )}
                <div className="flex items-center justify-between mt-1.5">
                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => updateQuantity(item.id, item.quantity - 1)}
                      className="w-5 h-5 rounded-md bg-slate-200 dark:bg-slate-700 flex items-center justify-center text-slate-600 dark:text-slate-300 hover:bg-slate-300 dark:hover:bg-slate-600 transition-colors"
                    >
                      <Minus className="w-3 h-3" />
                    </button>
                    <span className="text-[11px] font-black text-slate-900 dark:text-white w-4 text-center">{item.quantity}</span>
                    <button
                      onClick={() => updateQuantity(item.id, item.quantity + 1)}
                      className="w-5 h-5 rounded-md bg-blue-600 flex items-center justify-center text-white hover:bg-blue-700 transition-colors"
                    >
                      <Plus className="w-3 h-3" />
                    </button>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-[11px] font-black text-slate-900 dark:text-white">₦{itemTotal.toLocaleString()}</span>
                    <button
                      onClick={() => removeItem(item.id)}
                      className="text-slate-300 hover:text-rose-500 transition-colors"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Summary + proceed */}
      <div className="mt-3 space-y-3 border-t border-slate-100 dark:border-slate-800 pt-3 shrink-0">
        <div className="flex justify-between text-xs font-black text-slate-900 dark:text-white">
          <span>Subtotal ({count} item{count !== 1 ? 's' : ''})</span>
          <span>₦{subtotal.toLocaleString()}</span>
        </div>

        <button
          onClick={handleProceedToCheckout}
          className="w-full h-10 rounded-xl text-white text-xs font-black tracking-tight transition-all flex items-center justify-center gap-1.5"
          style={{ backgroundColor: '#2563eb' }}
        >
          Proceed to Checkout · ₦{subtotal.toLocaleString()}
        </button>
      </div>

      {/* Clear cart confirmation */}
      {confirmingClear && (
        <div className="absolute inset-0 z-50 flex items-center justify-center p-5">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-[2px]" onClick={() => setConfirmingClear(false)} />
          <div className="relative w-full max-w-xs bg-white dark:bg-slate-900 rounded-2xl shadow-2xl p-5">
            <div className="flex items-start justify-between">
              <h3 className="text-sm font-black text-slate-900 dark:text-white">Clear your cart?</h3>
              <button onClick={() => setConfirmingClear(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-4 h-4" />
              </button>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1.5">
              This will remove all {count} item{count !== 1 ? 's' : ''} from {vendorName}.
            </p>
            <div className="flex gap-2 mt-4">
              <button
                onClick={() => setConfirmingClear(false)}
                className="flex-1 h-9 rounded-full border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => { clearCart(); setConfirmingClear(false); }}
                className="flex-1 h-9 rounded-full bg-rose-500 hover:bg-rose-600 text-xs font-black text-white transition-colors"
              >
                Clear
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}