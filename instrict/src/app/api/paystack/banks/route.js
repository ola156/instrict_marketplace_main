// /api/paystack/banks/route.js
import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const res = await fetch('https://api.paystack.co/bank?country=nigeria&currency=NGN', {
      headers: { Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}` },
      // Bank list barely changes — safe to cache for a while server-side.
      next: { revalidate: 60 * 60 * 24 },
    });
    const data = await res.json();

    if (!data.status) {
      console.error('paystack banks error:', data.message);
      return NextResponse.json({ error: 'Could not load banks' }, { status: 502 });
    }

    const banks = (data.data || [])
      .filter((b) => b.code && b.name)
      .map((b) => ({ code: b.code, name: b.name }))
      .sort((a, b) => a.name.localeCompare(b.name));

    return NextResponse.json({ banks });
  } catch (err) {
    console.error('paystack banks fetch error:', err);
    return NextResponse.json({ error: 'Could not load banks' }, { status: 500 });
  }
}