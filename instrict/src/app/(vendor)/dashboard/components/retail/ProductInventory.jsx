'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/utils/supabase/client';
import { ImagePlaceholder } from '../shared/ImageUpload';
import MultiImageUpload from '../shared/MultiImageUpload';
import { Plus, Trash2, AlertTriangle, Package, X, Save } from 'lucide-react';
import VerificationGate from '@/components/verification/VerificationGate';

const inputClass = "w-full h-10 px-3 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 transition-all";
const LOW_STOCK_THRESHOLD = 5;

function ProductFormModal({ product, onClose, onSaved, vendorUserId, availableCategories, isSuspended }) {
  const supabase = createClient();
  const [form, setForm] = useState({
    name: product?.name || '',
    description: product?.description || '',
    base_price: product?.base_price || '',
    category: product?.category || '',
  });
  const [variants, setVariants] = useState(
    product?.product_variants?.length
      ? product.product_variants
      : [{ size: '', color: '', stock: 0, price_adjustment: 0 }]
  );
  const [images, setImages] = useState(
    product?.product_images?.length
      ? [...product.product_images].sort((a, b) => a.position - b.position).map(pi => pi.image_url)
      : product?.image_url ? [product.image_url] : []
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const addVariant = () => setVariants(v => [...v, { size: '', color: '', stock: 0, price_adjustment: 0 }]);
  const updateVariant = (i, updated) => setVariants(v => v.map((row, idx) => idx === i ? updated : row));
  const removeVariant = (i) => setVariants(v => v.filter((_, idx) => idx !== i));

  const handleSave = async () => {
    if (isSuspended) return;
    if (!form.name || !form.base_price) { setError('Name and price are required.'); return; }
    setError('');
    setSaving(true);

    try {
      let itemId = product?.id;

      const payload = {
        name: form.name,
        description: form.description,
        base_price: form.base_price,
        category: form.category || null,
        image_url: images[0] || null, // cover photo, kept in sync for any code that still reads image_url
      };

      if (itemId) {
        await supabase.from('menu_items').update(payload).eq('id', itemId);
      } else {
        const { data: newItem, error: insertError } = await supabase
          .from('menu_items')
          .insert({ vendor_id: vendorUserId, ...payload })
          .select()
          .single();
        if (insertError) throw insertError;
        itemId = newItem.id;
      }

      // Variants
      await supabase.from('product_variants').delete().eq('menu_item_id', itemId);
      const validVariants = variants.filter(v => v.size || v.color);
      if (validVariants.length > 0) {
        await supabase.from('product_variants').insert(
          validVariants.map(v => ({
            menu_item_id: itemId,
            size: v.size || null,
            color: v.color || null,
            stock: v.stock || 0,
            price_adjustment: v.price_adjustment || 0,
          }))
        );
      }

      // Images
      await supabase.from('product_images').delete().eq('menu_item_id', itemId);
      if (images.length > 0) {
        await supabase.from('product_images').insert(
          images.map((url, i) => ({
            menu_item_id: itemId,
            image_url: url,
            position: i,
          }))
        );
      }

      onSaved();
      onClose();
    } catch (err) {
      setError(err.message || 'Failed to save product.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 backdrop-blur-sm p-0 sm:p-4">
      <div className="w-full sm:max-w-lg bg-white dark:bg-slate-900 rounded-t-2xl sm:rounded-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 dark:border-slate-800 sticky top-0 bg-white dark:bg-slate-900">
          <h3 className="text-sm font-black text-slate-900 dark:text-white">
            {product ? 'Edit Product' : 'Add Product'}
          </h3>
          <button onClick={onClose} className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-5 space-y-5">
          {isSuspended && (
            <p className="text-[11px] font-bold text-rose-500 bg-rose-500/5 border border-rose-500/20 rounded-xl px-3 py-2">
              Your store is suspended — changes can't be saved until this is resolved.
            </p>
          )}

          <fieldset disabled={isSuspended} className="space-y-5 disabled:opacity-60">
            <MultiImageUpload value={images} onChange={setImages} label="Product Photos" max={6} />

            <div className="space-y-1.5">
              <label className="text-[10px] font-black uppercase tracking-wider text-slate-400">Product Name *</label>
              <input value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} placeholder="e.g. Campus Hoodie" className={inputClass} />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-[10px] font-black uppercase tracking-wider text-slate-400">Price (₦) *</label>
                <input type="number" value={form.base_price} onChange={e => setForm(p => ({ ...p, base_price: e.target.value }))} placeholder="5000" className={inputClass} />
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-black uppercase tracking-wider text-slate-400">Category</label>
                <select
                  value={form.category}
                  onChange={e => setForm(p => ({ ...p, category: e.target.value }))}
                  className={inputClass}
                >
                  <option value="">No category</option>
                  {availableCategories.map(cat => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] font-black uppercase tracking-wider text-slate-400">Description</label>
              <textarea
                value={form.description}
                onChange={e => setForm(p => ({ ...p, description: e.target.value }))}
                rows={2}
                placeholder="Brief details about this product..."
                className="w-full px-3 py-2.5 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 resize-none"
              />
            </div>

            <div className="space-y-3 border-t border-slate-100 dark:border-slate-800 pt-4">
              <div>
                <label className="text-[10px] font-black uppercase tracking-wider text-slate-400">Variants (optional)</label>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  If this product comes in different sizes or colors, add a row for each combination and set how many you have in stock.
                </p>
              </div>

              <div className="space-y-3">
                {variants.map((v, i) => (
                  <div key={i} className="bg-slate-50 dark:bg-slate-800/50 rounded-xl p-3 space-y-2 relative">
                    <button
                      type="button"
                      onClick={() => removeVariant(i)}
                      className="absolute top-2 right-2 p-1 text-slate-300 hover:text-rose-500 transition-colors"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                    <div className="grid grid-cols-2 gap-2">
                      <div className="space-y-1">
                        <label className="text-[9px] font-bold uppercase text-slate-400">Size (e.g. S, M, L)</label>
                        <input
                          placeholder="M"
                          value={v.size || ''}
                          onChange={e => updateVariant(i, { ...v, size: e.target.value })}
                          className={inputClass}
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[9px] font-bold uppercase text-slate-400">Color</label>
                        <input
                          placeholder="Black"
                          value={v.color || ''}
                          onChange={e => updateVariant(i, { ...v, color: e.target.value })}
                          className={inputClass}
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div className="space-y-1">
                        <label className="text-[9px] font-bold uppercase text-slate-400">Stock available</label>
                        <input
                          type="number"
                          placeholder="10"
                          value={v.stock ?? 0}
                          onChange={e => updateVariant(i, { ...v, stock: Number(e.target.value) })}
                          className={inputClass}
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[9px] font-bold uppercase text-slate-400">Extra cost for this variant (₦)</label>
                        <input
                          type="number"
                          placeholder="0"
                          value={v.price_adjustment ?? 0}
                          onChange={e => updateVariant(i, { ...v, price_adjustment: Number(e.target.value) })}
                          className={inputClass}
                        />
                        <p className="text-[9px] text-slate-400">Leave as 0 if this size/color costs the same as the base price.</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <button
                type="button"
                onClick={addVariant}
                className="w-full h-9 rounded-xl border border-dashed border-slate-300 dark:border-slate-700 text-slate-400 hover:text-blue-500 hover:border-blue-400 text-[11px] font-black tracking-tight flex items-center justify-center gap-1.5 transition-colors"
              >
                <Plus className="w-3.5 h-3.5" /> Add another size/color
              </button>
            </div>
          </fieldset>

          {error && <p className="text-[11px] font-bold text-rose-500">{error}</p>}

          <button
            onClick={handleSave}
            disabled={saving || isSuspended}
            title={isSuspended ? 'Locked while your store is suspended' : undefined}
            className="w-full h-11 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-sm font-black tracking-tight transition-all flex items-center justify-center gap-2"
          >
            {saving ? 'Saving...' : <><Save className="w-4 h-4" /> Save Product</>}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function ProductInventory({ vendorUserId, isSuspended }) {
  const supabase = createClient();
  const [products, setProducts] = useState([]);
  const [vendorCategories, setVendorCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [editingProduct, setEditingProduct] = useState(null);
  const [showModal, setShowModal] = useState(false);

  useEffect(() => {
    fetchProducts();
    fetchVendorCategories();
  }, []);

  const fetchVendorCategories = async () => {
    const { data } = await supabase
      .from('vendor_profiles')
      .select('sub_categories')
      .eq('user_id', vendorUserId)
      .single();
    setVendorCategories(data?.sub_categories || []);
  };

  const fetchProducts = async () => {
    const { data } = await supabase
      .from('menu_items')
      .select('*, product_variants(*), product_images(*)')
      .eq('vendor_id', vendorUserId)
      .order('created_at', { ascending: false });
    setProducts(data || []);
    setLoading(false);
  };

  const totalStock = (product) =>
    (product.product_variants || []).reduce((sum, v) => sum + (v.stock || 0), 0);

  const isLowStock = (product) => {
    const variants = product.product_variants || [];
    if (variants.length === 0) return false;
    return variants.some(v => v.stock <= LOW_STOCK_THRESHOLD);
  };

  const coverImage = (product) => {
    const imgs = product.product_images || [];
    if (imgs.length) return [...imgs].sort((a, b) => a.position - b.position)[0].image_url;
    return product.image_url;
  };

  const extraImageCount = (product) => Math.max((product.product_images?.length || 0) - 1, 0);

  const deleteProduct = async (id) => {
    if (isSuspended) return;
    if (!confirm('Delete this product? This cannot be undone.')) return;
    await supabase.from('menu_items').delete().eq('id', id);
    fetchProducts();
  };

  const openModal = (product) => {
    if (isSuspended) return;
    setEditingProduct(product);
    setShowModal(true);
  };

  const filtered = filter === 'low_stock' ? products.filter(isLowStock) : products;
  const lowStockCount = products.filter(isLowStock).length;

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-sm font-black tracking-tight text-slate-900 dark:text-white">Inventory</h2>
          <p className="text-[11px] text-slate-400 mt-0.5">{products.length} products</p>
        </div>
        <VerificationGate role="vendor" userId={vendorUserId} action="add products" variant="inline">
          <button
            onClick={() => openModal(null)}
            disabled={isSuspended}
            title={isSuspended ? 'Inventory changes are locked while your store is suspended' : undefined}
            className="h-9 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-black tracking-tight flex items-center gap-1.5 disabled:opacity-40 disabled:hover:bg-blue-600 disabled:cursor-not-allowed"
          >
            <Plus className="w-3.5 h-3.5" /> Add Product
          </button>
        </VerificationGate>
      </div>

      <div className="flex gap-1 p-1 bg-slate-100 dark:bg-slate-800 rounded-xl w-fit">
        {[
          { key: 'all', label: 'All Products' },
          { key: 'low_stock', label: 'Low Stock' },
        ].map(tab => (
          <button
            key={tab.key}
            onClick={() => setFilter(tab.key)}
            className={`px-4 py-1.5 rounded-lg text-[11px] font-black tracking-tight transition-all ${
              filter === tab.key
                ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-300'
            }`}
          >
            {tab.label}
            {tab.key === 'low_stock' && lowStockCount > 0 && (
              <span className="ml-1.5 px-1.5 py-0.5 bg-amber-500 text-white text-[9px] font-black rounded-full">
                {lowStockCount}
              </span>
            )}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => <div key={i} className="h-48 bg-slate-100 dark:bg-slate-800 rounded-2xl animate-pulse" />)}
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center border border-dashed border-slate-200 dark:border-slate-800 rounded-2xl">
          <Package className="w-8 h-8 text-slate-300 mb-2" />
          <p className="text-xs font-black text-slate-400">
            {filter === 'low_stock' ? 'No low stock items' : 'No products yet'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          {filtered.map(product => {
            const lowStock = isLowStock(product);
            const cover = coverImage(product);
            const extra = extraImageCount(product);
            return (
              <div key={product.id} className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl overflow-hidden group">
                <div className="relative h-32 bg-slate-100 dark:bg-slate-800">
                  {cover ? (
                    <img src={cover} alt={product.name} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <ImagePlaceholder name={product.name} size="lg" />
                    </div>
                  )}
                  {lowStock && (
                    <span className="absolute top-2 left-2 flex items-center gap-1 bg-amber-500 text-white text-[9px] font-black px-2 py-1 rounded-lg">
                      <AlertTriangle className="w-3 h-3" /> Low stock
                    </span>
                  )}
                  {extra > 0 && (
                    <span className="absolute bottom-2 right-2 bg-black/60 text-white text-[9px] font-black px-1.5 py-0.5 rounded-md">
                      +{extra}
                    </span>
                  )}
                </div>
                <div className="p-3 space-y-1.5">
                  <p className="text-xs font-black text-slate-900 dark:text-white truncate">{product.name}</p>
                  <div className="flex items-center justify-between">
                    <p className="text-[11px] font-bold text-blue-600 dark:text-blue-400">₦{Number(product.base_price).toLocaleString()}</p>
                    <p className="text-[10px] text-slate-400">{totalStock(product)} in stock</p>
                  </div>
                  <div className="flex gap-1.5 pt-1">
                    <button
                      onClick={() => openModal(product)}
                      disabled={isSuspended}
                      title={isSuspended ? 'Locked while your store is suspended' : undefined}
                      className="flex-1 h-7 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-[10px] font-black hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors disabled:opacity-40 disabled:hover:bg-slate-100 disabled:cursor-not-allowed"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => deleteProduct(product.id)}
                      disabled={isSuspended}
                      title={isSuspended ? 'Locked while your store is suspended' : undefined}
                      className="w-7 h-7 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-500/10 flex items-center justify-center transition-colors disabled:opacity-40 disabled:hover:text-slate-400 disabled:hover:bg-slate-100 disabled:cursor-not-allowed"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {showModal && (
        <ProductFormModal
          product={editingProduct}
          vendorUserId={vendorUserId}
          availableCategories={vendorCategories}
          onClose={() => setShowModal(false)}
          onSaved={fetchProducts}
          isSuspended={isSuspended}
        />
      )}
    </div>
  );
}