import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/firebaseAdmin';
import { Team } from '@/types/database';

/**
 * Generic webhook endpoint
 *
 * Call this from a Google Form "submit" script or Zapier/Make automation.
 * Each time a form is submitted, it hits here and saves the team.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { uid, email, teamName, players, tournamentId } = body as {
      uid: string;
      email: string;
      teamName: string;
      players: { name: string; uid: string }[];
      tournamentId?: string;
    };

    if (!uid || !email || !teamName || !players) {
      return NextResponse.json(
        { error: 'uid, email, teamName, and players are required' },
        { status: 400 }
      );
    }

    const db = getDb();
    const team: Team = {
      uid,
      email,
      teamName,
      playerDetails: players,
      groupId: null,
    };

    await db.collection('teams').doc(uid).set(team, { merge: true });

    // Add team's UID to the tournament teamIds array
    if (tournamentId) {
      const tournament = await db.collection('tournaments').doc(tournamentId).get();
      if (tournament.exists) {
        const data = tournament.data()!;
        const teamIds = data.teamIds || [];
        if (!teamIds.includes(uid)) {
          teamIds.push(uid);
          await db.collection('tournaments').doc(tournamentId).update({ teamIds });
        }
      }
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Google webhook error:', error);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
