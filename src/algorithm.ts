import type { Player } from './types';
import { positionFromAttackDefense } from './types';

// ── Composite score (advanced: weighted average; simplified: uniform so equal) ──
function compositeScore(p: Player): number {
  return (p.skills + p.stamina + p.physicality + p.teamPlayer) / 4;
}

/** Count DEF / MID / ATT in a team */
function positionCounts(players: Player[]): Record<string, number> {
  const counts: Record<string, number> = { DEF: 0, MID: 0, ATT: 0 };
  for (const p of players) counts[positionFromAttackDefense(p.attackDefense)]++;
  return counts;
}

/**
 * Multi-dimensional imbalance between two groups.
 * Adds a strong position-balance penalty so both teams end up with
 * the same number of DEF / MID / ATT players (or as close as possible).
 */
function imbalance(a: Player[], b: Player[]): number {
  // 1. Score difference (overall balance)
  const avgA = a.reduce((s, p) => s + compositeScore(p), 0) / a.length;
  const avgB = b.reduce((s, p) => s + compositeScore(p), 0) / b.length;
  let total = Math.abs(avgA - avgB) * 3; // weight × 3

  // 2. Individual attribute balance (for advanced groups with varied stats)
  const attrs: (keyof Player)[] = ['skills', 'stamina', 'physicality', 'teamPlayer'];
  for (const attr of attrs) {
    const meanA = a.reduce((s, p) => s + (p[attr] as number), 0) / a.length;
    const meanB = b.reduce((s, p) => s + (p[attr] as number), 0) / b.length;
    total += Math.abs(meanA - meanB) * 0.5;
  }

  // 3. Position balance penalty — strongly penalise mismatched position counts
  const cA = positionCounts(a);
  const cB = positionCounts(b);
  for (const pos of ['DEF', 'MID', 'ATT']) {
    total += Math.abs(cA[pos] - cB[pos]) * 2.5; // heavy weight
  }

  return total;
}

/** Fisher-Yates shuffle (in-place, returns array) */
function shuffle<T>(arr: T[]): T[] {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

/**
 * Assign an even number of players into two balanced teams.
 * Supports 4v4 (8), 5v5 (10), 6v6 (12), 7v7 (14).
 * Returns { teamWhite, teamBlack } as arrays of player IDs.
 *
 * Position balance: the algorithm strongly discourages mismatched
 * DEF/MID/ATT counts between teams, so each re-shuffle produces
 * fair position distribution.
 * Randomness: players are shuffled before seeding so every call
 * produces a different candidate solution.
 */
export function assignTeams(players: Player[]): { teamWhite: string[]; teamBlack: string[] } {
  const total = players.length;
  if (total < 2 || total % 2 !== 0) throw new Error('Player count must be an even number ≥ 2');

  const half = total / 2;

  // 1. Sort by composite score then inject randomness: shuffle within each
  //    score "tier" so we don't always get the same starting assignment.
  const scored = players.map((p) => ({ p, score: compositeScore(p) }));
  scored.sort((a, b) => b.score - a.score);

  // Group into tiers (within 0.5 score of each other) and shuffle each tier
  const tiered: Player[] = [];
  let i = 0;
  while (i < scored.length) {
    let j = i;
    while (j < scored.length && scored[i].score - scored[j].score < 0.5) j++;
    const tier = scored.slice(i, j).map((x) => x.p);
    shuffle(tier);
    tiered.push(...tier);
    i = j;
  }

  // 2. Snake draft from the (shuffled within tiers) order: W B B W W B B W …
  const white: Player[] = [];
  const black: Player[] = [];
  tiered.forEach((p, idx) => {
    const pair = Math.floor(idx / 2);
    const isEvenPair = pair % 2 === 0;
    const isFirstInPair = idx % 2 === 0;
    if (isEvenPair ? isFirstInPair : !isFirstInPair) white.push(p);
    else black.push(p);
  });

  // 3. Simulated annealing — optimises both score balance AND position balance
  let best = { white: [...white], black: [...black] };
  let bestScore = imbalance(white, black);
  let current = { white: [...white], black: [...black] };
  let currentScore = bestScore;

  const ITERATIONS = 12000;
  let temp = 3.0;
  const cooling = Math.pow(0.001 / temp, 1 / ITERATIONS);

  for (let it = 0; it < ITERATIONS; it++) {
    const wi = Math.floor(Math.random() * half);
    const bi = Math.floor(Math.random() * half);
    const newWhite = [...current.white];
    const newBlack = [...current.black];
    [newWhite[wi], newBlack[bi]] = [newBlack[bi], newWhite[wi]];

    const newScore = imbalance(newWhite, newBlack);
    const delta = newScore - currentScore;

    if (delta < 0 || Math.random() < Math.exp(-delta / temp)) {
      current = { white: newWhite, black: newBlack };
      currentScore = newScore;
      if (currentScore < bestScore) {
        best = { white: [...newWhite], black: [...newBlack] };
        bestScore = currentScore;
      }
    }
    temp *= cooling;
  }

  return {
    teamWhite: best.white.map((p) => p.id),
    teamBlack: best.black.map((p) => p.id),
  };
}

/** Average overall rating for a list of players */
export function teamAvg(players: Player[]): string {
  if (!players.length) return '—';
  const avg = players.reduce((s, p) => s + compositeScore(p), 0) / players.length;
  return avg.toFixed(1);
}
