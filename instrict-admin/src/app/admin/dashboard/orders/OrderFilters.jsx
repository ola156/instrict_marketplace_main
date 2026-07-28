'use client';

import { Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

const STATUSES = ['pending', 'confirmed', 'preparing', 'ready', 'picked_up', 'delivered', 'cancelled'];
const FULFILLMENT_TYPES = ['pickup', 'delivery'];

function OrderFiltersInner({ vendors }) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const update = (key, value) => {
    const params = new URLSearchParams(searchParams.toString());
    if (value) {
      params.set(key, value);
    } else {
      params.delete(key);
    }
    router.push(`/admin/dashboard/orders?${params.toString()}`);
  };

  const selectClass =
    'bg-slate-900 border border-slate-800 rounded-md px-3 py-2 text-xs font-mono text-slate-200 outline-none focus:border-emerald-600';

  return (
    <div className="flex flex-wrap gap-3">
      <select
        className={selectClass}
        value={searchParams.get('status') || ''}
        onChange={(e) => update('status', e.target.value)}
      >
        <option value="">All statuses</option>
        {STATUSES.map((s) => (
          <option key={s} value={s}>
            {s}
          </option>
        ))}
      </select>

      <select
        className={selectClass}
        value={searchParams.get('vendor_id') || ''}
        onChange={(e) => update('vendor_id', e.target.value)}
      >
        <option value="">All vendors</option>
        {vendors?.map((v) => (
          <option key={v.user_id} value={v.user_id}>
            {v.legal_name}
          </option>
        ))}
      </select>

      <select
        className={selectClass}
        value={searchParams.get('fulfillment_type') || ''}
        onChange={(e) => update('fulfillment_type', e.target.value)}
      >
        <option value="">All fulfillment types</option>
        {FULFILLMENT_TYPES.map((f) => (
          <option key={f} value={f}>
            {f}
          </option>
        ))}
      </select>

      {(searchParams.get('status') || searchParams.get('vendor_id') || searchParams.get('fulfillment_type')) && (
        <button
          onClick={() => router.push('/admin/dashboard/orders')}
          className="text-xs font-mono text-slate-500 hover:text-slate-300 px-2"
        >
          Clear filters
        </button>
      )}
    </div>
  );
}

export default function OrderFilters({ vendors }) {
  return (
    <Suspense fallback={null}>
      <OrderFiltersInner vendors={vendors} />
    </Suspense>
  );
}