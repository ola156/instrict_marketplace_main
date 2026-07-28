'use client';

import { useState, useTransition } from 'react';
import { Plus, Trash2, Pencil, Check, X, ArrowRight } from 'lucide-react';
import {
  updateCampus,
  deleteCampus,
  createZone,
  updateZone,
  deleteZone,
  upsertZoneFee,
  deleteZoneFee,
} from './actions';

const ZONE_TYPE_SUGGESTIONS = ['hostel', 'market', 'gate', 'academic', 'other'];

const ZONE_TYPE_COLORS = {
  hostel: 'text-emerald-400 bg-emerald-950/40 border-emerald-900',
  market: 'text-amber-400 bg-amber-950/40 border-amber-900',
  gate: 'text-cyan-400 bg-cyan-950/40 border-cyan-900',
  academic: 'text-indigo-400 bg-indigo-950/40 border-indigo-900',
  other: 'text-slate-400 bg-slate-800/40 border-slate-700',
};

function zoneBadgeClass(type) {
  return ZONE_TYPE_COLORS[type] || ZONE_TYPE_COLORS.other;
}

export default function CampusPanel({ campus, zones, fees }) {
  const [isPending, startTransition] = useTransition();
  const [editingCampus, setEditingCampus] = useState(false);
  const [campusForm, setCampusForm] = useState({
    name: campus.name,
    slug: campus.slug,
    default_delivery_fee: campus.default_delivery_fee,
  });

  const [zoneForm, setZoneForm] = useState({ name: '', zone_type: 'hostel' });
  const [feeForm, setFeeForm] = useState({ vendor_zone_id: '', student_zone_id: '', fee: '' });
  const [err, setErr] = useState('');

  function refresh() {
    window.location.reload();
  }

  function saveCampus() {
    startTransition(async () => {
      const res = await updateCampus(campus.id, campusForm);
      if (res?.error) return setErr(res.error);
      setEditingCampus(false);
      refresh();
    });
  }

  function removeCampus() {
    if (!confirm(`Delete "${campus.name}" and ALL its zones and fee rules? This can't be undone.`)) return;
    startTransition(async () => {
      const res = await deleteCampus(campus.id);
      if (res?.error) return setErr(res.error);
      refresh();
    });
  }

  function addZone(e) {
    e.preventDefault();
    startTransition(async () => {
      const res = await createZone({ campus_id: campus.id, ...zoneForm });
      if (res?.error) return setErr(res.error);
      setZoneForm({ name: '', zone_type: 'hostel' });
      refresh();
    });
  }

  function toggleZoneActive(zone) {
    startTransition(async () => {
      await updateZone(zone.id, { is_active: !zone.is_active });
      refresh();
    });
  }

  function removeZone(zone) {
    if (!confirm(`Delete zone "${zone.name}"? Any fee rules using it will be deleted too.`)) return;
    startTransition(async () => {
      const res = await deleteZone(zone.id);
      if (res?.error) return setErr(res.error);
      refresh();
    });
  }

  function addOrUpdateFee(e) {
    e.preventDefault();
    startTransition(async () => {
      const res = await upsertZoneFee({ campus_id: campus.id, ...feeForm });
      if (res?.error) return setErr(res.error);
      setFeeForm({ vendor_zone_id: '', student_zone_id: '', fee: '' });
      refresh();
    });
  }

  function removeFee(id) {
    if (!confirm('Remove this fee override? It will fall back to the campus default fee.')) return;
    startTransition(async () => {
      await deleteZoneFee(id);
      refresh();
    });
  }

  const zoneName = (id) => zones.find((z) => z.id === id)?.name ?? '—';
  const zoneType = (id) => zones.find((z) => z.id === id)?.zone_type ?? '';

  return (
    <div className="space-y-4">
      {err && (
        <div className="text-xs font-mono text-rose-400 border border-rose-900 bg-rose-950/30 rounded-md p-2">
          {err}
        </div>
      )}

      {/* Campus settings */}
      <div className="rounded-lg border border-slate-800 bg-slate-900/50 p-4">
        <div className="flex justify-between items-start gap-4 flex-wrap">
          <div className="min-w-0">
            {editingCampus ? (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs">
                <input
                  value={campusForm.name}
                  onChange={(e) => setCampusForm((f) => ({ ...f, name: e.target.value }))}
                  className="bg-slate-950 border border-slate-800 rounded-md px-2 py-1.5 text-slate-200 outline-none focus:border-slate-600"
                  placeholder="Name"
                />
                <input
                  value={campusForm.slug}
                  onChange={(e) => setCampusForm((f) => ({ ...f, slug: e.target.value }))}
                  className="bg-slate-950 border border-slate-800 rounded-md px-2 py-1.5 text-slate-200 font-mono outline-none focus:border-slate-600"
                  placeholder="Slug"
                />
                <input
                  type="number"
                  value={campusForm.default_delivery_fee}
                  onChange={(e) => setCampusForm((f) => ({ ...f, default_delivery_fee: e.target.value }))}
                  className="bg-slate-950 border border-slate-800 rounded-md px-2 py-1.5 text-slate-200 font-mono outline-none focus:border-slate-600"
                  placeholder="Default fee"
                />
              </div>
            ) : (
              <>
                <p className="text-sm font-semibold text-slate-100">{campus.name}</p>
                <p className="text-[11px] font-mono text-slate-500 mt-0.5">
                  /{campus.slug} · default fee ₦{campus.default_delivery_fee}
                </p>
              </>
            )}
          </div>

          <div className="flex gap-2 shrink-0">
            {editingCampus ? (
              <>
                <button
                  onClick={saveCampus}
                  disabled={isPending}
                  className="p-1.5 rounded-md bg-emerald-900/50 hover:bg-emerald-900 text-emerald-300"
                >
                  <Check size={14} />
                </button>
                <button
                  onClick={() => setEditingCampus(false)}
                  className="p-1.5 rounded-md bg-slate-800 hover:bg-slate-700 text-slate-300"
                >
                  <X size={14} />
                </button>
              </>
            ) : (
              <button
                onClick={() => setEditingCampus(true)}
                className="p-1.5 rounded-md bg-slate-800 hover:bg-slate-700 text-slate-300"
              >
                <Pencil size={14} />
              </button>
            )}
            <button
              onClick={removeCampus}
              className="p-1.5 rounded-md bg-rose-900/50 hover:bg-rose-900 text-rose-300"
            >
              <Trash2 size={14} />
            </button>
          </div>
        </div>
      </div>

      {/* Zones */}
      <div className="rounded-lg border border-slate-800 bg-slate-900/50 p-4">
        <h3 className="text-xs font-bold uppercase tracking-wide text-slate-500 mb-3">Zones</h3>

        <form onSubmit={addZone} className="flex flex-wrap gap-2 mb-4">
          <input
            required
            placeholder="Zone name (e.g. Zone A, Mercy Hostel)"
            value={zoneForm.name}
            onChange={(e) => setZoneForm((f) => ({ ...f, name: e.target.value }))}
            className="flex-1 min-w-[160px] text-xs bg-slate-950 border border-slate-800 rounded-md px-2 py-1.5 text-slate-200 outline-none focus:border-slate-600"
          />
          <input
            list="zone-type-suggestions"
            placeholder="Type"
            value={zoneForm.zone_type}
            onChange={(e) => setZoneForm((f) => ({ ...f, zone_type: e.target.value }))}
            className="w-28 text-xs bg-slate-950 border border-slate-800 rounded-md px-2 py-1.5 text-slate-200 font-mono outline-none focus:border-slate-600"
          />
          <datalist id="zone-type-suggestions">
            {ZONE_TYPE_SUGGESTIONS.map((t) => (
              <option key={t} value={t} />
            ))}
          </datalist>
          <button
            disabled={isPending}
            className="flex items-center gap-1 text-xs font-bold bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white rounded-md px-3 py-1.5"
          >
            <Plus size={13} /> Add
          </button>
        </form>

        <div className="space-y-2">
          {zones.map((z) => (
            <div
              key={z.id}
              className={`flex items-center justify-between gap-3 rounded-md border p-2.5 ${
                z.is_active ? 'border-slate-800 bg-slate-950/40' : 'border-slate-800/50 bg-slate-950/20 opacity-60'
              }`}
            >
              <div className="flex items-center gap-2 min-w-0">
                <span className="text-sm text-slate-200 truncate">{z.name}</span>
                <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded border ${zoneBadgeClass(z.zone_type)}`}>
                  {z.zone_type}
                </span>
                {!z.is_active && (
                  <span className="text-[10px] font-bold uppercase text-rose-400">inactive</span>
                )}
              </div>
              <div className="flex gap-1.5 shrink-0">
                <button
                  onClick={() => toggleZoneActive(z)}
                  disabled={isPending}
                  className="text-[10px] font-bold px-2 py-1 rounded-md bg-slate-800 hover:bg-slate-700 text-slate-300"
                >
                  {z.is_active ? 'Deactivate' : 'Activate'}
                </button>
                <button
                  onClick={() => removeZone(z)}
                  className="p-1.5 rounded-md bg-rose-900/50 hover:bg-rose-900 text-rose-300"
                >
                  <Trash2 size={12} />
                </button>
              </div>
            </div>
          ))}
          {zones.length === 0 && <p className="text-xs text-slate-600 py-2">No zones yet.</p>}
        </div>
      </div>

      {/* Fee overrides */}
      <div className="rounded-lg border border-slate-800 bg-slate-900/50 p-4">
        <h3 className="text-xs font-bold uppercase tracking-wide text-slate-500 mb-1">
          Zone-to-zone delivery fees
        </h3>
        <p className="text-[11px] text-slate-600 mb-3">
          Overrides the campus default (₦{campus.default_delivery_fee}) for a specific pair.
        </p>

        <form onSubmit={addOrUpdateFee} className="flex flex-wrap gap-2 mb-4 items-center">
          <select
            required
            value={feeForm.vendor_zone_id}
            onChange={(e) => setFeeForm((f) => ({ ...f, vendor_zone_id: e.target.value }))}
            className="text-xs bg-slate-950 border border-slate-800 rounded-md px-2 py-1.5 text-slate-200 outline-none focus:border-slate-600"
          >
            <option value="">Vendor zone…</option>
            {zones.map((z) => (
              <option key={z.id} value={z.id}>{z.name}</option>
            ))}
          </select>
          <ArrowRight size={13} className="text-slate-600 shrink-0" />
          <select
            required
            value={feeForm.student_zone_id}
            onChange={(e) => setFeeForm((f) => ({ ...f, student_zone_id: e.target.value }))}
            className="text-xs bg-slate-950 border border-slate-800 rounded-md px-2 py-1.5 text-slate-200 outline-none focus:border-slate-600"
          >
            <option value="">Student zone…</option>
            {zones.map((z) => (
              <option key={z.id} value={z.id}>{z.name}</option>
            ))}
          </select>
          <input
            required
            type="number"
            placeholder="₦ fee"
            value={feeForm.fee}
            onChange={(e) => setFeeForm((f) => ({ ...f, fee: e.target.value }))}
            className="w-20 text-xs bg-slate-950 border border-slate-800 rounded-md px-2 py-1.5 text-slate-200 font-mono outline-none focus:border-slate-600"
          />
          <button
            disabled={isPending}
            className="text-xs font-bold bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white rounded-md px-3 py-1.5"
          >
            Save
          </button>
        </form>

        <div className="space-y-2">
          {fees.map((f) => (
            <div
              key={f.id}
              className="flex items-center justify-between gap-3 rounded-md border border-slate-800 bg-slate-950/40 p-2.5"
            >
              <span className="flex items-center gap-2 text-xs text-slate-300 min-w-0 flex-wrap">
                <span className={`px-1.5 py-0.5 rounded border text-[10px] font-bold ${zoneBadgeClass(zoneType(f.vendor_zone_id))}`}>
                  {zoneName(f.vendor_zone_id)}
                </span>
                <ArrowRight size={11} className="text-slate-600" />
                <span className={`px-1.5 py-0.5 rounded border text-[10px] font-bold ${zoneBadgeClass(zoneType(f.student_zone_id))}`}>
                  {zoneName(f.student_zone_id)}
                </span>
                <span className="font-mono text-slate-500">₦{f.fee}</span>
              </span>
              <button
                onClick={() => removeFee(f.id)}
                className="p-1.5 rounded-md bg-rose-900/50 hover:bg-rose-900 text-rose-300 shrink-0"
              >
                <Trash2 size={12} />
              </button>
            </div>
          ))}
          {fees.length === 0 && (
            <p className="text-xs text-slate-600 py-2">No overrides — default fee applies to all pairs.</p>
          )}
        </div>
      </div>
    </div>
  );
}