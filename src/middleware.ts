import { NextRequest, NextResponse } from 'next/server';

// 1. In-memory sliding window rate limiter
const rateLimits = new Map<string, { count: number; resetAt: number }>();

function checkRateLimit(key: string, limit: number, windowMs: number): boolean {
  const now = Date.now();
  const entry = rateLimits.get(key);

  if (!entry || now > entry.resetAt) {
    rateLimits.set(key, { count: 1, resetAt: now + windowMs });
    return true;
  }

  if (entry.count >= limit) {
    return false;
  }

  entry.count++;
  return true;
}

// Clean up stale rate limit entries periodically (every 5 minutes)
let lastCleanup = Date.now();
function cleanupStaleLimits() {
  const now = Date.now();
  if (now - lastCleanup > 300_000) {
    lastCleanup = now;
    for (const [k, v] of rateLimits.entries()) {
      if (now > v.resetAt) {
        rateLimits.delete(k);
      }
    }
  }
}

// 2. WAF rules: malicious scanner user agents & traversal signatures
const BLOCKED_USER_AGENTS = ['sqlmap', 'nikto', 'masscan', 'zgrab', 'acunetix', 'havij'];

export function middleware(req: NextRequest) {
  cleanupStaleLimits();
  const pathname = req.nextUrl.pathname;

  // WAF Check 1: User Agent
  const userAgent = (req.headers.get('user-agent') || '').toLowerCase();
  if (BLOCKED_USER_AGENTS.some((bad) => userAgent.includes(bad))) {
    return new NextResponse('Forbidden: Malicious client signature detected', { status: 403 });
  }

  // WAF Check 2: Path Traversal or Injection attempts
  const rawUrl = req.nextUrl.toString().toLowerCase();
  if (rawUrl.includes('/..') || rawUrl.includes('%2e%2e') || rawUrl.includes('<script') || rawUrl.includes('javascript:')) {
    return new NextResponse('Forbidden: Malicious path or script pattern detected', { status: 403 });
  }

  // API Route Security
  if (pathname.startsWith('/api')) {
    const forwardedFor = req.headers.get('x-forwarded-for') || req.headers.get('cf-connecting-ip') || '127.0.0.1';
    const clientIp = forwardedFor.split(',')[0].trim();

    // Rate Limiting per route tier
    let limit = 100;
    const windowMs = 60_000; // 1 minute

    if (pathname.startsWith('/api/auth')) {
      limit = 15;
    } else if (pathname.startsWith('/api/payment-requests') || pathname.startsWith('/api/payments')) {
      limit = 40;
    } else if (pathname.startsWith('/api/agreements')) {
      limit = 60;
    }

    const rateKey = `${clientIp}:${pathname.split('/')[2] || 'root'}`;
    const allowed = checkRateLimit(rateKey, limit, windowMs);

    if (!allowed) {
      return new NextResponse(
        JSON.stringify({ error: 'RATE_LIMIT_EXCEEDED', message: 'Too many requests. Please slow down.' }),
        {
          status: 429,
          headers: {
            'Content-Type': 'application/json',
            'Retry-After': '60',
          },
        }
      );
    }

    // CSRF & Origin Verification on mutating methods (exclude webhooks which use cryptographic HMAC signatures)
    const method = req.method.toUpperCase();
    const isMutating = ['POST', 'PUT', 'DELETE', 'PATCH'].includes(method);
    const isWebhook = pathname.includes('/webhook');

    if (isMutating && !isWebhook) {
      const origin = req.headers.get('origin');
      const host = req.headers.get('host');
      if (origin && host) {
        try {
          const originHost = new URL(origin).host;
          if (originHost !== host && !originHost.startsWith('localhost') && !originHost.startsWith('127.0.0.1')) {
            return new NextResponse(
              JSON.stringify({ error: 'CSRF_BLOCKED', message: 'Cross-origin request rejected' }),
              { status: 403, headers: { 'Content-Type': 'application/json' } }
            );
          }
        } catch {
          return new NextResponse(
            JSON.stringify({ error: 'INVALID_ORIGIN', message: 'Invalid origin header' }),
            { status: 400, headers: { 'Content-Type': 'application/json' } }
          );
        }
      }
    }
  }

  const res = NextResponse.next();
  // Inject trace request ID
  res.headers.set('x-payshark-trace-id', crypto.randomUUID());
  return res;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
};
