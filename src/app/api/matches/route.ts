import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/firebaseAdmin';
import { z } from 'zod';

const matchSchema = z.object({
  tournamentId: z.string(),
  groupId: z.string().optional(),
  round: z.number().default(1),
  roundLabel: z.string().default('Round 1'),
  date: z.string(),
  time: z.string(),
  map: z.string(),
});

/**
 * POST /api/matches
 *
 * Create a new match.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { tournamentId, groupId, round, roundLabel, date, time, map } =
      matchSchema.parse(body);

    const db = getDb();
    const matchRef = db.collection('matches').doc();

    await matchRef.set({
      groupId: groupId || null,
      round,
      roundLabel,
      date,
      time,
      map,
      roomID: '',
      passcode: '',
      results: [],
      resultsSubmitted: false,
    });

    // Add to tournament
    const tournamentRef = db.collection('tournaments').doc(tournamentId);
    const snapshot = await tournamentRef.get();
    const data = snapshot.data()!;
    const matchIds = data.matchIds || [];
    matchIds.push(matchRef.id);

    await tournamentRef.update({
      matchIds,
      status: 'live',
      updatedAt: new Date().toISOString(),
    });

    return NextResponse.json({ matchId: matchRef.id, success: true });
  } catch (error) {
    console.error('Create match error:', error);
    return NextResponse.json({ error: 'Failed to create match' }, { status: 500 });
  }
}
