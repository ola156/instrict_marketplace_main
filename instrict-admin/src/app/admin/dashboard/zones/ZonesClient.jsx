'use client';

import { useState } from 'react';
import { Plus, Building2, ChevronRight } from 'lucide-react';
import { createCampus } from './actions';
import CampusPanel from './CampusPanel';

export default function ZonesClient({ initialCampuses, initialZones, initialFees }) {
  const [campuses, setCampuses] = useState(initialCampuses);
  const [zones] = useState(initialZones);
  const [fees] = useState(initialFees);
  const [selectedId, setSelectedId] = useState(initialCampuses[0]?.id ?? null);
  const [showNewCampus, setShowNewCampus] = useState(false);
  const [form, setForm] = useState({ name: '', slug: '', default_delivery_fee: 300 });
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState('');
  const [mobileListOpen, setMobileListOpen] = useState(!initialCampuses.length);

  const selectedCampus = campuses.find((c) => c.id === selectedId) || null;

  async function handleCreateCampus(e) {
    e.preventDefault();
    setSaving(true);
    setErr('');
    const res = await createCampus(form);
    setSaving(false);
    if (res?.error) {
      setErr(res.error);
      return;
    }
    window.location.reload();
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-4">
      {/* Campus list */}
      <div className="rounded-lg border border-slate-800 bg-slate-900/50 p-4 h-fit">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-xs font-bold uppercase tracking-wide text-slate-500">Campuses</h2>
          <button
            onClick={() => setShowNewCampus((s) => !s)}
            className="p-1.5 rounded-md bg-slate-800 hover:bg-slate-700 text-slate-300"
            title="Add campus"
          >
            <Plus size={14} />
          </button>
        </div>

        {showNewCampus && (
          <form
            onSubmit={handleCreateCampus}
            className="mb-3 space-y-2 border border-slate-800 rounded-md p-3 bg-slate-950/60"
          >
            <input
              required
              placeholder="Name (e.g. University of Ibadan)"
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              className="w-full text-xs bg-slate-950 border border-slate-800 rounded-md px-2 py-1.5 text-slate-200 outline-none focus:border-slate-600"
            />
            <input
              required
              placeholder="Slug (e.g. ui)"
              value={form.slug}
              onChange={(e) => setForm((f) => ({ ...f, slug: e.target.value }))}
              className="w-full text-xs bg-slate-950 border border-slate-800 rounded-md px-2 py-1.5 text-slate-200 font-mono outline-none focus:border-slate-600"
            />
            <input
              type="number"
              placeholder="Default delivery fee"
              value={form.default_delivery_fee}
              onChange={(e) => setForm((f) => ({ ...f, default_delivery_fee: e.target.value }))}
              className="w-full text-xs bg-slate-950 border border-slate-800 rounded-md px-2 py-1.5 text-slate-200 font-mono outline-none focus:border-slate-600"
            />
            {err && <p className="text-[10px] text-rose-400 font-mono">{err}</p>}
            <button
              disabled={saving}
              className="w-full text-xs font-bold bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white rounded-md py-1.5"
            >
              {saving ? 'Saving…' : 'Create campus'}
            </button>
          </form>
        )}

        <div className="space-y-1">
          {campuses.map((c) => {
            const zoneCount = zones.filter((z) => z.campus_id === c.id).length;
            const active = selectedId === c.id;
            return (
              <button
                key={c.id}
                onClick={() => {
                  setSelectedId(c.id);
                  setMobileListOpen(false);
                }}
                className={`w-full flex items-center justify-between gap-2 text-left px-3 py-2 rounded-md text-sm transition-colors ${
                  active
                    ? 'bg-emerald-600/10 border border-emerald-700/50 text-emerald-300'
                    : 'border border-transparent hover:bg-slate-800/60 text-slate-300'
                }`}
              >
                <span className="flex items-center gap-2 min-w-0">
                  <Building2 size={13} className="shrink-0 opacity-60" />
                  <span className="truncate">{c.name}</span>
                </span>
                <span className="text-[10px] font-mono text-slate-500 shrink-0">{zoneCount}</span>
              </button>
            );
          })}
          {campuses.length === 0 && (
            <p className="text-xs text-slate-600 px-2 py-1">No campuses yet.</p>
          )}
        </div>
      </div>

      {/* Selected campus detail */}
      <div>
        {selectedCampus ? (
          <>
            {/* mobile campus switcher */}
            <button
              onClick={() => setMobileListOpen((s) => !s)}
              className="lg:hidden w-full flex items-center justify-between mb-3 px-3 py-2 rounded-md bg-slate-900/50 border border-slate-800 text-sm text-slate-300"
            >
              <span className="flex items-center gap-2">
                <Building2 size={13} className="opacity-60" />
                {selectedCampus.name}
              </span>
              <ChevronRight size={14} className={`transition-transform ${mobileListOpen ? 'rotate-90' : ''}`} />
            </button>
            <CampusPanel
              campus={selectedCampus}
              zones={zones.filter((z) => z.campus_id === selectedCampus.id)}
              fees={fees.filter((f) => f.campus_id === selectedCampus.id)}
            />
          </>
        ) : (
          <div className="rounded-lg border border-slate-800 bg-slate-900/50 p-6 text-sm text-slate-500">
            Select or create a campus to manage its zones.
          </div>
        )}
      </div>
    </div>
  );
}