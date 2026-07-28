import { create } from 'zustand';

export const useEcosystemStore = create((set) => ({
  activeView: 'home', 
  selectedCategory: 'all',
  selectedStore: null,
  selectedProduct: null, 
  cart: [],

  setView: (view, storeObj = null) => set({ activeView: view, selectedStore: storeObj }),
  setCategory: (categoryName) => set({ selectedCategory: categoryName || 'all' }),

  navigateToHome: () => set({ activeView: 'home', selectedCategory: 'all', selectedStore: null }),
  navigateToCategory: (categoryName) => set({ activeView: 'category', selectedCategory: categoryName, selectedStore: null }),
  navigateToStore: (storeObj) => set({ activeView: 'store', selectedStore: storeObj }),
  
  openProductDrawer: (productObj) => set({ selectedProduct: productObj }),
  closeProductDrawer: () => set({ selectedProduct: null }),

  addToCart: (product, quantity = 1) => set((state) => {
    const existingIndex = state.cart.findIndex((item) => item.id === product.id);
    if (existingIndex > -1) {
      const updatedCart = [...state.cart];
      updatedCart[existingIndex].quantity += quantity;
      return { cart: updatedCart };
    }
    return { cart: [...state.cart, { ...product, quantity }] };
  }),

  updateCartQuantity: (id, quantity) => set((state) => ({
    cart: state.cart.map((item) => item.id === id ? { ...item, quantity } : item)
  })),

  removeFromCart: (id) => set((state) => ({
    cart: state.cart.filter((item) => item.id !== id)
  })),
  
  clearCart: () => set({ cart: [] })
}));