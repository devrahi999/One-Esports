import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/firebaseAdmin';

interface GroupDoc {
  id: string;
  name: string;
  teamIds: string[];
  tournamentId?: string;
  [key: string]: unknown;
}

/**
 * GET /api/admin/groups
 *
 * Fetch all groups (optionally filtered by tournamentId).
 * Returns groups with team count.
 */
export async function GET(request: NextRequest) {
  try {
    const db = getDb();
    const { searchParams } = new URL(request.url);
    const tournamentId = searchParams.get('tournamentId');

    let groupIds: string[] | null = null;

    // If tournamentId, get groups only for this tournament
    if (tournamentId) {
      const tournamentDoc = await db.collection('tournaments').doc(tournamentId).get();
      if (tournamentDoc.exists) {
        groupIds = tournamentDoc.data()?.groupIds || [];
      }
    }

    const snapshot = await db.collection('groups').get();
    let groups: GroupDoc[] = snapshot.docs.map((d) => ({
      id: d.id,
      name: d.data().name || '',
      teamIds: d.data().teamIds || [],
      ...d.data(),
    }));

    if (groupIds !== null) {
      groups = groups.filter((g) => (groupIds as string[]).includes(g.id));
    }

    return NextResponse.json({ groups });
  } catch (error) {
    console.error('Fetch groups error:', error);
    return NextResponse.json({ error: 'Failed to fetch groups' }, { status: 500 });
  }
}
