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

// Anyone, logged in or not, can view these. Prefix-matched — '/auth'
// covers /auth/student, /auth/vendor, /auth/rider, and anything nested
// under them (reset password, callback pages, etc). Add any other
// public page (marketing, terms, privacy) here explicitly.
//
// DEFAULT-DENY: anything NOT listed here or in PORTAL_ROUTES below gets
// redirected to '/' for an unauthenticated visitor. That's deliberate —
// a page you forgot to list here shows up immediately as "why does this
// redirect", which is a loud, obvious bug. The alternative (default-allow)
// means a forgotten page stays silently exposed to the world, which is a
// much worse failure mode to have.
const PUBLIC_PATHS = ['/', '/auth'];

// Maps a path prefix to the login page an unauthenticated visitor gets
// bounced to. Order matters only in that more specific prefixes should
// come first if any ever overlap — none do currently.
const PORTAL_ROUTES = [
  { prefix: '/home', login: '/auth/student' },
  { prefix: '/community', login: '/auth/student' },
  { prefix: '/orders', login: '/auth/student' },
  { prefix: '/errands', login: '/auth/student' },
  { prefix: '/profile', login: '/auth/student' },
  { prefix: '/checkout', login: '/auth/student' },
  { prefix: '/store', login: '/auth/student' },
  { prefix: '/vendors', login: '/auth/student' },
  { prefix: '/dashboard', login: '/auth/vendor' },
  { prefix: '/onboarding/vendor', login: '/auth/vendor' },
  { prefix: '/runner', login: '/auth/rider' },
  { prefix: '/jobs', login: '/auth/rider' },
];

function isPublicPath(pathname) {
  return PUBLIC_PATHS.some((p) => pathname === p || pathname.startsWith(p + '/'));
}

function matchPortalLogin(pathname) {
  const match = PORTAL_ROUTES.find(
    (r) => pathname === r.prefix || pathname.startsWith(r.prefix + '/')
  );
  return match?.login;
}

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
    const { response } = await updateSession(request);
    return response;
  }

  const isApiRoute = pathname.startsWith('/api/');

  if (isApiRoute) {
    const needsLimit = RATE_LIMITED_PREFIXES.some((p) => pathname.startsWith(p));
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
    // API routes handle their own auth (supabase.auth.getUser() inside the
    // route) and expect JSON responses, not redirects — the gate below is
    // for page routes only.
    const { response } = await updateSession(request);
    return response;
  }

  const { response, user } = await updateSession(request);

  if (!user && !isPublicPath(pathname)) {
    const loginPath = matchPortalLogin(pathname) || '/';
    const redirectUrl = new URL(loginPath, request.url);
    const redirectResponse = NextResponse.redirect(redirectUrl);
    // Carry over any cookie updates updateSession made (e.g. an expired
    // session getting cleared) onto the redirect response — otherwise a
    // stale cookie could stick around and cause a redirect loop.
    response.cookies.getAll().forEach((cookie) => {
      redirectResponse.cookies.set(cookie.name, cookie.value, cookie);
    });
    return redirectResponse;
  }

  return response;
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};