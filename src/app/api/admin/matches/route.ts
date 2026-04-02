import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/firebaseAdmin';
import type { CollectionReference, Query } from 'firebase-admin/firestore';

/**
 * GET /api/admin/matches
 *
 * Fetch all matches (optionally filtered by tournamentId or groupId).
 */
export async function GET(request: NextRequest) {
  try {
    const db = getDb();
    const { searchParams } = new URL(request.url);
    const groupId = searchParams.get('groupId');
    const tournamentId = searchParams.get('tournamentId');

    let query: Query = (db.collection('matches') as CollectionReference).orderBy('date', 'asc');

    if (groupId) {
      query = query.where('groupId', '==', groupId);
    }

    const snapshot = await query.get();
    const matches = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));

    // If tournamentId provided, also filter by tournament matchIds
    if (tournamentId) {
      const tournamentDoc = await db.collection('tournaments').doc(tournamentId).get();
      if (tournamentDoc.exists) {
        const matchIds: string[] = tournamentDoc.data()?.matchIds || [];
        return NextResponse.json({
          matches: matches.filter((m) => matchIds.includes(m.id)),
        });
      }
    }

    return NextResponse.json({ matches });
  } catch (error) {
    console.error('Fetch matches error:', error);
    return NextResponse.json({ error: 'Failed to fetch matches' }, { status: 500 });
  }
}
