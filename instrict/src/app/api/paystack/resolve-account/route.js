// /api/paystack/resolve-account/route.js
import { createClient } from '@/utils/supabase/server';
import { NextResponse } from 'next/server';

export async function POST(req) {
  // Require a logged-in vendor — this endpoint burns Paystack API calls,
  // don't leave it open to anonymous use.
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

  const { account_number, bank_code } = await req.json();

  if (!account_number || !/^\d{10}$/.test(account_number)) {
    return NextResponse.json({ error: 'Enter a valid 10-digit account number' }, { status: 400 });
  }
  if (!bank_code) {
    return NextResponse.json({ error: 'Select a bank' }, { status: 400 });
  }

  try {
    const res = await fetch(
      `https://api.paystack.co/bank/resolve?account_number=${encodeURIComponent(account_number)}&bank_code=${encodeURIComponent(bank_code)}`,
      { headers: { Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}` } }
    );
    const data = await res.json();

    if (!data.status || !data.data?.account_name) {
      return NextResponse.json(
        { error: data.message || "Couldn't verify this account" },
        { status: 400 }
      );
    }

    return NextResponse.json({ account_name: data.data.account_name });
  } catch (err) {
    console.error('paystack resolve-account error:', err);
    return NextResponse.json({ error: 'Verification failed — try again' }, { status: 500 });
  }
}