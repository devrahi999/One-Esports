import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/firebaseAdmin';

/**
 * GET /api/groups/[groupId]
 * Returns full group details: teams, matches, results
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ groupId: string }> }
) {
  try {
    const { groupId } = await params;
    const db = getDb();

    const groupSnap = await db.collection('groups').doc(groupId).get();
    if (!groupSnap.exists) {
      return NextResponse.json({ error: 'Group not found' }, { status: 404 });
    }

    const group = { id: groupSnap.id, ...groupSnap.data() } as any;

    // Get teams in group
    const teamDocs = await Promise.all(
      (group.teamIds || []).map((tid: string) =>
        db.collection('teams').doc(tid).get()
      )
    );
    const teams = teamDocs
      .filter((d) => d.exists)
      .map((d) => ({ id: d.id, ...d.data() }));

    // Get matches for this group
    const matchesSnap = await db
      .collection('matches')
      .where('groupId', '==', groupId)
      .get();
    const matches = matchesSnap.docs.map((d) => ({ id: d.id, ...d.data() }));

    // Build leaderboard from submitted results
    const teamPointsMap: Record<string, { teamId: string; teamName: string; totalPoints: number; kills: number; matchesPlayed: number }> = {};

    for (const match of matches) {
      const m = match as any;
      if (!m.resultsSubmitted) continue;
      for (const result of m.results || []) {
        const team = teams.find((t: any) => t.id === result.teamId) as any;
        if (!teamPointsMap[result.teamId]) {
          teamPointsMap[result.teamId] = {
            teamId: result.teamId,
            teamName: team?.teamName || result.teamId,
            totalPoints: 0,
            kills: 0,
            matchesPlayed: 0,
          };
        }
        teamPointsMap[result.teamId].totalPoints += result.totalPoints || 0;
        teamPointsMap[result.teamId].kills += result.kills || 0;
        teamPointsMap[result.teamId].matchesPlayed += 1;
      }
    }

    const leaderboard = Object.values(teamPointsMap)
      .sort((a, b) => b.totalPoints - a.totalPoints || b.kills - a.kills)
      .map((entry, idx) => ({
        ...entry,
        qualified: idx < (group.qualifyCount || 0),
      }));

    return NextResponse.json({ group, teams, matches, leaderboard });
  } catch (error: any) {
    console.error('GET group error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

/**
 * PUT /api/groups/[groupId]
 * Update group match settings (date, time, map, matchCount, roomId, passcode, isResultPublished)
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ groupId: string }> }
) {
  try {
    const { groupId } = await params;
    const body = await request.json();
    const db = getDb();

    // Start a batch or standard updates
    await db.collection('groups').doc(groupId).update({
      ...body,
      updatedAt: new Date().toISOString(),
    });

    // If matchCount is provided, ensure we have that many match documents for result entry
    if (body.matchCount && typeof body.matchCount === 'number') {
      const dbMatchesSnap = await db.collection('matches').where('groupId', '==', groupId).get();
      const currentCount = dbMatchesSnap.size;

      if (currentCount < body.matchCount) {
        const batch = db.batch();
        for (let i = currentCount + 1; i <= body.matchCount; i++) {
          const matchRef = db.collection('matches').doc();
          batch.set(matchRef, {
            groupId: groupId,
            round: i,
            roundLabel: `Match ${i}`,
            resultsSubmitted: false,
            results: [],
            createdAt: new Date().toISOString()
          });
        }
        await batch.commit();
      }
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
