// middleware.js (replace your existing one)
import { updateSession } from '@/utils/supabase/middleware';
import { NextResponse } from 'next/server';
import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL,
  token: process.env.UPSTASH_REDIS_REST_TOKEN,
});

// Auth-specific routes get stricter limiting
const authLimiter = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(5, '10 m'),
  prefix: 'rl:auth',
});

// General limiter for everything else
const generalLimiter = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(60, '1 m'),
  prefix: 'rl:general',
});

// Routes that count as auth actions
const AUTH_ROUTES = [
  '/auth/vendor',
  '/auth/student',
  '/auth/rider',
  '/auth/callback',
  '/auth/reset-password',
];

function getIp(request) {
  return (
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    request.headers.get('x-real-ip') ||
    '127.0.0.1'
  );
}

export async function middleware(request) {
  const { pathname } = request.nextUrl;
  const ip = getIp(request);

  // Skip rate limiting for static assets
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/favicon') ||
    pathname.match(/\.(svg|png|jpg|jpeg|gif|webp|ico|css|js)$/)
  ) {
    return await updateSession(request);
  }

  // Apply stricter auth limiter on auth routes
  const isAuthRoute = AUTH_ROUTES.some(route => pathname.startsWith(route));
  const limiter = isAuthRoute ? authLimiter : generalLimiter;
  const identifier = `${ip}:${pathname}`;

  const { success, limit, remaining, reset } = await limiter.limit(identifier);

  if (!success) {
    // Return JSON for API routes, HTML for page routes
    if (pathname.startsWith('/api/')) {
      return NextResponse.json(
        { error: 'Too many requests. Please slow down and try again.' },
        {
          status: 429,
          headers: {
            'X-RateLimit-Limit': String(limit),
            'X-RateLimit-Remaining': String(remaining),
            'X-RateLimit-Reset': String(reset),
            'Retry-After': String(Math.ceil((reset - Date.now()) / 1000)),
          },
        }
      );
    }

    // For page routes, redirect to a rate-limit error page
    return NextResponse.redirect(new URL('/too-many-requests', request.url));
  }

  // Not rate limited — continue with session refresh
  return await updateSession(request);
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};