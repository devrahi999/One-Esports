import { NextRequest, NextResponse } from 'next/server';
import { jwtVerify } from 'jose';

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || 'change-this-secret'
);

const ADMIN_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || 'change-this-secret'
);

// Public routes — authentication লাগবে না
const PUBLIC_PATHS = [
  '/',
  '/admin/login',
  '/api/login',
  '/api/admin/login',
  '/api/google-webhook',
  '/api/sync-registration',
  '/api/tournament',
];

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl.clone();

  // Static assets skip
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/favicon.ico') ||
    pathname.includes('.')
  ) {
    return NextResponse.next();
  }

  // Public routes skip
  if (PUBLIC_PATHS.some((p) => pathname === p || pathname.startsWith(p + '/'))) {
    return NextResponse.next();
  }

  // ---- Admin routes protect ----
  if (pathname.startsWith('/admin') || pathname.startsWith('/api/admin')) {
    const adminToken = req.cookies.get('admin_session')?.value;
    if (!adminToken) {
      if (pathname.startsWith('/api/')) {
        return NextResponse.json({ error: 'Admin unauthorized' }, { status: 401 });
      }
      return NextResponse.redirect(new URL('/admin/login', req.url));
    }
    try {
      await jwtVerify(adminToken, ADMIN_SECRET);
      return NextResponse.next();
    } catch {
      const res = pathname.startsWith('/api/')
        ? NextResponse.json({ error: 'Admin session expired' }, { status: 401 })
        : NextResponse.redirect(new URL('/admin/login', req.url));
      res.cookies.delete('admin_session');
      return res;
    }
  }

  // ---- Team leader routes protect ----
  if (pathname.startsWith('/dashboard') || pathname.startsWith('/api/dashboard')) {
    const token = req.cookies.get('tournament_session')?.value;
    if (!token) {
      if (pathname.startsWith('/api/')) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }
      return NextResponse.redirect(new URL('/', req.url));
    }
    try {
      await jwtVerify(token, JWT_SECRET);
      return NextResponse.next();
    } catch {
      const res = pathname.startsWith('/api/')
        ? NextResponse.json({ error: 'Session expired' }, { status: 401 })
        : NextResponse.redirect(new URL('/', req.url));
      res.cookies.delete('tournament_session');
      return res;
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/dashboard/:path*',
    '/admin/:path*',
    '/api/:path*',
  ],
};
