import { SignJWT, jwtVerify } from 'jose';
import { cookies } from 'next/headers';
import { NextRequest } from 'next/server';

const SECRET = new TextEncoder().encode(process.env.JWT_SECRET || 'change-this-secret');

export async function createSession(payload: { uid: string; teamId: string }) {
  const token = await new SignJWT({ ...payload })
    .setProtectedHeader({ alg: 'HS256' })
    .setExpirationTime('12h')
    .sign(SECRET);

  const cookieStore = await cookies();
  cookieStore.set('tournament_session', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 12,
  });

  return token;
}

export async function verifySession(): Promise<{ uid: string; teamId: string } | null> {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('tournament_session')?.value;
    if (!token) return null;
    const { payload } = await jwtVerify(token, SECRET);
    return { uid: payload.uid as string, teamId: payload.teamId as string };
  } catch {
    return null;
  }
}

export async function clearSession() {
  const cookieStore = await cookies();
  cookieStore.delete('tournament_session');
}

export async function getSessionFromRequest(
  req: NextRequest
): Promise<{ uid: string; teamId: string } | null> {
  try {
    const token = req.cookies.get('tournament_session')?.value;
    if (!token) return null;
    const { payload } = await jwtVerify(token, SECRET);
    return { uid: payload.uid as string, teamId: payload.teamId as string };
  } catch {
    return null;
  }
}
