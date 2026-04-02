import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/firebaseAdmin';

const TOURNAMENT_ID = 'primary_tournament';

/**
 * GET /api/round/[roundId]
 * Returns round config + all groups for that round
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ roundId: string }> }
) {
  try {
    const { roundId } = await params;
    const db = getDb();

    // Get tournament for roadmap config
    const tourneySnap = await db.collection('tournaments').doc(TOURNAMENT_ID).get();
    if (!tourneySnap.exists) {
      return NextResponse.json({ error: 'Tournament not found' }, { status: 404 });
    }

    const tournament = tourneySnap.data()!;
    const roadmap: any[] = tournament.roadmap || [];
    const roundConfig = roadmap.find((r: any) => r.id === roundId);

    if (!roundConfig) {
      return NextResponse.json({ error: 'Round not found in roadmap' }, { status: 404 });
    }

    // Get all groups for this round
    const groupsSnap = await db
      .collection('groups')
      .where('roundId', '==', roundId)
      .get();

    const groups = groupsSnap.docs.map((d) => ({ id: d.id, ...d.data() }));

    // For each group, get match count
    const groupsWithMatchCounts = await Promise.all(
      groups.map(async (group: any) => {
        const matchesSnap = await db
          .collection('matches')
          .where('groupId', '==', group.id)
          .get();
        const allSubmitted = matchesSnap.docs.length > 0 &&
          matchesSnap.docs.every(m => m.data().resultsSubmitted);
        return {
          ...group,
          matchCount: matchesSnap.docs.length,
          allResultsSubmitted: allSubmitted,
        };
      })
    );

    // Check if entire round is completable
    const allGroupsDone = groups.length > 0 && groupsWithMatchCounts.every(g => g.allResultsSubmitted);

    return NextResponse.json({
      round: roundConfig,
      groups: groupsWithMatchCounts,
      tournament: { id: TOURNAMENT_ID, ...tournament },
      canAdvance: allGroupsDone,
    });
  } catch (error: any) {
    console.error('GET round error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
