export interface Player {
  id: string;
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
