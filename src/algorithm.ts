import type { Player } from './types';

// Weights for composite score (used for snake-draft seeding)
const WEIGHTS = {
  skills: 0.30,
  stamina: 0.25,
  physicality: 0.20,
  teamPlayer: 0.15,
  attackDefense: 0.10,
};

function compositeScore(p: Player): number {
  return (
    p.skills * WEIGHTS.skills +
    p.stamina * WEIGHTS.stamina +
    p.physicality * WEIGHTS.physicality +
    p.teamPlayer * WEIGHTS.teamPlayer +
    (10 - Math.abs(p.attackDefense - 5)) * WEIGHTS.attackDefense
  );
}

/** Multi-dimensional imbalance between two groups */
function imbalance(a: Player[], b: Player[]): number {
  const attrs: (keyof Player)[] = ['skills', 'stamina', 'physicality', 'teamPlayer', 'attackDefense'];
  let total = 0;
  for (const attr of attrs) {
    const meanA = a.reduce((s, p) => s + (p[attr] as number), 0) / a.length;
    const meanB = b.reduce((s, p) => s + (p[attr] as number), 0) / b.length;
    total += Math.abs(meanA - meanB);
  }
  return total;
}

/**
 * Assign an even number of players into two balanced teams.
 * Supports 4v4 (8), 5v5 (10), 6v6 (12), 7v7 (14).
 * Returns { teamWhite, teamBlack } as arrays of player IDs.
 */
export function assignTeams(players: Player[]): { teamWhite: string[]; teamBlack: string[] } {
  const total = players.length;
  if (total < 2 || total % 2 !== 0) throw new Error('Player count must be an even number ≥ 2');

  const half = total / 2;

  // 1. Sort by composite score descending
  const sorted = [...players].sort((a, b) => compositeScore(b) - compositeScore(a));

  // 2. Snake draft — alternates in pairs: W B B W W B B W ...
  const white: Player[] = [];
  const black: Player[] = [];
  sorted.forEach((p, i) => {
    const pair = Math.floor(i / 2);
    const isEvenPair = pair % 2 === 0;
    const isFirstInPair = i % 2 === 0;
    if (isEvenPair ? isFirstInPair : !isFirstInPair) white.push(p);
    else black.push(p);
  });

  // 3. Simulated annealing refinement
  let best = { white: [...white], black: [...black] };
  let bestScore = imbalance(white, black);
  let current = { white: [...white], black: [...black] };
  let currentScore = bestScore;

  const ITERATIONS = 8000;
  let temp = 2.0;
  const cooling = Math.pow(0.001 / temp, 1 / ITERATIONS);

  for (let i = 0; i < ITERATIONS; i++) {
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
