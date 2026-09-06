import { createAdminClient } from '@/lib/supabase-admin';
import { createOrderFromMetadata } from '@/lib/create-order-from-metadata';
import { NextResponse } from 'next/server';
import crypto from 'crypto';
import * as Sentry from '@sentry/nextjs';

export async function POST(req) {
  try {
    const rawBody = await req.text();
    const signature = req.headers.get('x-paystack-signature');

    const expected = crypto
      .createHmac('sha512', process.env.PAYSTACK_SECRET_KEY)
      .update(rawBody)
      .digest('hex');

    if (signature !== expected) {
      Sentry.captureMessage('Paystack webhook signature mismatch', {
        level: 'warning',
        tags: { flow: 'paystack-webhook' },
      });
      return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
    }

    const event = JSON.parse(rawBody);
    const supabase = createAdminClient();

    if (event.event === 'charge.success') {
      const { reference, amount, metadata } = event.data;

      if (metadata?.type === 'errand') {
        const { data: errand } = await supabase
          .from('errands')
          .select('*')
          .eq('payment_ref', reference)
          .maybeSingle();

        if (errand && !errand.is_paid && amount === Number(errand.total_charged) * 100) {
          await supabase
            .from('errands')
            .update({ is_paid: true, status: 'open' })
            .eq('id', errand.id);
        } else if (errand) {
          console.error('errand webhook amount mismatch:', { amount, expected: errand.total_charged * 100, reference });
          Sentry.captureMessage('Errand webhook amount mismatch', {
            level: 'error',
            tags: { flow: 'paystack-webhook', order_type: 'errand' },
            extra: { amount, expected: errand.total_charged * 100, reference },
          });
        }
      } else {
        // Regular order flow — unchanged from before.
        if (amount === metadata.total * 100) {
          try {
            await createOrderFromMetadata(supabase, reference, metadata);
          } catch (err) {
            console.error('webhook order creation error:', err);
            Sentry.captureException(err, {
              tags: { flow: 'paystack-webhook', step: 'create-order' },
              extra: { reference, metadata },
            });
          }
        } else {
          console.error('webhook amount mismatch:', { amount, expected: metadata.total * 100, reference });
          Sentry.captureMessage('Order webhook amount mismatch', {
            level: 'error',
            tags: { flow: 'paystack-webhook', order_type: 'standard' },
            extra: { amount, expected: metadata.total * 100, reference },
          });
        }
      }
    }

    return NextResponse.json({ received: true });
  } catch (err) {
    console.error('paystack webhook unhandled error:', err);
    Sentry.captureException(err, {
      tags: { flow: 'paystack-webhook', step: 'unhandled' },
    });
    return NextResponse.json({ error: 'Webhook processing failed' }, { status: 500 });
  }
}