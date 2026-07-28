'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/utils/supabase/client';
import ImageUpload from '../shared/ImageUpload';
import { Plus, Trash2, Image as ImageIcon, X, Save, Ban } from 'lucide-react';
import VerificationGate from '@/components/verification/VerificationGate';

export default function Portfolio({ vendorUserId, isSuspended = false }) {
  const supabase = createClient();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ image_url: '', description: '', price_tag: '' });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => { fetchItems(); }, []);

  const fetchItems = async () => {
    const { data } = await supabase
      .from('portfolio_items')
      .select('*')
      .eq('vendor_id', vendorUserId)
      .order('created_at', { ascending: false });
    setItems(data || []);
    setLoading(false);
  };

  const addItem = async () => {
    // Defense in depth: block the write even if a stale UI let the form open.
    if (isSuspended) { setError('Your store is suspended. Contact support to resume portfolio changes.'); return; }
    if (!form.image_url) { setError('Please upload a photo of your work.'); return; }
    setError('');
    setSaving(true);

    const { error: insertError } = await supabase
      .from('portfolio_items')
      .insert({
        vendor_id: vendorUserId,
        image_url: form.image_url,
        description: form.description || null,
        price_tag: form.price_tag || null,
      });

    setSaving(false);
    if (insertError) { setError(insertError.message); return; }
    setForm({ image_url: '', description: '', price_tag: '' });
    setShowForm(false);
    fetchItems();
  };

  const deleteItem = async (id) => {
    if (isSuspended) return;
    if (!confirm('Remove this from your portfolio?')) return;
    await supabase.from('portfolio_items').delete().eq('id', id);
    fetchItems();
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-sm font-black tracking-tight text-slate-900 dark:text-white">Portfolio Showcase</h2>
          <p className="text-[11px] text-slate-400 mt-0.5">Show students your past work to build trust</p>
        </div>
        {isSuspended ? (
          <div className="h-9 px-3.5 rounded-xl bg-rose-500/5 border border-rose-500/20 flex items-center gap-1.5">
            <Ban className="w-3.5 h-3.5 text-rose-500 shrink-0" />
            <span className="text-[11px] font-black text-rose-500">Suspended</span>
          </div>
        ) : (
          <VerificationGate role="vendor" userId={vendorUserId} action="add portfolio items" variant="inline">
            <button
              onClick={() => setShowForm(true)}
              className="h-9 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-black tracking-tight flex items-center gap-1.5"
            >
              <Plus className="w-3.5 h-3.5" /> Add Work
            </button>
          </VerificationGate>
        )}
      </div>

      {loading ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => <div key={i} className="h-44 bg-slate-100 dark:bg-slate-800 rounded-2xl animate-pulse" />)}
        </div>
      ) : items.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center border border-dashed border-slate-200 dark:border-slate-800 rounded-2xl">
          <ImageIcon className="w-8 h-8 text-slate-300 mb-2" />
          <p className="text-xs font-black text-slate-400">No portfolio items yet</p>
          <p className="text-[11px] text-slate-300 dark:text-slate-600 mt-1">Add photos of completed work to attract students</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          {items.map(item => (
            <div key={item.id} className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl overflow-hidden group relative">
              <img src={item.image_url} alt={item.description || 'Portfolio work'} className="w-full h-32 object-cover" />
              {!isSuspended && (
                <button
                  onClick={() => deleteItem(item.id)}
                  className="absolute top-2 right-2 w-7 h-7 bg-black/60 hover:bg-black/80 text-white rounded-lg flex items-center justify-center transition-all opacity-0 group-hover:opacity-100"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              )}
              <div className="p-3 space-y-1">
                {item.description && (
                  <p className="text-[11px] text-slate-600 dark:text-slate-300 line-clamp-2">{item.description}</p>
                )}
                {item.price_tag && (
                  <p className="text-xs font-black text-blue-600 dark:text-blue-400">₦{Number(item.price_tag).toLocaleString()}</p>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {showForm && !isSuspended && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 backdrop-blur-sm p-0 sm:p-4">
          <div className="w-full sm:max-w-md bg-white dark:bg-slate-900 rounded-t-2xl sm:rounded-2xl">
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 dark:border-slate-800">
              <h3 className="text-sm font-black text-slate-900 dark:text-white">Add Portfolio Item</h3>
              <button onClick={() => setShowForm(false)} className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-5 space-y-4">
              <ImageUpload value={form.image_url} onChange={url => setForm(p => ({ ...p, image_url: url }))} label="Photo of completed work" optional={false} size="lg" />
              <div className="space-y-1.5">
                <label className="text-[10px] font-black uppercase tracking-wider text-slate-400">Description (optional)</label>
                <textarea
                  value={form.description}
                  onChange={e => setForm(p => ({ ...p, description: e.target.value }))}
                  rows={2}
                  placeholder="Brief note about this job..."
                  className="w-full px-3 py-2.5 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 resize-none"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-black uppercase tracking-wider text-slate-400">Price tag (optional)</label>
                <input
                  type="number"
                  value={form.price_tag}
                  onChange={e => setForm(p => ({ ...p, price_tag: e.target.value }))}
                  placeholder="e.g. 3000"
                  className="w-full h-10 px-3 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10"
                />
              </div>
              {error && <p className="text-[11px] font-bold text-rose-500">{error}</p>}
              <button
                onClick={addItem}
                disabled={saving}
                className="w-full h-11 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-sm font-black tracking-tight flex items-center justify-center gap-2"
              >
                {saving ? 'Saving...' : <><Save className="w-4 h-4" /> Save</>}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}