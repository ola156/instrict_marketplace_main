'use client';

import { useState } from 'react';
import { lookupById } from './actions';

export default function LookupForm() {
  const [id, setId] = useState('');
  const [result, setResult] = useState(null);
  const [isPending, setIsPending] = useState(false);
  const [searched, setSearched] = useState(false);

  const handleSearch = async () => {
    setIsPending(true);
    setSearched(true);
    try {
      const res = await lookupById(id);
      setResult(res);
    } finally {
      setIsPending(false);
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex gap-2">
        <input
          value={id}
          onChange={(e) => setId(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
          placeholder="Paste an order ID, vendor ID, rider ID, or student ID"
          className="flex-1 bg-slate-900 border border-slate-800 rounded-md px-3 py-2 text-xs font-mono text-slate-200 outline-none focus:border-emerald-600"
        />
        <button
          onClick={handleSearch}
          disabled={isPending || !id.trim()}
          className="px-4 py-2 rounded-md bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white text-xs font-bold"
        >
          {isPending ? 'Searching…' : 'Search'}
        </button>
      </div>

      {searched && !isPending && result?.type === null && (
        <p className="text-xs text-slate-600 font-mono">No match found for that ID.</p>
      )}

      {result?.type && (
        <div className="rounded-lg border border-slate-800 bg-slate-900/50 p-4">
          <p className="text-[10px] uppercase tracking-wider text-emerald-400 font-bold mb-2">
            {result.type}
          </p>
          <pre className="text-xs font-mono text-slate-300 whitespace-pre-wrap break-words">
            {JSON.stringify(result.data, null, 2)}
          </pre>
        </div>
      )}
    </div>
  );
}