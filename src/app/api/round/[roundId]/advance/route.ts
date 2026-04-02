import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/firebaseAdmin';

const TOURNAMENT_ID = 'primary_tournament';
const GROUP_LETTERS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';

/**
 * POST /api/round/[roundId]/advance
 * After all groups in this round submit results:
 * - Collects top N teams from each group (by total points across all matches)
 * - Creates new groups for next round
 * - Updates tournament roadmap status
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ roundId: string }> }
) {
  try {
    const { roundId } = await params;
    const db = getDb();

    // Get tournament
    const tourneyRef = db.collection('tournaments').doc(TOURNAMENT_ID);
    const tourneySnap = await tourneyRef.get();
    if (!tourneySnap.exists) throw new Error('Tournament not found');

    const tournament = tourneySnap.data()!;
    const roadmap: any[] = tournament.roadmap || [];

    const currentRoundIdx = roadmap.findIndex((r: any) => r.id === roundId);
    if (currentRoundIdx === -1) throw new Error('Round not found in roadmap');

    const nextRound = roadmap[currentRoundIdx + 1];
    if (!nextRound) throw new Error('No next round. Tournament is complete.');

    // Get all groups for current round
    const groupsSnap = await db
      .collection('groups')
      .where('roundId', '==', roundId)
      .get();

    const groups = groupsSnap.docs.map((d) => ({ id: d.id, ...d.data() }));

    // Verify all groups have results submitted
    for (const group of groups) {
      const g = group as any;
      const matchesSnap = await db
        .collection('matches')
        .where('groupId', '==', g.id)
        .get();

      if (matchesSnap.docs.length === 0) {
        throw new Error(`Group "${g.name}" has no matches. Add matches before advancing.`);
      }
      const allSubmitted = matchesSnap.docs.every((m) => m.data().resultsSubmitted);
      if (!allSubmitted) {
        throw new Error(`Group "${g.name}" still has pending match results.`);
      }
    }

    // Collect qualified teams from each group
    const qualifiedTeamIds: string[] = [];

    for (const group of groups) {
      const g = group as any;
      const qualifyCount: number = g.qualifyCount || nextRound.qualifyPerGroup || 3;

      // Accumulate points across all matches in this group
      const matchesSnap = await db
        .collection('matches')
        .where('groupId', '==', g.id)
        .get();

      const teamPoints: Record<string, { teamId: string; totalPoints: number; kills: number }> = {};

      for (const matchDoc of matchesSnap.docs) {
        const match = matchDoc.data();
        for (const result of match.results || []) {
          if (!teamPoints[result.teamId]) {
            teamPoints[result.teamId] = { teamId: result.teamId, totalPoints: 0, kills: 0 };
          }
          teamPoints[result.teamId].totalPoints += result.totalPoints || 0;
          teamPoints[result.teamId].kills += result.kills || 0;
        }
      }

      // Sort by points then kills, take top N
      const sorted = Object.values(teamPoints).sort(
        (a, b) => b.totalPoints - a.totalPoints || b.kills - a.kills
      );
      const topTeams = sorted.slice(0, qualifyCount).map((t) => t.teamId);
      qualifiedTeamIds.push(...topTeams);
    }

    // Create groups for next round
    const teamsPerGroup = tournament.teamsPerGroup || 12;

    // Shuffle qualified teams randomly
    const shuffled = [...qualifiedTeamIds].sort(() => Math.random() - 0.5);
    const totalGroups = Math.ceil(shuffled.length / teamsPerGroup);

    const batch = db.batch();
    const newGroupIds: string[] = [];

    for (let i = 0; i < totalGroups; i++) {
      const groupTeams = shuffled.slice(i * teamsPerGroup, (i + 1) * teamsPerGroup);
      const groupRef = db.collection('groups').doc();
      newGroupIds.push(groupRef.id);

      batch.set(groupRef, {
        name: `Group ${GROUP_LETTERS[i] || i + 1}`,
        roundId: nextRound.id,
        roundName: nextRound.name,
        teamIds: groupTeams,
        qualifyCount: nextRound.qualifyPerGroup,
        status: 'active',
        createdAt: new Date().toISOString(),
      });

      // Update each team's current group and round
      for (const teamId of groupTeams) {
        batch.update(db.collection('teams').doc(teamId), {
          groupId: groupRef.id,
          currentRound: nextRound.id,
        });
      }
    }

    // Update roadmap: mark current round complete, next round active with new groups
    const updatedRoadmap = roadmap.map((r: any, idx: number) => {
      if (r.id === roundId) return { ...r, status: 'completed' };
      if (r.id === nextRound.id) return { ...r, status: 'active', groupIds: newGroupIds };
      return r;
    });

    batch.update(tourneyRef, {
      roadmap: updatedRoadmap,
      currentRoundIndex: currentRoundIdx + 1,
      updatedAt: new Date().toISOString(),
    });

    await batch.commit();

    return NextResponse.json({
      success: true,
      nextRoundId: nextRound.id,
      nextRoundName: nextRound.name,
      qualifiedTeams: qualifiedTeamIds.length,
      groupsCreated: newGroupIds.length,
    });
  } catch (error: any) {
    console.error('Advance round error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
