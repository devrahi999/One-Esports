import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/firebaseAdmin';

/**
 * GET /api/admin/tournament
 *
 * Get tournament state for admin panel.
 */
export async function GET() {
  try {
    const db = getDb();
    const snapshot = await db.collection('tournaments').limit(1).get();

    if (snapshot.empty) {
      return NextResponse.json({ error: 'No tournament found' }, { status: 404 });
    }

    const doc = snapshot.docs[0];
    return NextResponse.json({ id: doc.id, ...doc.data() });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch tournament' }, { status: 500 });
  }
}

/**
 * DELETE /api/admin/tournament
 *
 * Delete entire tournament (cleanup as per plan).
 */
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const tournamentId = searchParams.get('tournamentId');

    if (!tournamentId) {
      return NextResponse.json({ error: 'tournamentId is required' }, { status: 400 });
    }

    const db = getDb();

    // Get tournament data
    const tournamentDoc = await db.collection('tournaments').doc(tournamentId).get();
    if (!tournamentDoc.exists) {
      return NextResponse.json({ error: 'Tournament not found' }, { status: 404 });
    }

    const data = tournamentDoc.data()!;
    const batch = db.batch();

    // Delete all matches
    for (const matchId of data.matchIds || []) {
      batch.delete(db.collection('matches').doc(matchId));
    }

    // Delete all groups
    for (const groupId of data.groupIds || []) {
      batch.delete(db.collection('groups').doc(groupId));
    }

    // Delete tournament document itself
    batch.delete(db.collection('tournaments').doc(tournamentId));

    await batch.commit();

    return NextResponse.json({ success: true, message: 'Tournament deleted' });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to delete tournament' }, { status: 500 });
  }
}
