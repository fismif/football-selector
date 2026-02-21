import type { Player } from './types';

// Weights for composite score (used for snake-draft seeding)
const WEIGHTS = {
  skills: 0.30,
  stamina: 0.25,
  physicality: 0.20,
  teamPlayer: 0.15,
  attackDefense: 0.10, // balanced contribution
};

function compositeScore(p: Player): number {
  return (
    p.skills * WEIGHTS.skills +
    p.stamina * WEIGHTS.stamina +
    p.physicality * WEIGHTS.physicality +
    p.teamPlayer * WEIGHTS.teamPlayer +
    // Treat midpoint (5) as neutral; use deviation as "expressiveness"
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
 * Assign 14 players into two balanced teams of 7.
 * Returns { teamWhite, teamBlack } as arrays of player IDs.
 */
export function assignTeams(players: Player[]): { teamWhite: string[]; teamBlack: string[] } {
  if (players.length !== 14) throw new Error('Exactly 14 players required');

  // 1. Sort by composite score descending
  const sorted = [...players].sort((a, b) => compositeScore(b) - compositeScore(a));

  // 2. Snake draft: 1→W,2→B,3→B,4→W,5→W,6→B ... alternates in pairs
  //    Pattern: W B B W W B B W W B B W W B
  const snakePattern = [0, 1, 1, 0, 0, 1, 1, 0, 0, 1, 1, 0, 0, 1]; // 0=white,1=black
  let white: Player[] = [];
  let black: Player[] = [];
  sorted.forEach((p, i) => {
    if (snakePattern[i] === 0) white.push(p);
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
    // Pick random swap between teams
    const wi = Math.floor(Math.random() * 7);
    const bi = Math.floor(Math.random() * 7);
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
