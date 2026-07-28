// app/admin/dashboard/accounts/AccountsExplorer.jsx
'use client';

import { useMemo, useState } from 'react';
import { Search, X } from 'lucide-react';
import AccountRow from './AccountRow';

const STATUS_FILTERS = [
  { key: 'all', label: 'All' },
  { key: 'active', label: 'Active' },
  { key: 'suspended', label: 'Suspended' },
  { key: 'pending', label: 'Pending' },
  { key: 'rejected', label: 'Rejected' },
];

const ROLE_FILTERS = [
  { key: 'all', label: 'All roles' },
  { key: 'vendor', label: 'Vendors' },
  { key: 'rider', label: 'Riders' },
  { key: 'student', label: 'Students' },
];

function normalize(str) {
  return (str || '').toLowerCase();
}

export default function AccountsExplorer({ vendors, riders, students }) {
  const [query, setQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [roleFilter, setRoleFilter] = useState('all');

  const combined = useMemo(() => {
    const taggedVendors = vendors.map((v) => ({
      role: 'vendor',
      userId: v.user_id,
      name: v.legal_name,
      subtitle: v.category,
      searchBlob: normalize(`${v.legal_name} ${v.category} ${v.support_phone}`),
      approved: v.approved,
      accountStatus: v.account_status,
      suspendedReason: v.suspended_reason,
      suspendedAt: v.suspended_at,
    }));
    const taggedRiders = riders.map((r) => ({
      role: 'rider',
      userId: r.user_id,
      name: r.full_name,
      subtitle: r.phone,
      searchBlob: normalize(`${r.full_name} ${r.phone}`),
      approved: r.approved,
      accountStatus: r.account_status,
      suspendedReason: r.suspended_reason,
      suspendedAt: r.suspended_at,
    }));
    // Students have no approval gate in your schema (no `approved` column
    // was ever mentioned for them) — treat as always "approved" for the
    // not-approved badge in AccountRow, so it doesn't wrongly flag every
    // student as unapproved.
    const taggedStudents = students.map((s) => ({
      role: 'student',
      userId: s.user_id,
      name: s.full_name,
      subtitle: s.phone,
      searchBlob: normalize(`${s.full_name} ${s.phone}`),
      approved: true,
      accountStatus: s.account_status,
      suspendedReason: s.suspended_reason,
      suspendedAt: s.suspended_at,
    }));
    return [...taggedVendors, ...taggedRiders, ...taggedStudents];
  }, [vendors, riders, students]);

  const filtered = useMemo(() => {
    const q = normalize(query);
    return combined.filter((a) => {
      if (roleFilter !== 'all' && a.role !== roleFilter) return false;
      if (statusFilter !== 'all' && a.accountStatus !== statusFilter) return false;
      if (q && !a.searchBlob.includes(q)) return false;
      return true;
    });
  }, [combined, query, statusFilter, roleFilter]);

  const counts = useMemo(() => ({
    total: vendors.length + riders.length + students.length,
    suspended: combined.filter((a) => a.accountStatus === 'suspended').length,
  }), [combined, vendors.length, riders.length, students.length]);

  return (
    <div className="space-y-4">
      {/* Search */}
      <div className="relative">
        <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search by name or phone..."
          className="w-full h-10 pl-9 pr-9 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs font-bold text-slate-700 dark:text-slate-200 placeholder:text-slate-400 placeholder:font-medium focus:outline-none focus:ring-2 focus:ring-blue-500/30"
        />
        {query && (
          <button
            onClick={() => setQuery('')}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {/* Role filter */}
      <div className="inline-flex items-center p-1 rounded-xl bg-slate-100 dark:bg-slate-800/60 gap-1 flex-wrap">
        {ROLE_FILTERS.map((r) => (
          <button
            key={r.key}
            onClick={() => setRoleFilter(r.key)}
            className={`px-3 h-8 rounded-lg text-[11px] font-black tracking-tight transition-all ${
              roleFilter === r.key
                ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-300'
            }`}
          >
            {r.label}
          </button>
        ))}
      </div>

      {/* Status filter */}
      <div className="flex flex-wrap gap-1.5">
        {STATUS_FILTERS.map((s) => (
          <button
            key={s.key}
            onClick={() => setStatusFilter(s.key)}
            className={`px-2.5 h-7 rounded-lg text-[10px] font-black tracking-tight transition-all border ${
              statusFilter === s.key
                ? 'bg-blue-600 border-blue-600 text-white'
                : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-400'
            }`}
          >
            {s.label}
          </button>
        ))}
      </div>

      <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">
        {filtered.length} of {counts.total} accounts
        {counts.suspended > 0 && <span className="text-rose-500"> · {counts.suspended} suspended</span>}
      </p>

      {/* Results */}
      <div className="space-y-2">
        {filtered.map((a) => (
          <AccountRow
            key={`${a.role}-${a.userId}`}
            role={a.role}
            userId={a.userId}
            name={a.name}
            subtitle={a.subtitle}
            approved={a.approved}
            accountStatus={a.accountStatus}
            suspendedReason={a.suspendedReason}
            suspendedAt={a.suspendedAt}
          />
        ))}
        {filtered.length === 0 && (
          <div className="text-center py-12">
            <p className="text-xs font-bold text-slate-400">No accounts match your filters</p>
          </div>
        )}
      </div>
    </div>
  );
}