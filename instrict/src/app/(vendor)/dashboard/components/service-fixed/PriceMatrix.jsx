'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/utils/supabase/client';
import { Plus, Trash2, Tags, Save, X, Ban, Info, CheckCircle2 } from 'lucide-react';
import VerificationGate from '@/components/verification/VerificationGate';

const inputClass = "w-full h-10 px-3 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 transition-all";

// Keep in sync with the storefront eligibility check (StorePage.jsx) — a
// vendor's page won't show to students until they clear this bar.
const MIN_RATES_TO_GO_LIVE = 2;

export default function PriceMatrix({ vendorUserId, isSuspended = false }) {
  const supabase = createClient();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({ label: '', price: '', unit: '' });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => { fetchItems(); }, []);

  const fetchItems = async () => {
    const { data } = await supabase
      .from('service_price_matrix')
      .select('*')
      .eq('vendor_id', vendorUserId)
      .order('created_at', { ascending: true });
    setItems(data || []);
    setLoading(false);
  };

  const addItem = async () => {
    // Defense in depth: block the write even if a stale UI left the form enabled.
    if (isSuspended) { setError('Your store is suspended. Contact support to resume rate changes.'); return; }
    if (!form.label || !form.price) { setError('Label and price are required.'); return; }
    setError('');
    setSaving(true);

    const { error: insertError } = await supabase
      .from('service_price_matrix')
      .insert({
        vendor_id: vendorUserId,
        label: form.label,
        price: form.price,
        unit: form.unit || null,
      });

    setSaving(false);
    if (insertError) { setError(insertError.message); return; }
    setForm({ label: '', price: '', unit: '' });
    fetchItems();
  };

  const deleteItem = async (id) => {
    if (isSuspended) return;
    await supabase.from('service_price_matrix').delete().eq('id', id);
    fetchItems();
  };

  const remaining = Math.max(0, MIN_RATES_TO_GO_LIVE - items.length);
  const isLive = remaining === 0;

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-sm font-black tracking-tight text-slate-900 dark:text-white">Price Matrix</h2>
          <p className="text-[11px] text-slate-400 mt-0.5">
            This is your price list — students will see these as the rates for your printing store
          </p>
        </div>
        {isSuspended && (
          <div className="h-9 px-3.5 rounded-xl bg-rose-500/5 border border-rose-500/20 flex items-center gap-1.5 shrink-0">
            <Ban className="w-3.5 h-3.5 text-rose-500 shrink-0" />
            <span className="text-[11px] font-black text-rose-500">Suspended</span>
          </div>
        )}
      </div>

      {/* Go-live requirement banner */}
      {!loading && !isSuspended && (
        <div
          className={`flex items-start gap-2.5 rounded-2xl border px-4 py-3.5 ${
            isLive
              ? 'border-emerald-500/20 bg-emerald-500/5'
              : 'border-amber-500/20 bg-amber-500/5'
          }`}
        >
          {isLive ? (
            <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
          ) : (
            <Info className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
          )}
          <div>
            <p className={`text-xs font-black ${isLive ? 'text-emerald-600 dark:text-emerald-400' : 'text-amber-600 dark:text-amber-400'}`}>
              {isLive
                ? "You're set — your store is visible to students"
                : `Add ${remaining} more rate${remaining > 1 ? 's' : ''} to go live`}
            </p>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
              {isLive
                ? 'Your price list has enough rates for students to place orders. Add or edit rates anytime — changes reflect instantly.'
                : `You need at least ${MIN_RATES_TO_GO_LIVE} rates listed before your store page shows up to students. You currently have ${items.length}.`}
            </p>
          </div>
        </div>
      )}

      {/* Add new rate */}
      <div className={`bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl p-5 space-y-3 ${isSuspended ? 'opacity-50 pointer-events-none' : ''}`}>
        <p className="text-xs font-black uppercase tracking-widest text-slate-400">Add a rate</p>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="space-y-1.5 sm:col-span-1">
            <label className="text-[10px] font-black uppercase tracking-wider text-slate-400">Service Name</label>
            <input
              value={form.label}
              onChange={e => setForm(p => ({ ...p, label: e.target.value }))}
              placeholder="e.g. Black & White Print"
              className={inputClass}
              disabled={isSuspended}
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-[10px] font-black uppercase tracking-wider text-slate-400">Price (₦)</label>
            <input
              type="number"
              value={form.price}
              onChange={e => setForm(p => ({ ...p, price: e.target.value }))}
              placeholder="50"
              className={inputClass}
              disabled={isSuspended}
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-[10px] font-black uppercase tracking-wider text-slate-400">Unit (optional)</label>
            <input
              value={form.unit}
              onChange={e => setForm(p => ({ ...p, unit: e.target.value }))}
              placeholder="e.g. per page, flat rate"
              className={inputClass}
              disabled={isSuspended}
            />
          </div>
        </div>
        {error && <p className="text-[11px] font-bold text-rose-500">{error}</p>}
        <VerificationGate role="vendor" userId={vendorUserId} action="add rates" variant="inline">
          <button
            onClick={addItem}
            disabled={saving || isSuspended}
            className="h-9 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-xs font-black tracking-tight flex items-center gap-1.5"
          >
            <Plus className="w-3.5 h-3.5" /> {saving ? 'Adding...' : 'Add Rate'}
          </button>
        </VerificationGate>
      </div>

      {/* List */}
      {loading ? (
        <div className="space-y-2">
          {[...Array(3)].map((_, i) => <div key={i} className="h-14 bg-slate-100 dark:bg-slate-800 rounded-xl animate-pulse" />)}
        </div>
      ) : items.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center border border-dashed border-slate-200 dark:border-slate-800 rounded-2xl">
          <Tags className="w-8 h-8 text-slate-300 mb-2" />
          <p className="text-xs font-black text-slate-400">No rates added yet</p>
          <p className="text-[11px] text-slate-300 dark:text-slate-600 mt-1">Add your first fixed rate above</p>
        </div>
      ) : (
        <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl divide-y divide-slate-50 dark:divide-slate-800 overflow-hidden">
          {items.map(item => (
            <div key={item.id} className="flex items-center justify-between px-5 py-3.5">
              <div>
                <p className="text-xs font-bold text-slate-900 dark:text-white">{item.label}</p>
                {item.unit && <p className="text-[11px] text-slate-400">{item.unit}</p>}
              </div>
              <div className="flex items-center gap-3">
                <p className="text-sm font-black text-blue-600 dark:text-blue-400">₦{Number(item.price).toLocaleString()}</p>
                {!isSuspended && (
                  <button
                    onClick={() => deleteItem(item.id)}
                    className="p-1.5 rounded-lg text-slate-300 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-500/10 transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}