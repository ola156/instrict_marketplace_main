import { updateSession } from '@/utils/supabase/middleware';
import { NextResponse } from 'next/server';
import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL,
  token: process.env.UPSTASH_REDIS_REST_TOKEN,
});

// Only rate-limit real backend actions, never page views
const generalLimiter = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(120, '1 m'), // generous — this is now a safety net, not a gate
  prefix: 'rl:general',
});

// Only your OWN API routes that do real mutations (not Supabase's own
// endpoints — those are rate-limited by Supabase already)
const RATE_LIMITED_PREFIXES = ['/api/'];

function getIp(request) {
  return (
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    request.headers.get('x-real-ip') ||
    '127.0.0.1'
  );
}

export async function middleware(request) {
  const { pathname } = request.nextUrl;

  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/favicon') ||
    pathname.match(/\.(svg|png|jpg|jpeg|gif|webp|ico|css|js)$/)
  ) {
    return await updateSession(request);
  }

  const needsLimit = RATE_LIMITED_PREFIXES.some(p => pathname.startsWith(p));

  if (needsLimit) {
    const ip = getIp(request);
    const identifier = `${ip}:${pathname}`;
    const { success } = await generalLimiter.limit(identifier);

    if (!success) {
      return NextResponse.json(
        { error: 'Too many requests. Please slow down and try again.' },
        { status: 429 }
      );
    }
  }

  // Page routes (including all /auth/* pages) just get session refresh — no rate limiting
  return await updateSession(request);
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};