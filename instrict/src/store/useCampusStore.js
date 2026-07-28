import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

export const useCampusStore = create(
  persist(
    (set) => ({
      campus: null,
      setCampus: (selectedCampus) => set({ campus: selectedCampus }),
      clearCampus: () => set({ campus: null }),
    }),
    {
      name: 'campus-storage', // Key in localStorage
      storage: createJSONStorage(() => localStorage),
    }
  )
);