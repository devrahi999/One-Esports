export interface Player {
  name: string;
  uid: string;
}

export interface Team {
  uid: string;
  email: string;
  teamName: string;
  playerDetails: Player[];
  groupId: string | null;
}

export interface Group {
  name: string;
  teamIds: string[];
  maxTeams: number;
}

export interface MatchResult {
  teamId: string;
  kills: number;
  position: number;
}

export interface Match {
  groupId: string | null;
  round: number;
  roundLabel: string;
  date: string;
  time: string;
  map: string;
  roomID: string;
  passcode: string;
  results: MatchResult[];
  resultsSubmitted: boolean;
}

export interface TeamScore {
  teamId: string;
  teamName: string;
  totalPoints: number;
  kills: number;
  matchesPlayed: number;
  qualified: boolean;
}

export type TournamentStatus = 'registration' | 'grouped' | 'live' | 'completed';

export interface Tournament {
  name: string;
  googleSheetSyncedAt?: string;
  teamIds: string[];
  groupIds: string[];
  matchIds: string[];
  currentRound: number;
  status: TournamentStatus;
  updatedAt: string;
}
