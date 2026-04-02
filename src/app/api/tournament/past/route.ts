import { NextResponse } from 'next/server';
import { getDb } from '@/lib/firebaseAdmin';

/**
 * GET /api/tournament/past
 * Returns all archived tournaments from `past_tournaments` collection,
 * sorted by archived date descending.
 */
export async function GET() {
  try {
    const db = getDb();
    const snap = await db.collection('past_tournaments')
      .orderBy('archivedAt', 'desc')
      .get();

    const tournaments = snap.docs.map(d => ({ id: d.id, ...d.data() }));

    return NextResponse.json({ tournaments });
  } catch (error: any) {
    console.error('Past tournaments fetch error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
