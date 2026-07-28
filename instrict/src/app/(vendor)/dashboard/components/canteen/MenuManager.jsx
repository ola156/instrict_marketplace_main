'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/utils/supabase/client';
import { Plus, X, ChevronDown, ChevronUp, ToggleLeft, ToggleRight, Trash2, Tag, Sparkles } from 'lucide-react';
import ImageUpload, { ImagePlaceholder } from '../shared/ImageUpload';
import VerificationGate from '@/components/verification/VerificationGate';

function ExtrasEditor({ itemId, extras, onUpdate, isSuspended }) {
  const supabase = createClient();
  const [adding, setAdding] = useState(false);
  const [newExtra, setNewExtra] = useState({ name: '', price: '', image_url: '' });
  const [showImageUpload, setShowImageUpload] = useState(false);

  const addExtra = async () => {
    if (isSuspended || !newExtra.name || newExtra.price === '') return;
    await supabase.from('menu_extras').insert({
      menu_item_id: itemId,
      name: newExtra.name,
      price: Number(newExtra.price),
      image_url: newExtra.image_url || null,
    });
    setNewExtra({ name: '', price: '', image_url: '' });
    setAdding(false);
    setShowImageUpload(false);
    onUpdate();
  };

  const toggleExtra = async (extraId, current) => {
    if (isSuspended) return;
    await supabase.from('menu_extras').update({ is_available: !current }).eq('id', extraId);
    onUpdate();
  };

  const deleteExtra = async (extraId) => {
    if (isSuspended) return;
    await supabase.from('menu_extras').delete().eq('id', extraId);
    onUpdate();
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">
          Add-ons &amp; extras
        </p>
        {!adding && (
          <button
            onClick={() => !isSuspended && setAdding(true)}
            disabled={isSuspended}
            title={isSuspended ? 'Menu changes are locked while your store is suspended' : undefined}
            className="flex items-center gap-1 text-[11px] font-black text-blue-500 hover:text-blue-600 transition-colors shrink-0 disabled:opacity-40 disabled:hover:text-blue-500 disabled:cursor-not-allowed"
          >
            <Plus className="w-3.5 h-3.5" /> Add extra
          </button>
        )}
      </div>

      {extras.length === 0 && !adding && (
        <p className="text-[11px] text-slate-400 leading-relaxed">
          No extras yet. Extras let customers add things like toppings, sides, or size upgrades to this dish for an extra charge.
        </p>
      )}

      {extras.length > 0 && (
        <div className="space-y-1.5">
          {extras.map(extra => (
            <div
              key={extra.id}
              className="flex items-center justify-between gap-2 px-3 py-2 bg-slate-50 dark:bg-slate-800/60 rounded-lg"
            >
              <div className="flex items-center gap-2 min-w-0 flex-1">
                {extra.image_url ? (
                  <img src={extra.image_url} alt={extra.name} className="w-7 h-7 rounded-lg object-cover shrink-0" />
                ) : (
                  <ImagePlaceholder name={extra.name} size="sm" />
                )}
                <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${extra.is_available ? 'bg-emerald-500' : 'bg-slate-300'}`} />
                <span className="text-[11px] font-medium text-slate-700 dark:text-slate-300 truncate min-w-0 flex-1">{extra.name}</span>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <span className="text-[11px] font-bold text-slate-500">+₦{Number(extra.price).toLocaleString()}</span>
                <button
                  onClick={() => toggleExtra(extra.id, extra.is_available)}
                  disabled={isSuspended}
                  className="text-slate-400 hover:text-blue-500 transition-colors disabled:opacity-40 disabled:hover:text-slate-400 disabled:cursor-not-allowed"
                >
                  {extra.is_available
                    ? <ToggleRight className="w-4 h-4 text-emerald-500" />
                    : <ToggleLeft className="w-4 h-4" />}
                </button>
                <button
                  onClick={() => deleteExtra(extra.id)}
                  disabled={isSuspended}
                  className="text-slate-300 hover:text-rose-500 transition-colors disabled:opacity-40 disabled:hover:text-slate-300 disabled:cursor-not-allowed"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {adding && (
        <div className="space-y-2 p-3 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-100 dark:border-slate-800">
          <div className="flex flex-col sm:flex-row gap-2">
            <input
              value={newExtra.name}
              onChange={e => setNewExtra(p => ({ ...p, name: e.target.value }))}
              placeholder="Extra name — e.g. Extra cheese *"
              className="flex-1 h-9 px-3 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 outline-none focus:border-blue-500"
            />
            <input
              value={newExtra.price}
              onChange={e => setNewExtra(p => ({ ...p, price: e.target.value }))}
              placeholder="₦ price"
              type="number"
              className="w-full sm:w-24 h-9 px-3 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 outline-none focus:border-blue-500"
            />
          </div>

          <button
            type="button"
            onClick={() => setShowImageUpload(p => !p)}
            className="text-[11px] font-bold text-slate-400 hover:text-blue-500 transition-colors flex items-center gap-1"
          >
            <Plus className="w-3 h-3" />
            {showImageUpload ? 'Hide photo' : 'Add photo (optional)'}
          </button>

          {showImageUpload && (
            <ImageUpload
              value={newExtra.image_url}
              onChange={url => setNewExtra(p => ({ ...p, image_url: url }))}
              label=""
              optional={true}
            />
          )}

          <div className="flex gap-2">
            <button
              onClick={addExtra}
              disabled={isSuspended || !newExtra.name || newExtra.price === ''}
              className="h-8 px-4 bg-blue-600 disabled:opacity-40 text-white text-xs font-black rounded-lg hover:bg-blue-700 transition-all"
            >
              Save extra
            </button>
            <button
              onClick={() => { setAdding(false); setShowImageUpload(false); setNewExtra({ name: '', price: '', image_url: '' }); }}
              className="h-8 px-3 flex items-center justify-center text-slate-400 hover:text-slate-600 rounded-lg border border-slate-200 dark:border-slate-700 text-xs font-bold"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function MenuItemCard({ item, extras, onUpdate, onDelete, isSuspended }) {
  const supabase = createClient();
  const [expanded, setExpanded] = useState(false);
  const [toggling, setToggling] = useState(false);

  const toggleAvailability = async () => {
    if (isSuspended) return;
    setToggling(true);
    await supabase.from('menu_items').update({ is_available: !item.is_available }).eq('id', item.id);
    onUpdate();
    setToggling(false);
  };

  const handleDelete = () => {
    if (isSuspended) return;
    onDelete(item.id);
  };

  return (
    <div className={`w-full bg-white dark:bg-slate-900 border rounded-2xl overflow-hidden transition-all ${
      item.is_available
        ? 'border-slate-100 dark:border-slate-800'
        : 'border-slate-200 dark:border-slate-700 opacity-70'
    }`}>
      <div className="p-4 grid grid-cols-1 gap-y-2">

        {/* Top Row: Picture + Name (Left) vs Price + Toggle + Delete (Far Right) */}
        <div className="flex items-center justify-between gap-4 w-full min-w-0">

          {/* Left Block: Image & Name */}
          <div className="flex items-center gap-3 min-w-0 flex-1">
            {item.image_url ? (
              <img src={item.image_url} alt={item.name} className="w-12 h-12 rounded-xl object-cover shrink-0" />
            ) : (
              <ImagePlaceholder name={item.name} size="sm" />
            )}

            <div className="flex items-center gap-2 min-w-0">
              <h3 className="text-xs font-black text-slate-900 dark:text-white truncate min-w-0">
                {item.name}
              </h3>
              {!item.is_available && (
                <span className="text-[9px] font-black uppercase tracking-wide px-1.5 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-400 shrink-0">
                  Hidden
                </span>
              )}
            </div>
          </div>

          {/* Far Right Block: Price + Toggle + Delete */}
          <div className="flex items-center gap-2 shrink-0">
            <span className="text-sm font-black text-slate-900 dark:text-white">
              ₦{Number(item.base_price).toLocaleString()}
            </span>
            <div className="flex items-center gap-1">
              <button
                onClick={toggleAvailability}
                disabled={toggling || isSuspended}
                title={
                  isSuspended
                    ? 'Locked while your store is suspended'
                    : item.is_available ? 'Visible to customers — tap to hide' : 'Hidden from customers — tap to show'
                }
                className="p-1.5 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors disabled:opacity-40 disabled:hover:bg-transparent disabled:cursor-not-allowed"
              >
                {item.is_available
                  ? <ToggleRight className="w-5 h-5 text-emerald-500" />
                  : <ToggleLeft className="w-5 h-5 text-slate-300" />}
              </button>
              <button
                onClick={handleDelete}
                disabled={isSuspended}
                title={isSuspended ? 'Locked while your store is suspended' : 'Delete dish'}
                className="p-1.5 rounded-lg text-slate-300 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-500/10 transition-colors disabled:opacity-40 disabled:hover:text-slate-300 disabled:hover:bg-transparent disabled:cursor-not-allowed"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>

        </div>

        {/* Bottom Row: Description with spacing on top */}
        {item.description && (
          <div className="w-full min-w-0 overflow-hidden mt-1.5">
            <p className="text-[11px] text-slate-400 dark:text-slate-500 leading-tight line-clamp-2 [word-break:break-word] break-all">
              {item.description}
            </p>
          </div>
        )}
      </div>

      {/* Extras Dropdown Entry */}
      <button
        onClick={() => setExpanded(p => !p)}
        className="w-full flex items-center justify-between gap-2 px-4 py-2.5 border-t border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors"
      >
        <span className="flex items-center gap-1.5 text-[11px] font-bold text-slate-500 dark:text-slate-400">
          <Tag className="w-3.5 h-3.5" />
          {extras.length > 0
            ? `${extras.length} extra${extras.length > 1 ? 's' : ''} added`
            : 'Add extras for this dish'}
        </span>
        {expanded ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
      </button>

      {/* Extras Drawer */}
      {expanded && (
        <div className="px-4 pb-4 pt-1 border-t border-slate-50 dark:border-slate-800/60">
          <ExtrasEditor itemId={item.id} extras={extras} onUpdate={onUpdate} isSuspended={isSuspended} />
        </div>
      )}
    </div>
  );
}


export default function MenuManager({ vendorUserId, isSuspended }) {
  const supabase = createClient();
  const [items, setItems] = useState([]);
  const [extras, setExtras] = useState({});
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: '', description: '', base_price: '', image_url: '' });
  const [saving, setSaving] = useState(false);

  useEffect(() => { fetchMenu(); }, []);

  const fetchMenu = async () => {
    const { data: menuItems } = await supabase
      .from('menu_items')
      .select('*')
      .eq('vendor_id', vendorUserId)
      .order('sort_order', { ascending: true });

    if (menuItems && menuItems.length > 0) {
      const { data: allExtras } = await supabase
        .from('menu_extras')
        .select('*')
        .in('menu_item_id', menuItems.map(i => i.id));

      const extrasByItem = {};
      (allExtras || []).forEach(e => {
        if (!extrasByItem[e.menu_item_id]) extrasByItem[e.menu_item_id] = [];
        extrasByItem[e.menu_item_id].push(e);
      });
      setExtras(extrasByItem);
    }

    setItems(menuItems || []);
    setLoading(false);
  };

  const addItem = async () => {
    if (isSuspended || !form.name || !form.base_price) return;
    setSaving(true);
    await supabase.from('menu_items').insert({
      vendor_id: vendorUserId,
      name: form.name,
      description: form.description,
      base_price: Number(form.base_price),
      image_url: form.image_url || null,
    });
    setForm({ name: '', description: '', base_price: '', image_url: '' });
    setShowForm(false);
    await fetchMenu();
    setSaving(false);
  };

  const deleteItem = async (itemId) => {
    if (isSuspended) return;
    await supabase.from('menu_items').delete().eq('id', itemId);
    await fetchMenu();
  };

  if (loading) {
    return (
      <div className="space-y-3 max-w-4xl">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="bg-slate-100 dark:bg-slate-800 rounded-2xl h-20 animate-pulse" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-5 max-w-4xl">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="min-w-0">
          <h2 className="text-sm font-black tracking-tight text-slate-900 dark:text-white">Menu</h2>
          <p className="text-[11px] text-slate-400 mt-0.5">
            {items.length} {items.length === 1 ? 'item' : 'items'} · tap "Add extras" on any dish to offer toppings, sides, or upgrades
          </p>
        </div>
        <VerificationGate role="vendor" userId={vendorUserId} action="add menu items" variant="inline">
          <button
            onClick={() => !isSuspended && setShowForm(p => !p)}
            disabled={isSuspended}
            title={isSuspended ? 'Menu changes are locked while your store is suspended' : undefined}
            className="flex items-center justify-center gap-1.5 h-10 px-4 bg-blue-600 hover:bg-blue-700 text-white text-xs font-black rounded-xl transition-all shadow-sm shadow-blue-600/20 shrink-0 w-full sm:w-auto disabled:opacity-40 disabled:hover:bg-blue-600 disabled:cursor-not-allowed disabled:shadow-none"
          >
            <Plus className="w-3.5 h-3.5" />
            Add dish
          </button>
        </VerificationGate>
      </div>

      {showForm && !isSuspended && (
        <div className="bg-white dark:bg-slate-900 border border-blue-200 dark:border-blue-800 rounded-2xl p-4 space-y-4 animate-in fade-in slide-in-from-top-2 duration-200">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-blue-500" />
            <p className="text-xs font-black text-slate-900 dark:text-white">New menu item</p>
          </div>

          <ImageUpload
            value={form.image_url}
            onChange={url => setForm(p => ({ ...p, image_url: url }))}
            label="Dish photo"
            optional={true}
          />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <input
              value={form.name}
              onChange={e => setForm(p => ({ ...p, name: e.target.value }))}
              placeholder="Dish name *"
              className="h-10 px-3 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 outline-none focus:border-blue-500 transition-colors"
            />
            <input
              value={form.base_price}
              onChange={e => setForm(p => ({ ...p, base_price: e.target.value }))}
              placeholder="Price (₦) *"
              type="number"
              className="h-10 px-3 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 outline-none focus:border-blue-500 transition-colors"
            />
            <input
              value={form.description}
              onChange={e => setForm(p => ({ ...p, description: e.target.value }))}
              placeholder="Short description (optional)"
              className="h-10 px-3 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 outline-none focus:border-blue-500 transition-colors sm:col-span-2"
            />
          </div>

          <p className="text-[11px] text-slate-400 leading-relaxed">
            You can add extras (toppings, sides, size upgrades) to this dish after saving it.
          </p>

          <div className="flex flex-col-reverse sm:flex-row gap-2">
            <button
              onClick={() => { setShowForm(false); setForm({ name: '', description: '', base_price: '', image_url: '' }); }}
              className="h-9 px-4 border border-slate-200 dark:border-slate-700 text-slate-500 text-xs font-bold rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800 transition-all"
            >
              Cancel
            </button>
            <button
              onClick={addItem}
              disabled={saving || isSuspended || !form.name || !form.base_price}
              className="h-9 px-4 bg-blue-600 hover:bg-blue-700 disabled:opacity-40 text-white text-xs font-black rounded-xl transition-all"
            >
              {saving ? 'Saving...' : 'Save dish'}
            </button>
          </div>
        </div>
      )}

      {items.length === 0 && !showForm ? (
        <div className="flex flex-col items-center justify-center py-16 px-4 border border-dashed border-slate-200 dark:border-slate-800 rounded-2xl text-center">
          <div className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center mb-3">
            <Sparkles className="w-5 h-5 text-slate-400" />
          </div>
          <p className="text-xs font-black text-slate-400">No menu items yet</p>
          <p className="text-[11px] text-slate-300 dark:text-slate-600 mt-1 max-w-xs">
            Add your first dish to get started — you can add photos, descriptions, and extras once it's saved.
          </p>
        </div>
      ) : (
        <div className="space-y-3 ">
          {items.map(item => (
            <MenuItemCard
              key={item.id}
              item={item}
              extras={extras[item.id] || []}
              onUpdate={fetchMenu}
              onDelete={deleteItem}
              isSuspended={isSuspended}
            />
          ))}
        </div>
      )}
    </div>
  );
}