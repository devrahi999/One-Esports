import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/firebaseAdmin';
import { z } from 'zod';
import { sendRoomCredentials } from '@/lib/email';

/**
 * POST /api/admin/room-credentials
 *
 * Set room ID + passcode and optionally email all team leaders in the group.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { matchId, roomID, passcode, sendEmail } = body as {
      matchId: string;
      roomID: string;
      passcode: string;
      sendEmail?: boolean;
    };

    if (!matchId || !roomID || !passcode) {
      return NextResponse.json(
        { error: 'matchId, roomID, and passcode are required' },
        { status: 400 }
      );
    }

    const db = getDb();

    // Update match
    await db.collection('matches').doc(matchId).update({ roomID, passcode });

    // If sendEmail, get all team emails in the group
    if (sendEmail) {
      const matchDoc = await db.collection('matches').doc(matchId).get();
      const match = matchDoc.data();

      if (match?.groupId) {
        const groupDoc = await db.collection('groups').doc(match.groupId).get();
        if (groupDoc.exists) {
          const group = groupDoc.data();
          const teamIds = group?.teamIds || [];

          const emails: string[] = [];
          for (const teamId of teamIds) {
            const teamDoc = await db.collection('teams').doc(teamId).get();
            if (teamDoc.exists) {
              const email = teamDoc.data()?.email;
              if (email) emails.push(email);
            }
          }

          if (emails.length > 0) {
            await sendRoomCredentials(
              emails,
              roomID,
              passcode,
              match.time,
              match.map
            );
          }
        }
      }
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to update room' }, { status: 500 });
  }
}
