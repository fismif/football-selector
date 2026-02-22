export type GroupMode = 'advanced' | 'simplified';

export interface Group {
  id: string;
  name: string;
  mode: GroupMode;
  createdAt: string;
}

// Position derived from attackDefense for display purposes
export type Position = 'DEF' | 'MID' | 'ATT';
export const ATK_DEF_FOR_POSITION: Record<Position, number> = {
  DEF: 2,
  MID: 5,
  ATT: 8,
};
export function positionFromAttackDefense(v: number): Position {
  return v <= 3 ? 'DEF' : v <= 6 ? 'MID' : 'ATT';
}

export interface Player {
  id: string;
  groupId: string;
  name: string;
  attackDefense: number; // 0 = fully defensive, 10 = fully attacking
  stamina: number;       // 1-10
  skills: number;        // 1-10
  teamPlayer: number;    // 1-10
  physicality: number;   // 1-10
  createdAt: string;
}

export type MatchFormat = '4v4' | '5v5' | '6v6' | '7v7';

export const FORMAT_PLAYERS: Record<MatchFormat, number> = {
  '4v4': 8,
  '5v5': 10,
  '6v6': 12,
  '7v7': 14,
};

export interface Match {
  id: string;
  groupId: string;
  date: string;          // YYYY-MM-DD
  time: string;          // HH:MM
  endTime: string;       // HH:MM
  venue: string;
  fee: number;           // total field rental cost in €
  format: MatchFormat;   // game format
  playerIds: string[];   // selected player IDs (8/10/12/14)
  waitlistIds: string[];
  teamWhite: string[];   // player IDs
  teamBlack: string[];   // player IDs
  createdAt: string;
}
