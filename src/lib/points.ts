/**
 * Official Free Fire Point System
 * Placement points + 1 point per kill
 */

export const PLACEMENT_POINTS: Record<number, number> = {
  1: 12,
  2: 9,
  3: 8,
  4: 7,
  5: 6,
  6: 5,
  7: 4,
  8: 3,
  9: 2,
  10: 1,
  // 11th and beyond = 0 points
};

export const KILL_POINT = 1; // 1 point per kill

export function getPlacementPoints(position: number): number {
  return PLACEMENT_POINTS[position] || 0;
}

export function getKillPoints(kills: number): number {
  return kills * KILL_POINT;
}

export function calculateTotalPoints(position: number, kills: number): number {
  return getPlacementPoints(position) + getKillPoints(kills);
}

// Backward compat alias
export const calculatePlacementPoints = getPlacementPoints;
export const calculateKillPoints = getKillPoints;

/**
 * Tiebreaker-aware leaderboard entry
 */
export interface LeaderboardEntry {
  teamId: string;
  teamName: string;
  totalPoints: number;
  placementPoints: number;
  kills: number;
  booyahs: number;        // Count of 1st place finishes
  matchesPlayed: number;
}

/**
 * Sort leaderboard using tiebreaker rules:
 * 1. Total Points (desc)
 * 2. Booyahs / Match Wins (desc)
 * 3. Total Kills (desc)
 * 4. Placement Points only (desc)
 */
export function sortLeaderboard(entries: LeaderboardEntry[]): LeaderboardEntry[] {
  return [...entries].sort((a, b) => {
    // 1. Total points
    if (b.totalPoints !== a.totalPoints) return b.totalPoints - a.totalPoints;
    // 2. Booyahs (1st place count)
    if (b.booyahs !== a.booyahs) return b.booyahs - a.booyahs;
    // 3. Total kills
    if (b.kills !== a.kills) return b.kills - a.kills;
    // 4. Placement points only
    return b.placementPoints - a.placementPoints;
  });
}

/**
 * Point table for displaying in UI
 */
export const POINT_TABLE = [
  { position: '1st', points: 12, label: '🥇 Booyah' },
  { position: '2nd', points: 9, label: '🥈' },
  { position: '3rd', points: 8, label: '🥉' },
  { position: '4th', points: 7, label: '' },
  { position: '5th', points: 6, label: '' },
  { position: '6th', points: 5, label: '' },
  { position: '7th', points: 4, label: '' },
  { position: '8th', points: 3, label: '' },
  { position: '9th', points: 2, label: '' },
  { position: '10th', points: 1, label: '' },
  { position: '11th–12th', points: 0, label: '' },
];
