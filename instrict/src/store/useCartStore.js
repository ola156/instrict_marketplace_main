// store/useCartStore.js
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

export const useCartStore = create(
  persist(
    (set, get) => ({
      items: [],
      vendorId: null,
      vendorName: null,

      addItem: (item, { force = false } = {}) => {
        const state = get();
        const hasItems = state.items.length > 0;
        const isDifferentVendor = hasItems && state.vendorId !== item.vendorId;

        if (isDifferentVendor && !force) {
          return { blocked: true, existingVendorName: state.vendorName };
        }

        set(() => ({
          items: isDifferentVendor
            ? [{ ...item, id: item.id || crypto.randomUUID() }]
            : [...state.items, { ...item, id: item.id || crypto.randomUUID() }],
          vendorId: item.vendorId,
          vendorName: item.vendorName,
        }));

        return { blocked: false };
      },

      removeItem: (id) => set((state) => {
        const items = state.items.filter((i) => i.id !== id);
        return {
          items,
          vendorId: items.length ? state.vendorId : null,
          vendorName: items.length ? state.vendorName : null,
        };
      }),

      updateQuantity: (id, quantity) => set((state) => {
        const items = quantity <= 0
          ? state.items.filter((i) => i.id !== id)
          : state.items.map((i) => (i.id === id ? { ...i, quantity } : i));
        return {
          items,
          vendorId: items.length ? state.vendorId : null,
          vendorName: items.length ? state.vendorName : null,
        };
      }),

      clearCart: () => set({ items: [], vendorId: null, vendorName: null }),

      itemCount: () => get().items.reduce((sum, i) => sum + i.quantity, 0),
      total: () => get().items.reduce((sum, i) => sum + i.unitPrice * i.quantity, 0),
    }),
    {
      name: 'instrict-cart', // localStorage key
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        items: state.items,
        vendorId: state.vendorId,
        vendorName: state.vendorName,
      }), // only persist data, not the action functions
    }
  )
);