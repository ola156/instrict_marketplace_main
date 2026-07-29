'use client';

import { motion } from 'framer-motion';
import { Sun, Moon } from 'lucide-react';
import { useTheme } from '@/components/theme-provider';

export default function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();

  return (
    <button
      onClick={toggleTheme}
      className="relative flex items-center w-14 h-8 rounded-full border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-1 shrink-0"
      aria-label="Toggle theme"
    >
      <Sun className="absolute left-1.5 w-3.5 h-3.5 text-amber-400" />
      <Moon className="absolute right-1.5 w-3.5 h-3.5 text-indigo-300" />

      <motion.div
        className="w-6 h-6 rounded-full bg-white dark:bg-slate-900 shadow-md flex items-center justify-center z-10"
        animate={{ x: theme === 'dark' ? 24 : 0 }}
        transition={{ type: 'spring', stiffness: 500, damping: 30 }}
      >
        {theme === 'dark' ? (
          <Moon className="w-3.5 h-3.5 text-indigo-400" />
        ) : (
          <Sun className="w-3.5 h-3.5 text-amber-500" />
        )}
      </motion.div>
    </button>
  );
}