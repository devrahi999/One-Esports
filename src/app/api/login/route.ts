import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/firebaseAdmin';
import { createSession } from '@/lib/auth';
import { z } from 'zod';

const loginSchema = z.object({
  uid: z.string().min(1, 'UID is required'),
  email: z.string().email('Invalid email'),
});

/**
 * POST /api/login
 *
 * Verify team leader UID + email, create session cookie, redirect to dashboard.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = loginSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.errors[0].message }, { status: 400 });
    }

    const { uid, email } = parsed.data;
    const db = getDb();

    const teamDoc = await db.collection('teams').doc(uid).get();
    if (!teamDoc.exists) {
      return NextResponse.json({ error: 'UID not found in database' }, { status: 401 });
    }

    const team = teamDoc.data()!;

    if (team.email !== email) {
      return NextResponse.json({ error: 'Email does not match UID' }, { status: 401 });
    }

    await createSession({ uid, teamId: uid });

    return NextResponse.json({
      success: true,
      teamName: team.teamName,
      groupId: team.groupId,
    });
  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json({ error: 'Login failed' }, { status: 500 });
  }
}
