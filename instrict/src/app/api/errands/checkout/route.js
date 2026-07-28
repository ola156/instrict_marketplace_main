import { createClient } from '@/utils/supabase/server';
import { initializeTransaction } from '@/lib/paystack';
import { NextResponse } from 'next/server';
import { randomUUID } from 'crypto';

const ERRAND_SERVICE_CHARGE_PERCENT = 3;

export async function POST(req) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

  const { errandId } = await req.json();
  if (!errandId) return NextResponse.json({ error: 'errandId is required' }, { status: 400 });

  const { data: studentProfile } = await supabase
    .from('student_profiles')
    .select('id')
    .eq('user_id', user.id)
    .maybeSingle();

  const { data: errand, error: errandErr } = await supabase
    .from('errands')
    .select('*')
    .eq('id', errandId)
    .eq('student_id', studentProfile?.id)
    .single();

  if (errandErr || !errand) return NextResponse.json({ error: 'Errand not found' }, { status: 404 });
  if (errand.is_paid) return NextResponse.json({ error: 'This errand is already paid' }, { status: 400 });

  const reward = Number(errand.reward);
  if (!Number.isFinite(reward) || reward <= 0) {
    return NextResponse.json({ error: 'Invalid errand reward amount' }, { status: 400 });
  }

  const serviceCharge = Math.round((reward * ERRAND_SERVICE_CHARGE_PERCENT) / 100);
  const total = reward + serviceCharge;

  const reference = `errand_${randomUUID()}`;

  // Stamp the reference on the errand up front so webhook/verify can
  // match back to this exact row without relying only on metadata.
  await supabase
    .from('errands')
    .update({ payment_ref: reference, service_charge: serviceCharge, total_charged: total })
    .eq('id', errandId);

  try {
    const paystackData = await initializeTransaction({
      email: user.email,
      amountKobo: total * 100,
      reference,
      metadata: { type: 'errand', errand_id: errandId, student_id: studentProfile?.id },
      callback_url: `${process.env.NEXT_PUBLIC_SITE_URL}/errands/payment-callback`,
    });

    return NextResponse.json({ authorization_url: paystackData.authorization_url, reference });
  } catch (err) {
    console.error('errand paystack initialize error:', err);
    return NextResponse.json({ error: 'Could not start payment' }, { status: 500 });
  }
}