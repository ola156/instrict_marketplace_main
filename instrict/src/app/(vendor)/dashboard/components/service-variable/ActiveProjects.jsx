'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/utils/supabase/client';
import { Briefcase, CheckCircle2, Clock, Truck } from 'lucide-react';

export default function ActiveProjects({ vendorUserId }) {
  const supabase = createClient();
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { fetchProjects(); }, []);

  const fetchProjects = async () => {
    const { data } = await supabase
      .from('quote_requests')
      .select('*')
      .eq('vendor_id', vendorUserId)
      .in('status', ['accepted', 'in_progress'])
      .order('updated_at', { ascending: false });
    setProjects(data || []);
    setLoading(false);
  };

  const advanceStatus = async (id, newStatus) => {
    await supabase
      .from('quote_requests')
      .update({ status: newStatus, updated_at: new Date().toISOString() })
      .eq('id', id);
    fetchProjects();
  };

  const deliveryLabel = {
    none: 'Digital delivery',
    one_way: 'One-way delivery',
    two_way: 'Two-way delivery',
  };

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-sm font-black tracking-tight text-slate-900 dark:text-white">Active Projects</h2>
        <p className="text-[11px] text-slate-400 mt-0.5">Accepted and in-progress work</p>
      </div>

      {loading ? (
        <div className="space-y-3">
          {[...Array(3)].map((_, i) => <div key={i} className="h-28 bg-slate-100 dark:bg-slate-800 rounded-2xl animate-pulse" />)}
        </div>
      ) : projects.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center border border-dashed border-slate-200 dark:border-slate-800 rounded-2xl">
          <Briefcase className="w-8 h-8 text-slate-300 mb-2" />
          <p className="text-xs font-black text-slate-400">No active projects</p>
          <p className="text-[11px] text-slate-300 dark:text-slate-600 mt-1">Accepted quotes will appear here</p>
        </div>
      ) : (
        <div className="space-y-3">
          {projects.map(project => (
            <div key={project.id} className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl p-4 space-y-3">
              <div className="flex items-start justify-between gap-3">
                <div className="space-y-0.5 flex-1 min-w-0">
                  <p className="text-xs font-black text-slate-900 dark:text-white truncate">{project.title}</p>
                  <p className="text-[11px] text-slate-400 line-clamp-2">{project.description}</p>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-sm font-black text-blue-600 dark:text-blue-400">
                    ₦{Number(project.quoted_price).toLocaleString()}
                  </p>
                  <p className="text-[10px] text-slate-400 mt-0.5">
                    {deliveryLabel[project.delivery_type] || 'No delivery'}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10px] font-black ${
                  project.status === 'in_progress'
                    ? 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400'
                    : 'bg-purple-500/10 text-purple-600 dark:text-purple-400'
                }`}>
                  <Clock className="w-3 h-3" />
                  {project.status === 'in_progress' ? 'In Progress' : 'Accepted'}
                </div>
                <p className="text-[10px] text-slate-400 ml-auto">
                  Updated {new Date(project.updated_at).toLocaleDateString('en-NG', { day: 'numeric', month: 'short' })}
                </p>
              </div>

              {project.status === 'accepted' && (
                <button
                  onClick={() => advanceStatus(project.id, 'in_progress')}
                  className="w-full h-9 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-[11px] font-black tracking-tight flex items-center justify-center gap-2 transition-all"
                >
                  <Truck className="w-3.5 h-3.5" /> Start Working
                </button>
              )}

              {project.status === 'in_progress' && (
                <button
                  onClick={() => advanceStatus(project.id, 'completed')}
                  className="w-full h-9 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-black tracking-tight flex items-center justify-center gap-2 transition-all"
                >
                  <CheckCircle2 className="w-3.5 h-3.5" /> Mark as Completed
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}