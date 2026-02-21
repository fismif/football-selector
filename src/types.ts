export interface Player {
  id: string;
  name: string;
  attackDefense: number; // 0 = fully defensive, 10 = fully attacking
  stamina: number; // 1-10
  skills: number; // 1-10
  teamPlayer: number; // 1-10
  physicality: number; // 1-10
  createdAt: string;
}

export interface Match {
  id: string;
  date: string; // YYYY-MM-DD
  time: string; // HH:MM
  venue: string;
  playerIds: string[]; // 14 selected player IDs
  waitlistIds: string[];
  teamWhite: string[]; // player IDs
  teamBlack: string[]; // player IDs
  createdAt: string;
}
