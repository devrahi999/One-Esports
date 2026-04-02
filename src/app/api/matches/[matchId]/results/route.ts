import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/firebaseAdmin';
import { calculateTotalPoints } from '@/lib/points';

interface ResultEntry {
  teamId: string;
  kills: number;
  position: number;
}

/**
 * POST /api/matches/[matchId]/results
 *
 * Submit or update results for a match (all teams at once).
 * Body: { results: [{ teamId, kills, position }] }
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ matchId: string }> }
) {
  try {
    const { matchId } = await params;
    const body = await request.json();
    const { results }: { results: ResultEntry[] } = body;

    if (!Array.isArray(results) || results.length === 0) {
      return NextResponse.json(
        { error: 'results array with at least one entry is required' },
        { status: 400 }
      );
    }

    // Validate each result entry
    for (const r of results) {
      if (!r.teamId || r.kills === undefined || r.position === undefined) {
        return NextResponse.json(
          { error: 'Each result must have teamId, kills, and position' },
          { status: 400 }
        );
      }
    }

    // Calculate points using official Free Fire system
    const scoredResults = results.map((r) => ({
      teamId: r.teamId,
      kills: r.kills,
      position: r.position,
      totalPoints: calculateTotalPoints(r.position, r.kills),
    }));

    const db = getDb();

    const matchDoc = await db.collection('matches').doc(matchId).get();
    if (!matchDoc.exists) {
      return NextResponse.json({ error: 'Match not found' }, { status: 404 });
    }

    await db.collection('matches').doc(matchId).update({
      results: scoredResults,
      resultsSubmitted: true,
      submittedAt: new Date().toISOString(),
    });

    // Check if all matches in the same group are now submitted → mark group completed
    const matchData = matchDoc.data()!;
    if (matchData.groupId) {
      const allGroupMatches = await db
        .collection('matches')
        .where('groupId', '==', matchData.groupId)
        .get();

      const allDone = allGroupMatches.docs.every((m) => {
        if (m.id === matchId) return true; // just submitted
        return m.data().resultsSubmitted === true;
      });

      if (allDone) {
        await db.collection('groups').doc(matchData.groupId).update({
          status: 'completed',
          completedAt: new Date().toISOString(),
        });
      }
    }

    return NextResponse.json({
      success: true,
      results: scoredResults,
      totalTeams: scoredResults.length,
    });
  } catch (error) {
    console.error('Submit results error:', error);
    return NextResponse.json({ error: 'Failed to submit results' }, { status: 500 });
  }
}

/**
 * GET /api/matches/[matchId]/results
 *
 * Get results for a specific match.
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ matchId: string }> }
) {
  try {
    const { matchId } = await params;
    const db = getDb();
    const matchDoc = await db.collection('matches').doc(matchId).get();

    if (!matchDoc.exists) {
      return NextResponse.json({ error: 'Match not found' }, { status: 404 });
    }

    const match = matchDoc.data()!;
    return NextResponse.json({
      matchId,
      results: match.results || [],
      resultsSubmitted: match.resultsSubmitted || false,
    });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch results' }, { status: 500 });
  }
}
