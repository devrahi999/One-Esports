import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/firebaseAdmin';
import { calculateTotalPoints } from '@/lib/points';

interface ResultEntry {
  teamId: string;
  kills: number;
  position: number;
}

/**
 * POST /api/admin/results
 *
 * Submit results for a match (multiple teams at once).
 * Body: { matchId, results: [{ teamId, kills, position }] }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { matchId, results }: { matchId: string; results: ResultEntry[] } = body;

    if (!matchId || !Array.isArray(results) || results.length === 0) {
      return NextResponse.json(
        { error: 'matchId and results array are required' },
        { status: 400 }
      );
    }

    const db = getDb();

    // Calculate points
    const scoredResults = results.map((r) => ({
      teamId: r.teamId,
      kills: r.kills,
      position: r.position,
      totalPoints: calculateTotalPoints(r.position, r.kills),
    }));

    await db.collection('matches').doc(matchId).update({
      results: scoredResults,
      resultsSubmitted: true,
    });

    return NextResponse.json({ success: true, results: scoredResults });
  } catch (error) {
    console.error('Submit results error:', error);
    return NextResponse.json({ error: 'Failed to submit results' }, { status: 500 });
  }
}
