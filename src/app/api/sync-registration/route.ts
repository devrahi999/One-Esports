import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/firebaseAdmin';

const GROUP_LETTERS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';

export async function POST(request: NextRequest) {
  try {
    const { csvData, tournamentId } = await request.json();

    if (!csvData || !tournamentId) {
      return NextResponse.json({ error: 'csvData and tournamentId are required' }, { status: 400 });
    }

    const lines = csvData.trim().split(/\r?\n/).filter((l: string) => l.trim().length > 0);
    if (lines.length < 2) {
      return NextResponse.json({ error: 'CSV must contain headers and at least one data row' }, { status: 400 });
    }

    const parseRow = (str: string) => {
      const result = [];
      let current = '';
      let inQuotes = false;
      for (let i = 0; i < str.length; i++) {
        if (str[i] === '"') inQuotes = !inQuotes;
        else if (str[i] === ',' && !inQuotes) {
          result.push(current.trim().replace(/^"|"$/g, ''));
          current = '';
        } else {
          current += str[i];
        }
      }
      result.push(current.trim().replace(/^"|"$/g, ''));
      return result;
    };

    const headers = parseRow(lines[0]).map(h => h.toLowerCase().trim().replace(/\s+/g, ' '));
    const findIndex = (keywords: string[]) =>
      headers.findIndex((h) => keywords.some((k) => h.includes(k.toLowerCase())));

    const teamNameIdx = findIndex(['team name', 'squad name']);
    const emailIdx = findIndex(['team leader email', 'email', 'contact']);
    const wpIdx = findIndex(['whatsapp', 'phone', 'mobile']);
    const leaderUidIdx = findIndex(['leader uid', 'uid', 'id']);
    const leaderIgnIdx = findIndex(['leader ign', 'ign', 'name']);
    const tagIdx = findIndex(['team tag', 'tag']);

    const p2UidIdx = findIndex(['player2 uid', 'player 2 uid']);
    const p2IgnIdx = findIndex(['player2 ign', 'player 2 ign']);
    const p3UidIdx = findIndex(['player3 uid', 'player 3 uid']);
    const p3IgnIdx = findIndex(['player3 ign', 'player 3 ign']);
    const p4UidIdx = findIndex(['player4 uid', 'player 4 uid']);
    const p4IgnIdx = findIndex(['player4 ign', 'player 4 ign']);
    const p5UidIdx = findIndex(['player5 uid', 'player 5 uid']);
    const p5IgnIdx = findIndex(['player5 ign', 'player 5 ign']);

    const finalNameIdx = teamNameIdx !== -1 ? teamNameIdx : 0;
    const finalEmailIdx = emailIdx !== -1 ? emailIdx : 2;
    const finalLeaderUidIdx = leaderUidIdx !== -1 ? leaderUidIdx : 4;

    const db = getDb();

    // ── 1. Check if roadmap exists and has at least one round ──
    const tourneyRef = db.collection('tournaments').doc(tournamentId);
    const tourneySnap = await tourneyRef.get();

    if (!tourneySnap.exists) {
      return NextResponse.json(
        { error: 'Tournament not found. Please create a roadmap first.' },
        { status: 400 }
      );
    }

    const tournament = tourneySnap.data()!;
    const roadmap: any[] = tournament.roadmap || [];

    if (roadmap.length === 0) {
      return NextResponse.json(
        { error: 'No roadmap found. Please create the tournament roadmap before importing teams.' },
        { status: 400 }
      );
    }

    const firstRound = roadmap[0];
    const teamsPerGroup: number = tournament.teamsPerGroup || 12;

    // ── 2. Parse CSV and build team documents ──
    const batch = db.batch();
    const teamsRef = db.collection('teams');
    const newTeamIds: string[] = [];
    let synced = 0;

    for (let i = 1; i < lines.length; i++) {
      const row = parseRow(lines[i]);
      if (row.length < 3) continue;

      const teamName = row[finalNameIdx];
      const email = row[finalEmailIdx];
      const leaderUid = row[finalLeaderUidIdx];

      if (!teamName || !leaderUid) continue;

      const playerDetails = [];

      if (leaderIgnIdx !== -1 && row[leaderIgnIdx]) {
        playerDetails.push({ name: row[leaderIgnIdx], uid: leaderUid });
      }

      const addPlayer = (idxUid: number, idxIgn: number) => {
        if (idxUid !== -1 && idxIgn !== -1 && row[idxUid]) {
          playerDetails.push({ name: row[idxIgn] || '', uid: row[idxUid] });
        }
      };

      addPlayer(p2UidIdx, p2IgnIdx);
      addPlayer(p3UidIdx, p3IgnIdx);
      addPlayer(p4UidIdx, p4IgnIdx);
      addPlayer(p5UidIdx, p5IgnIdx);

      const teamData = {
        uid: leaderUid,
        email: email || '',
        teamName,
        teamTag: tagIdx !== -1 ? row[tagIdx] : '',
        whatsapp: wpIdx !== -1 ? row[wpIdx] : '',
        playerDetails,
        registeredAt: new Date().toISOString(),
        groupId: null,
        currentRound: firstRound.id,
        qualified: false,
      };

      batch.set(teamsRef.doc(leaderUid), teamData, { merge: true });
      newTeamIds.push(leaderUid);
      synced++;
    }

    if (synced === 0) {
      return NextResponse.json({ error: 'No valid rows found to sync' }, { status: 400 });
    }

    // ── 3. Build Round 1 groups from roadmap config ──
    const shuffled = [...newTeamIds].sort(() => Math.random() - 0.5);
    const totalGroups = Math.ceil(shuffled.length / teamsPerGroup);
    const newGroupIds: string[] = [];

    for (let i = 0; i < totalGroups; i++) {
      const groupTeams = shuffled.slice(i * teamsPerGroup, (i + 1) * teamsPerGroup);
      const groupRef = db.collection('groups').doc();
      newGroupIds.push(groupRef.id);

      batch.set(groupRef, {
        name: `Group ${GROUP_LETTERS[i] || i + 1}`,
        roundId: firstRound.id,
        roundName: firstRound.name,
        teamIds: groupTeams,
        qualifyCount: firstRound.qualifyPerGroup,
        status: 'active',
        createdAt: new Date().toISOString(),
      });

      // Assign groupId to each team
      for (const teamId of groupTeams) {
        batch.update(teamsRef.doc(teamId), { groupId: groupRef.id });
      }
    }

    // ── 4. Update tournament ──
    const existingIds: string[] = tournament.teamIds || [];
    const mergedIds = Array.from(new Set([...existingIds, ...newTeamIds]));

    // Update roadmap: mark round 1 as active with the created group IDs
    const updatedRoadmap = roadmap.map((r: any, idx: number) => {
      if (idx === 0) return { ...r, status: 'active', groupIds: newGroupIds };
      return r;
    });

    batch.update(tourneyRef, {
      teamIds: mergedIds,
      groupIds: newGroupIds,
      roadmap: updatedRoadmap,
      status: 'active',
      updatedAt: new Date().toISOString(),
    });

    await batch.commit();

    return NextResponse.json({
      success: true,
      synced,
      groupsCreated: newGroupIds.length,
      firstRoundId: firstRound.id,
    });
  } catch (error: any) {
    console.error('CSV Sync error:', error);
    return NextResponse.json({ error: error.message || 'Failed to sync data' }, { status: 500 });
  }
}
