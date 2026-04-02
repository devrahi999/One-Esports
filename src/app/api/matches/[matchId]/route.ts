import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/firebaseAdmin';
import { sendRoomCredentials } from '@/lib/email';

/**
 * PUT /api/matches/[matchId]
 *
 * Update room ID and passcode for a match.
 * Optionally emails all team leaders in the group.
 * Body: { roomID, passcode, sendEmail? }
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: { matchId: string } }
) {
  try {
    const { matchId } = params;
    const body = await request.json();
    const { roomID, passcode, sendEmail = false } = body as {
      roomID: string;
      passcode: string;
      sendEmail?: boolean;
    };

    if (!roomID || !passcode) {
      return NextResponse.json(
        { error: 'roomID and passcode are required' },
        { status: 400 }
      );
    }

    const db = getDb();

    // Update match with room credentials
    await db.collection('matches').doc(matchId).update({
      roomID,
      passcode,
      updatedAt: new Date().toISOString(),
    });

    // Optionally email all team leaders in the group
    if (sendEmail) {
      const matchDoc = await db.collection('matches').doc(matchId).get();
      if (!matchDoc.exists) {
        return NextResponse.json({ error: 'Match not found' }, { status: 404 });
      }
      const match = matchDoc.data()!;

      if (match.groupId) {
        const groupDoc = await db.collection('groups').doc(match.groupId).get();
        if (groupDoc.exists) {
          const group = groupDoc.data()!;
          const teamIds: string[] = group.teamIds || [];

          const emails: string[] = [];
          for (const teamId of teamIds) {
            const teamDoc = await db.collection('teams').doc(teamId).get();
            if (teamDoc.exists) {
              const email = teamDoc.data()?.email;
              if (email) emails.push(email);
            }
          }

          if (emails.length > 0) {
            await sendRoomCredentials(emails, roomID, passcode, match.time, match.map);
          }
        }
      }
    }

    return NextResponse.json({ success: true, roomID, passcode });
  } catch (error) {
    console.error('Update room error:', error);
    return NextResponse.json({ error: 'Failed to update room credentials' }, { status: 500 });
  }
}

/**
 * GET /api/matches/[matchId]
 *
 * Get a single match by ID.
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: { matchId: string } }
) {
  try {
    const { matchId } = params;
    const db = getDb();
    const matchDoc = await db.collection('matches').doc(matchId).get();

    if (!matchDoc.exists) {
      return NextResponse.json({ error: 'Match not found' }, { status: 404 });
    }

    return NextResponse.json({ id: matchDoc.id, ...matchDoc.data() });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch match' }, { status: 500 });
  }
}

/**
 * DELETE /api/matches/[matchId]
 *
 * Delete a match.
 */
export async function DELETE(
  _request: NextRequest,
  { params }: { params: { matchId: string } }
) {
  try {
    const { matchId } = params;
    const db = getDb();
    await db.collection('matches').doc(matchId).delete();
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to delete match' }, { status: 500 });
  }
}
