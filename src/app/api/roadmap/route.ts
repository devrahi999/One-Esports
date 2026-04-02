import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/firebaseAdmin';

const TOURNAMENT_ID = 'primary_tournament';

export interface RoadmapRound {
  id: string;           // slug e.g. 'round_1'
  name: string;         // display name e.g. 'Round 1'
  order: number;        // 0-based
  qualifyPerGroup: number;
  status: 'pending' | 'active' | 'completed';
  groupIds: string[];
}

/**
 * GET /api/roadmap
 * Returns the current tournament roadmap config
 */
export async function GET() {
  try {
    const db = getDb();
    const doc = await db.collection('tournaments').doc(TOURNAMENT_ID).get();

    if (!doc.exists) {
      return NextResponse.json({ tournament: null, roadmap: [] });
    }

    const data = doc.data()!;
    return NextResponse.json({
      tournament: { id: doc.id, ...data },
      roadmap: data.roadmap || [],
    });
  } catch (error: any) {
    console.error('GET roadmap error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

/**
 * POST /api/roadmap
 * Save/update tournament roadmap. This sets the structure before teams are imported.
 * Body: { totalTeams, teamsPerGroup, rounds: RoadmapRound[] }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { totalTeams, teamsPerGroup, rounds, tournamentName } = body;

    if (!totalTeams || !teamsPerGroup || !rounds?.length) {
      return NextResponse.json(
        { error: 'totalTeams, teamsPerGroup and rounds are required' },
        { status: 400 }
      );
    }

    const db = getDb();
    const tourneyRef = db.collection('tournaments').doc(TOURNAMENT_ID);
    const snap = await tourneyRef.get();

    // Mark first round as 'active', rest 'pending'
    const roadmapRounds: RoadmapRound[] = rounds.map((r: any, idx: number) => ({
      id: r.id,
      name: r.name,
      order: idx,
      qualifyPerGroup: r.qualifyPerGroup,
      status: idx === 0 ? 'pending' : 'pending',
      groupIds: [],
    }));

    if (!snap.exists) {
      await tourneyRef.set({
        name: tournamentName || 'My Tournament',
        status: 'setup',
        totalTeams,
        teamsPerGroup,
        roadmap: roadmapRounds,
        teamIds: [],
        groupIds: [],
        matchIds: [],
        currentRoundIndex: 0,
        createdAt: new Date().toISOString(),
      });
    } else {
      await tourneyRef.update({
        totalTeams,
        teamsPerGroup,
        roadmap: roadmapRounds,
        currentRoundIndex: 0,
        updatedAt: new Date().toISOString(),
        ...(tournamentName ? { name: tournamentName } : {}),
      });
    }

    const updated = await tourneyRef.get();
    return NextResponse.json({ success: true, tournament: { id: updated.id, ...updated.data() } });
  } catch (error: any) {
    console.error('POST roadmap error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
