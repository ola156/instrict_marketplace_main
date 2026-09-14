'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/utils/supabase/client';
import { Image as ImageIcon, MessagesSquare } from 'lucide-react';

function StatCard({ label, value, icon: Icon, color }) {
  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl p-4 space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">{label}</span>
        <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${color}`}>
          <Icon className="w-4 h-4" />
        </div>
      </div>
      <p className="text-2xl font-black tracking-tight text-slate-900 dark:text-white">{value}</p>
    </div>
  );
}

// NOTE: assumes community_posts has author_id + author_type columns (matching
// the authorType="vendor" prop used by <CommunityFeed>). Adjust the .eq()
// calls below if your actual column names differ.
export default function VariableServiceOverview({ vendorUserId }) {
  const supabase = createClient();
  const [stats, setStats] = useState({ portfolioCount: 0, communityPostCount: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => { if (vendorUserId) fetchStats(); }, [vendorUserId]);

  const fetchStats = async () => {
    const [
      { count: portfolioCount },
      { count: communityPostCount },
    ] = await Promise.all([
      supabase.from('portfolio_items').select('*', { count: 'exact', head: true }).eq('vendor_id', vendorUserId),
      supabase.from('community_posts').select('*', { count: 'exact', head: true }).eq('author_id', vendorUserId).eq('author_type', 'vendor'),
    ]);

    setStats({
      portfolioCount: portfolioCount || 0,
      communityPostCount: communityPostCount || 0,
    });
    setLoading(false);
  };

  if (loading) {
    return (
      <div className="grid grid-cols-2 gap-4">
        {[...Array(2)].map((_, i) => <div key={i} className="h-24 bg-slate-100 dark:bg-slate-800 rounded-2xl animate-pulse" />)}
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-sm font-black tracking-tight text-slate-900 dark:text-white">Overview</h2>
        <p className="text-[11px] text-slate-400 mt-0.5">Your store at a glance</p>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <StatCard label="Portfolio Items" value={stats.portfolioCount} icon={ImageIcon} color="bg-blue-500/10 text-blue-500" />
        <StatCard label="Community Posts" value={stats.communityPostCount} icon={MessagesSquare} color="bg-indigo-500/10 text-indigo-500" />
      </div>
    </div>
  );
}