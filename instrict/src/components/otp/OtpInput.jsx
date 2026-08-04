'use client';

import { useRef } from 'react';

export default function OtpInput({ length = 4, digits, onChange, colorClass = 'text-blue-500 focus:ring-blue-500' }) {
  const inputRefs = useRef([]);

  const setDigit = (index, value) => {
    const next = [...digits];
    next[index] = value;
    onChange(next);
  };

  const handleChange = (e, index) => {
    // Strip everything non-numeric; take the last char in case of odd
    // autofill/IME behavior that drops more than one character into a box.
    const cleaned = e.target.value.replace(/\D/g, '');
    if (!cleaned) {
      setDigit(index, '');
      return;
    }
    setDigit(index, cleaned.slice(-1));
    if (index < length - 1) inputRefs.current[index + 1]?.focus();
  };

  const handleKeyDown = (e, index) => {
    if (e.key === 'Backspace' && digits[index] === '' && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  // Works no matter which box the paste lands in — SMS autofill and manual
  // paste both often target the first box, but this handles any of them.
  const handlePaste = (e, index) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '');
    if (!pasted) return;

    const next = [...digits];
    let cursor = index;
    for (const char of pasted) {
      if (cursor >= length) break;
      next[cursor] = char;
      cursor++;
    }
    onChange(next);
    inputRefs.current[Math.min(cursor, length - 1)]?.focus();
  };

  return (
    <div className="flex justify-center gap-2.5">
      {Array.from({ length }).map((_, index) => (
        <input
          key={index}
          type="text"
          inputMode="numeric"
          autoComplete={index === 0 ? 'one-time-code' : 'off'}
          maxLength={1}
          value={digits[index] || ''}
          ref={(el) => (inputRefs.current[index] = el)}
          onChange={(e) => handleChange(e, index)}
          onKeyDown={(e) => handleKeyDown(e, index)}
          onPaste={(e) => handlePaste(e, index)}
          className={`w-12 h-12 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-center text-lg font-black outline-none focus:ring-2 transition-all ${colorClass}`}
        />
      ))}
    </div>
  );
}