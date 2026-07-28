import { createClient } from '@/utils/supabase/server';
import { verifyTransaction } from '@/lib/paystack';
import { notifyRidersOfNewJob } from '@/lib/notifyRiders';
import { notifyAdminsOfActivity } from '@/lib/notifyAdmins';
import { NextResponse } from 'next/server';

export async function GET(req) {
  const supabase = await createClient();
  const { searchParams } = new URL(req.url);
  const reference = searchParams.get('reference');
  if (!reference) return NextResponse.json({ success: false }, { status: 400 });

  const { data: errand } = await supabase
    .from('errands')
    .select('*')
    .eq('payment_ref', reference)
    .maybeSingle();

  if (!errand) return NextResponse.json({ success: false }, { status: 404 });

  if (errand.is_paid) {
    return NextResponse.json({ success: true, errandId: errand.id, alreadyProcessed: true });
  }

  try {
    const txn = await verifyTransaction(reference);
    const paid = txn.status === 'success' && txn.amount === Number(errand.total_charged) * 100;

    if (paid) {
      // .select() lets us tell whether THIS request actually won the
      // is_paid=false race (webhook vs this route both hitting it at
      // once) — without it, both requests would look "successful" even
      // though only one of them really flipped the row, and we'd risk
      // notifying riders twice for the same errand.
      const { data: updated } = await supabase
        .from('errands')
        .update({ is_paid: true, status: 'open' })
        .eq('id', errand.id)
        .eq('is_paid', false)
        .select();

      if (updated && updated.length > 0) {
        notifyRidersOfNewJob(supabase, {
          title: 'New errand available',
          body: 'A new errand is up for grabs — open the app to claim it.',
        }).catch((err) => console.error('[push] rider notify error:', err));

        notifyAdminsOfActivity(supabase, {
          title: 'New errand posted',
          body: 'A student just posted a new errand.',
        }).catch((err) => console.error('[push] admin notify error:', err));
      }
    }

    return NextResponse.json({ success: paid, errandId: errand.id });
  } catch (err) {
    console.error('errand verify error:', err);
    return NextResponse.json({ success: false }, { status: 500 });
  }
}