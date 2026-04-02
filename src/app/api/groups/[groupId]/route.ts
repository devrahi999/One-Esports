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

    // Build leaderboard from submitted results (with tiebreaker fields)
    const teamPointsMap: Record<string, {
      teamId: string; teamName: string;
      totalPoints: number; placementPoints: number;
      kills: number; booyahs: number; matchesPlayed: number;
    }> = {};

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
            placementPoints: 0,
            kills: 0,
            booyahs: 0,
            matchesPlayed: 0,
          };
        }
        const entry = teamPointsMap[result.teamId];
        entry.totalPoints += result.totalPoints || 0;
        entry.kills += result.kills || 0;
        // Placement points = totalPoints - kills
        const killPts = result.kills || 0;
        const placePts = (result.totalPoints || 0) - killPts;
        entry.placementPoints += placePts;
        // Count booyahs (1st place finishes)
        if (result.position === 1) entry.booyahs += 1;
        entry.matchesPlayed += 1;
      }
    }

    // Sort with full tiebreaker: total pts → booyahs → kills → placement pts
    const leaderboard = Object.values(teamPointsMap)
      .sort((a, b) => {
        if (b.totalPoints !== a.totalPoints) return b.totalPoints - a.totalPoints;
        if (b.booyahs !== a.booyahs) return b.booyahs - a.booyahs;
        if (b.kills !== a.kills) return b.kills - a.kills;
        return b.placementPoints - a.placementPoints;
      })
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
