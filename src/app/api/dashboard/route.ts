import { NextRequest, NextResponse } from 'next/server';
import { getSessionFromRequest } from '@/lib/auth';
import { getDb } from '@/lib/firebaseAdmin';

const QUALIFY_TOP_N = parseInt(process.env.QUALIFY_TOP_N || '3');

/**
 * GET /api/dashboard
 *
 * Returns dashboard data for logged-in team leader:
 * - Team info
 * - Group info + all teams in group
 * - Matches for their group
 * - Leaderboard with qualification status
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getSessionFromRequest(request);

    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const db = getDb();
    const teamDoc = await db.collection('teams').doc(session.teamId).get();

    if (!teamDoc.exists) {
      return NextResponse.json({ error: 'Team not found' }, { status: 404 });
    }

    const team = teamDoc.data()!;

    // Get group
    let group = null;
    let groupTeams: any[] = [];
    const groupTeamMap: Record<string, string> = {}; // teamId → teamName

    if (team.groupId) {
      const groupDoc = await db.collection('groups').doc(team.groupId).get();
      if (groupDoc.exists) {
        group = { id: groupDoc.id, ...groupDoc.data() };

        // Fetch all teams in this group
        const teamIds: string[] = (group as any).teamIds || [];
        const teamDocs = await Promise.all(
          teamIds.map((tid: string) => db.collection('teams').doc(tid).get())
        );

        groupTeams = teamDocs
          .filter((d) => d.exists)
          .map((d) => ({ id: d.id, ...d.data() }));

        // Build map for leaderboard name lookup
        groupTeams.forEach((t) => {
          groupTeamMap[t.id] = t.teamName;
        });
      }
    }


    // Get matches for this group and sort in JS to avoid requiring composite indexes
    const matchesSnapshot = await db
      .collection('matches')
      .where('groupId', '==', team.groupId || '')
      .get();

    const matches = matchesSnapshot.docs
      .map((d) => ({ id: d.id, ...d.data() }))
      .sort((a: any, b: any) => {
        // Safe string comparison for dates
        return (a.date || '').localeCompare(b.date || '');
      });

    // Build leaderboard from completed matches
    const leaderboardMap: Record<
      string,
      { teamId: string; teamName: string; totalPoints: number; kills: number; matchesPlayed: number }
    > = {};

    for (const match of matches) {
      const m = match as any;
      if (!m.resultsSubmitted) continue;

      for (const result of m.results || []) {
        const tid = result.teamId;
        if (!leaderboardMap[tid]) {
          leaderboardMap[tid] = {
            teamId: tid,
            teamName: groupTeamMap[tid] || 'Unknown',
            totalPoints: 0,
            kills: 0,
            matchesPlayed: 0,
          };
        }
        leaderboardMap[tid].totalPoints += result.totalPoints || 0;
        leaderboardMap[tid].kills += result.kills || 0;
        leaderboardMap[tid].matchesPlayed += 1;
      }
    }

    // Sort leaderboard and mark qualified teams
    const leaderboard = Object.values(leaderboardMap).sort(
      (a, b) => b.totalPoints - a.totalPoints || b.kills - a.kills
    );

    const leaderboardWithQualify = leaderboard.map((entry, index) => ({
      ...entry,
      qualified: index < QUALIFY_TOP_N,
    }));

    return NextResponse.json({
      team: { id: session.teamId, ...team },
      group,
      groupTeams,
      matches,
      leaderboard: leaderboardWithQualify,
      currentRound: (group as any)?.roundId || null,
      currentRoundName: (group as any)?.roundName || null,
    });
  } catch (error) {
    console.error('Dashboard error:', error);
    return NextResponse.json({ error: 'Failed to load dashboard' }, { status: 500 });
  }
}

