import { createClient } from '@/utils/supabase/server';
import { notifyRidersOfNewJob } from '@/lib/notifyRiders';
import { NextResponse } from 'next/server';

// Orders: a rider only ever gets assigned once the order is 'ready'
// (vendor-side states aren't reachable here), and can cancel any time
// up until they mark it picked up — after that the goods are physically
// with them, so it needs support, not a self-serve release.
//
// Errands: there's no separate "picked up" step — 'claimed' is the only
// state before completion — so cancel is allowed any time before the
// dropoff code is confirmed.
const RELEASABLE = {
  order: { table: 'orders', statusColumn: 'status', from: ['ready'], resetStatusTo: 'ready' },
  errand: { table: 'errands', statusColumn: 'status', from: ['claimed'], resetStatusTo: 'open' },
};

export async function POST(req) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

  const { kind, id } = await req.json();
  const config = RELEASABLE[kind];
  if (!config || !id) {
    return NextResponse.json({ error: 'kind (order|errand) and id are required' }, { status: 400 });
  }

  const { data: job, error: fetchError } = await supabase
    .from(config.table)
    .select(`id, rider_id, ${config.statusColumn}`)
    .eq('id', id)
    .single();

  if (fetchError || !job) {
    return NextResponse.json({ error: 'Job not found' }, { status: 404 });
  }
  if (job.rider_id !== user.id) {
    return NextResponse.json({ error: 'Not your job' }, { status: 403 });
  }
  if (!config.from.includes(job[config.statusColumn])) {
    return NextResponse.json(
      { error: `Cannot cancel a ${kind} that is already ${job[config.statusColumn]}` },
      { status: 409 }
    );
  }

  const updatePayload = { rider_id: null, [config.statusColumn]: config.resetStatusTo };
  if (kind === 'errand') updatePayload.claimed_at = null;

  const { error: updateError } = await supabase
    .from(config.table)
    .update(updatePayload)
    .eq('id', id)
    .eq('rider_id', user.id);

  if (updateError) {
    console.error('Failed to release job:', updateError.message);
    return NextResponse.json({ error: 'Could not cancel this job' }, { status: 500 });
  }

  notifyRidersOfNewJob(supabase, {
    title: 'Job back in the pool',
    body: kind === 'order'
      ? 'A delivery just became available again — open the app to claim it.'
      : 'An errand just became available again — open the app to claim it.',
  }).catch((err) => console.error('[push] rider notify error:', err));

  return NextResponse.json({ success: true });
}