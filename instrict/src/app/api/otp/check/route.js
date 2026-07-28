// app/api/otp/check/route.js
import { otpLimiter } from '@/utils/ratelimit';
import { NextResponse } from 'next/server';

// TODO(remove-before-launch): dev-only bypass for OTP rate limiting during
// testing. Set back to false (or delete this flag and the branch below)
// once OTP delivery is confirmed stable and you're done testing.
const RATE_LIMIT_DISABLED = true;

export async function POST(request) {
  try {
    const { phone } = await request.json();

    if (!phone) {
      return NextResponse.json({ error: 'Phone number required.' }, { status: 400 });
    }

    if (RATE_LIMIT_DISABLED) {
      return NextResponse.json({ ok: true });
    }

    // Rate limit by phone number, not IP — prevents someone cycling IPs
    // to spam OTPs to a victim's number
    const { success, reset } = await otpLimiter.limit(`otp:${phone}`);

    if (!success) {
      const retryAfterSeconds = Math.ceil((reset - Date.now()) / 1000);
      const retryAfterMinutes = Math.ceil(retryAfterSeconds / 60);
      return NextResponse.json(
        {
          error: `Too many verification attempts. Please try again in ${retryAfterMinutes} minute${retryAfterMinutes > 1 ? 's' : ''}.`,
          retryAfter: retryAfterSeconds,
        },
        { status: 429 }
      );
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('OTP check error:', err);
    return NextResponse.json({ error: 'Server error.' }, { status: 500 });
  }
}