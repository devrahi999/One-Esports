import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/firebaseAdmin';

const TOURNAMENT_ID = 'primary_tournament';

/**
 * GET /api/tournament
 *
 * Fetch the single active tournament. Public route — no auth needed.
 */
export async function GET() {
  try {
    const db = getDb();
    const docSnap = await db.collection('tournaments').doc(TOURNAMENT_ID).get();

    if (!docSnap.exists) {
      return NextResponse.json({ tournament: null });
    }

    return NextResponse.json({ tournament: { id: docSnap.id, ...docSnap.data() } });
  } catch (error: any) {
    console.error('Fetch tournament error:', error);
    return NextResponse.json({ 
      error: 'Failed to fetch tournament',
      debug: {
        envPath: process.env.FIREBASE_SERVICE_ACCOUNT_PATH,
        fileExists: require('fs').existsSync(require('path').resolve(process.env.FIREBASE_SERVICE_ACCOUNT_PATH || '')),
        appsLen: require('firebase-admin').apps.length,
        errObj: error.message
      }
    }, { status: 500 });
  }
}

/**
 * PUT /api/tournament
 *
 * Update or initialize the primary tournament name and logo settings.
 * Body: { name, logoUrl }
 */
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, logoUrl } = body as { name?: string; logoUrl?: string };

    const db = getDb();
    const tournamentRef = db.collection('tournaments').doc(TOURNAMENT_ID);
    
    // Check if it already exists to determine if we update or set
    const docSnap = await tournamentRef.get();
    
    const updates: any = {
      updatedAt: new Date().toISOString(),
    };
    if (name?.trim()) updates.name = name.trim();
    if (logoUrl) updates.logoUrl = logoUrl;

    if (!docSnap.exists) {
      // Initialize if it doesn't exist
      await tournamentRef.set({
        name: name?.trim() || 'My Tournament',
        logoUrl: logoUrl || '',
        teamIds: [],
        groupIds: [],
        matchIds: [],
        currentRound: 1,
        status: 'registration',
        createdAt: new Date().toISOString(),
        ...updates,
      });
    } else {
      await tournamentRef.update(updates);
    }

    const updatedSnap = await tournamentRef.get();

    return NextResponse.json({
      success: true,
      tournament: { id: updatedSnap.id, ...updatedSnap.data() },
    });
  } catch (error: any) {
    console.error('Update tournament error:', error);
    return NextResponse.json({ 
      error: 'Failed to update tournament', 
      details: error.message || error.toString(),
      stack: error.stack
    }, { status: 500 });
  }
}
