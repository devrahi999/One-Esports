/**
 * Official Free Fire point system
 * Based on placement + kills
 */
export const FREE_FIRE_POINT_SYSTEM: Record<number, number> = {
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
};

export const KILL_POINT = 1;

export function calculatePlacementPoints(position: number): number {
  return FREE_FIRE_POINT_SYSTEM[position] || 0;
}

export function calculateKillPoints(kills: number): number {
  return kills * KILL_POINT;
}

export function calculateTotalPoints(position: number, kills: number): number {
  return calculatePlacementPoints(position) + calculateKillPoints(kills);
}
