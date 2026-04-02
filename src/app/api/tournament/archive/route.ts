import { NextResponse } from 'next/server';
import { getDb } from '@/lib/firebaseAdmin';

const TOURNAMENT_ID = 'primary_tournament';

/**
 * POST /api/tournament/archive
 *
 * Archives the current tournament to `past_tournaments` collection,
 * then wipes all live tournament data for a fresh start.
 */
export async function POST() {
  try {
    const db = getDb();

    // 1. Fetch the tournament document
    const tourneySnap = await db.collection('tournaments').doc(TOURNAMENT_ID).get();
    if (!tourneySnap.exists) {
      return NextResponse.json({ error: 'No active tournament found' }, { status: 404 });
    }
    const tourney = tourneySnap.data()!;

    // 2. Fetch all teams that ever registered
    const teamIds: string[] = tourney.teamIds || [];
    const teamDocs = await Promise.all(teamIds.map(id => db.collection('teams').doc(id).get()));
    const registeredTeams = teamDocs
      .filter(d => d.exists)
      .map(d => ({
        teamName: (d.data() as any).teamName,
        uid: (d.data() as any).uid,
        players: (d.data() as any).playerDetails || [],
      }));

    // 3. Build round-by-round snapshot
    const roadmap: any[] = tourney.roadmap || [];
    const roundsArchive: any[] = [];

    for (const roundConfig of roadmap) {
      // Fetch all groups in this round
      const groupsSnap = await db.collection('groups')
        .where('roundId', '==', roundConfig.id)
        .get();

      const groupsArchive: any[] = [];

      for (const groupDoc of groupsSnap.docs) {
        const group = groupDoc.data();
        const groupTeamIds: string[] = group.teamIds || [];

        // Fetch group team names
        const groupTeamDocs = await Promise.all(groupTeamIds.map(id => db.collection('teams').doc(id).get()));
        const groupTeamNames = groupTeamDocs
          .filter(d => d.exists)
          .map(d => (d.data() as any).teamName);

        // Fetch matches for this group
        const matchesSnap = await db.collection('matches')
          .where('groupId', '==', groupDoc.id)
          .get();

        // Build standings from submitted match results
        const pointsMap: Record<string, { teamId: string; teamName: string; points: number; kills: number; matchesPlayed: number }> = {};
        for (const matchDoc of matchesSnap.docs) {
          const match = matchDoc.data();
          if (!match.resultsSubmitted) continue;
          for (const result of match.results || []) {
            const tid = result.teamId;
            if (!pointsMap[tid]) {
              const teamDoc = await db.collection('teams').doc(tid).get();
              pointsMap[tid] = {
                teamId: tid,
                teamName: (teamDoc.data() as any)?.teamName || 'Unknown',
                points: 0,
                kills: 0,
                matchesPlayed: 0,
              };
            }
            pointsMap[tid].points += result.totalPoints || 0;
            pointsMap[tid].kills += result.kills || 0;
            pointsMap[tid].matchesPlayed += 1;
          }
        }

        const standings = Object.values(pointsMap)
          .sort((a, b) => b.points - a.points || b.kills - a.kills)
          .map((entry, i) => ({ rank: i + 1, ...entry }));

        // Determine qualified teams (top qualifyPerGroup)
        const qualifiedTeams = standings
          .slice(0, roundConfig.qualifyPerGroup || standings.length)
          .map(s => s.teamName);

        groupsArchive.push({
          groupId: groupDoc.id,
          name: group.name,
          teams: groupTeamNames,
          teamCount: groupTeamIds.length,
          standings,
          qualifiedTeams,
        });
      }

      roundsArchive.push({
        roundId: roundConfig.id,
        roundName: roundConfig.name,
        order: roundConfig.order,
        teamsEntering: roundsArchive.length === 0
          ? tourney.totalTeams
          : (roadmap[roundConfig.order - 1]?.groupIds?.length || 0) * (roadmap[roundConfig.order - 1]?.qualifyPerGroup || 0),
        groups: groupsArchive,
      });
    }

    // 4. Build final standings from the last round
    const lastRoundArchive = roundsArchive[roundsArchive.length - 1];
    const finalStandingsMap: Record<string, { teamName: string; points: number; kills: number; matchesPlayed: number }> = {};
    for (const group of lastRoundArchive?.groups || []) {
      for (const standing of group.standings) {
        const key = standing.teamId;
        if (!finalStandingsMap[key]) {
          finalStandingsMap[key] = { teamName: standing.teamName, points: 0, kills: 0, matchesPlayed: 0 };
        }
        finalStandingsMap[key].points += standing.points;
        finalStandingsMap[key].kills += standing.kills;
        finalStandingsMap[key].matchesPlayed += standing.matchesPlayed;
      }
    }
    const finalStandings = Object.values(finalStandingsMap)
      .sort((a, b) => b.points - a.points || b.kills - a.kills)
      .map((entry, i) => ({ rank: i + 1, ...entry }));

    // 5. Create the archive document
    const archiveData = {
      name: tourney.name || 'Tournament',
      archivedAt: new Date().toISOString(),
      totalRegistrations: registeredTeams.length,
      teamsPerGroup: tourney.teamsPerGroup,
      roadmapSummary: roadmap.map(r => ({
        id: r.id,
        name: r.name,
        qualifyPerGroup: r.qualifyPerGroup,
        status: r.status,
      })),
      rounds: roundsArchive,
      finalStandings,
      champion: finalStandings[0]?.teamName || null,
      registeredTeams,
    };

    await db.collection('past_tournaments').add(archiveData);

    // 6. Wipe live data — delete all groups, matches, and the tournament document
    // Delete matches
    const allMatches = await db.collection('matches').get();
    const matchBatch = db.batch();
    allMatches.docs.forEach(d => matchBatch.delete(d.ref));
    await matchBatch.commit();

    // Delete groups
    const allGroups = await db.collection('groups').get();
    const groupBatch = db.batch();
    allGroups.docs.forEach(d => groupBatch.delete(d.ref));
    await groupBatch.commit();

    // Delete teams
    const allTeams = await db.collection('teams').get();
    const teamBatch = db.batch();
    allTeams.docs.forEach(d => teamBatch.delete(d.ref));
    await teamBatch.commit();

    // Delete the tournament document itself
    await db.collection('tournaments').doc(TOURNAMENT_ID).delete();

    return NextResponse.json({
      success: true,
      champion: archiveData.champion,
      message: 'Tournament archived and live data cleared.',
    });
  } catch (error: any) {
    console.error('Archive error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
