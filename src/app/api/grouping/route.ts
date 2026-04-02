import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/firebaseAdmin';

interface TeamDoc {
  id: string;
  [key: string]: unknown;
}

/**
 * POST /api/grouping
 *
 * Randomly assign ungrouped teams into groups.
 * Body: { tournamentId? (optional), maxTeamsPerGroup? (default 12) }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { tournamentId, maxTeamsPerGroup = 12 } = body as {
      tournamentId?: string;
      maxTeamsPerGroup?: number;
    };

    const db = getDb();

    // Resolve tournamentId — if not provided, fetch the active/first tournament
    let activeTournamentId = tournamentId;
    if (!activeTournamentId) {
      const snapshot = await db.collection('tournaments').limit(1).get();
      if (snapshot.empty) {
        return NextResponse.json(
          { error: 'No active tournament found. Please create a tournament first.' },
          { status: 400 }
        );
      }
      activeTournamentId = snapshot.docs[0].id;
    }

    // Fetch all ungrouped teams
    const teamsSnapshot = await db
      .collection('teams')
      .where('groupId', '==', null)
      .get();

    if (teamsSnapshot.empty) {
      return NextResponse.json(
        { error: 'No ungrouped teams found. All teams may already be in a group.' },
        { status: 400 }
      );
    }

    // Shuffle teams (Fisher-Yates)
    const teams: TeamDoc[] = teamsSnapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
    const shuffled = shuffleArray(teams);

    const numGroups = Math.ceil(shuffled.length / maxTeamsPerGroup);
    const newGroupIds: string[] = [];
    const batch = db.batch();

    for (let i = 0; i < numGroups; i++) {
      const groupName = `Group ${String.fromCharCode(65 + i)}`; // Group A, B, C...
      const groupRef = db.collection('groups').doc();
      newGroupIds.push(groupRef.id);

      const groupTeams = shuffled.slice(i * maxTeamsPerGroup, (i + 1) * maxTeamsPerGroup);

      batch.set(groupRef, {
        name: groupName,
        teamIds: groupTeams.map((t) => t.id),
        maxTeams: maxTeamsPerGroup,
        tournamentId: activeTournamentId,
        createdAt: new Date().toISOString(),
      });

      // Update each team's groupId
      for (const team of groupTeams) {
        batch.update(db.collection('teams').doc(team.id), {
          groupId: groupRef.id,
        });
      }
    }

    // Update tournament with new groupIds and status
    const tournamentRef = db.collection('tournaments').doc(activeTournamentId);
    const tournamentSnap = await tournamentRef.get();
    const existingGroupIds: string[] = tournamentSnap.data()?.groupIds || [];

    batch.update(tournamentRef, {
      groupIds: [...existingGroupIds, ...newGroupIds],
      status: 'grouped',
      updatedAt: new Date().toISOString(),
    });

    await batch.commit();

    return NextResponse.json({
      success: true,
      tournamentId: activeTournamentId,
      groups: numGroups,
      groupIds: newGroupIds,
      teamsGrouped: shuffled.length,
    });
  } catch (error) {
    console.error('Grouping error:', error);
    return NextResponse.json({ error: 'Failed to create groups' }, { status: 500 });
  }
}

function shuffleArray<T>(array: T[]): T[] {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}
