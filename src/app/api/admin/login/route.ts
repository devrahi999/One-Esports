import { NextRequest, NextResponse } from 'next/server';
import { SignJWT } from 'jose';

const SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || 'change-this-secret'
);

/**
 * POST /api/admin/login
 *
 * Verify admin secret key and set admin session cookie.
 * Body: { secretKey }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { secretKey } = body as { secretKey: string };

    if (!secretKey) {
      return NextResponse.json({ error: 'Secret key is required' }, { status: 400 });
    }

    const adminKey = process.env.ADMIN_SECRET_KEY || 'admin123';

    if (secretKey !== adminKey) {
      return NextResponse.json({ error: 'Invalid admin secret key' }, { status: 401 });
    }

    // Create admin JWT token (24h)
    const token = await new SignJWT({ role: 'admin' })
      .setProtectedHeader({ alg: 'HS256' })
      .setExpirationTime('24h')
      .sign(SECRET);

    const response = NextResponse.json({ success: true });
    response.cookies.set('admin_session', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 24, // 24 hours
    });

    return response;
  } catch (error) {
    console.error('Admin login error:', error);
    return NextResponse.json({ error: 'Login failed' }, { status: 500 });
  }
}
