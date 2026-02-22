// seed.mjs — Run with: node --env-file=.env scripts/seed.mjs
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_ANON_KEY,
);

// ── Albanian names pool ────────────────────────────────────────────────────
const FIRST_NAMES = [
  'Artan','Blerim','Çlirim','Driton','Elton','Faton','Gëzim','Hamit',
  'Ilir','Jeton','Kujtim','Lulzim','Muharrem','Naser','Orgës','Petrit',
  'Rexhep','Taulant','Uran','Veton','Xhevit','Ylli','Besnik','Dardan',
  'Erjon','Flamur','Gazmend','Hektor','Ismet','Kreshnik','Labinot','Alban',
  'Arben','Bujar','Cen','Daut','Edmond','Fatmir','Genc','Hasan',
  'Imer','Jakup','Kastriot','Liridon','Mentor','Nexhip','Osman','Përparim',
  'Qendrim','Romi','Skënder','Trim','Ukshin','Visar','Xhemil','Zyber',
  'Agim','Besian','Çelik','Drin','Egzon','Fitim','Granit','Hekuran',
  'Ilmi','Jetmir','Kamer','Lurë','Mëhill','Nezir','Olgert','Pajtim',
  'Rifat','Sabit','Tonin','Valdet','Zef','Armir','Berat','Dorian',
  'Erblin','Fisnik','Gjergj','Hysni','Izer','Klevis','Mandush','Nalt',
  'Olsi','Pjeter','Redon','Sokol','Toni','Valmir','Xhenis','Zerind',
  'Andi','Briken','Denald','Erion','Fredi','Geri','Henri','Inva',
];

const LAST_NAMES = [
  'Bajrami','Berisha','Çela','Daka','Emini','Fazliu','Gashi','Haxhia',
  'Ibrahimi','Jaha','Kadriu','Leka','Maloku','Nushi','Osmani','Prifti',
  'Qosja','Rexha','Shala','Thaçi','Ujka','Veliu','Xhafa','Ymeri',
  'Zeka','Krasniqi','Haliti','Syla','Morina','Mustafa','Rama','Hoxha',
  'Shehu','Ukaj','Gërguri','Bytyqi','Azemi','Bunjaku','Cana','Dedaj',
  'Elezi','Fetahu','Gjevori','Hysa','Ismaili','Jashari','Kastrati','Limani',
  'Mehmeti','Ndoj','Plaku','Rrahmani','Selmani','Tahiri','Xhelili','Zogaj',
];

// ── Venues ────────────────────────────────────────────────────────────────
const VENUES = [
  'Hopsagasse 5, 1200 Wien',
  'Sporthalle Floridsdorf, 1210 Wien',
  'Stadthalle Ottakring, 1160 Wien',
  'Generali Arena Trainingsplatz',
  'Futsal Court Favoriten, 1100 Wien',
  'Sport & Fun Halle, 1030 Wien',
];

const FORMATS = ['4v4','5v5','6v6','7v7'];
const FORMAT_TO_PLAYERS = { '4v4': 8, '5v5': 10, '6v6': 12, '7v7': 14 };
const FORMAT_TO_FEE = { '4v4': 40, '5v5': 50, '6v6': 60, '7v7': 70 };

// ── Helpers ───────────────────────────────────────────────────────────────
function rnd(min, max) { return Math.floor(Math.random() * (max - min + 1)) + min; }
function pick(arr) { return arr[Math.floor(Math.random() * arr.length)]; }
function shuffle(arr) { return [...arr].sort(() => Math.random() - 0.5); }

function randomDate(start, end) {
  const ms = start.getTime() + Math.random() * (end.getTime() - start.getTime());
  return new Date(ms);
}

function toDateStr(d) { return d.toISOString().slice(0, 10); }

function generateMatchTime() {
  const hours = [18, 19, 20, 21];
  const h = pick(hours);
  return { time: `${h}:00`, endTime: `${h + 1}:00` };
}

/** Simple alternating snake assignment for seed data */
function assignTeams(playerIds) {
  const half = playerIds.length / 2;
  const shuffled = shuffle(playerIds);
  return {
    teamWhite: shuffled.slice(0, half),
    teamBlack: shuffled.slice(half),
  };
}

// ── Generate 100 unique players ───────────────────────────────────────────
const usedNames = new Set();
const players = [];

while (players.length < 100) {
  const first = pick(FIRST_NAMES);
  const last = pick(LAST_NAMES);
  const name = `${first} ${last}`;
  if (usedNames.has(name)) continue;
  usedNames.add(name);

  players.push({
    name,
    attack_defense: Math.round(rnd(1, 10)),
    stamina: Math.round(rnd(4, 10)),
    skills: Math.round(rnd(4, 10)),
    team_player: Math.round(rnd(4, 10)),
    physicality: Math.round(rnd(4, 10)),
  });
}

// ── Generate 50 matches over the last year ────────────────────────────────
const now = new Date('2026-02-22T00:00:00');
const oneYearAgo = new Date('2025-02-22T00:00:00');

console.log('🌱 Seeding database…\n');

// Insert players first
const { data: insertedPlayers, error: playerErr } = await supabase
  .from('players')
  .insert(players)
  .select('id');

if (playerErr) { console.error('❌ Players error:', playerErr.message); process.exit(1); }
const playerIds = insertedPlayers.map((p) => p.id);
console.log(`✅ Inserted ${playerIds.length} players`);

// Generate and insert matches
const matches = [];
for (let i = 0; i < 50; i++) {
  const format = pick(FORMATS);
  const count = FORMAT_TO_PLAYERS[format];
  const fee = FORMAT_TO_FEE[format] + rnd(-5, 10);
  const date = randomDate(oneYearAgo, now);
  const { time, endTime } = generateMatchTime();
  const shuffledPlayers = shuffle(playerIds);
  const selectedIds = shuffledPlayers.slice(0, count);
  const waitlistCount = rnd(0, 3);
  const waitlistIds = shuffledPlayers.slice(count, count + waitlistCount);

  // Assign teams for matches in the past (more than 2 days ago)
  const isPast = date < new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000);
  const { teamWhite, teamBlack } = isPast ? assignTeams(selectedIds) : { teamWhite: [], teamBlack: [] };

  matches.push({
    date: toDateStr(date),
    time,
    end_time: endTime,
    venue: pick(VENUES),
    format,
    fee,
    player_ids: selectedIds,
    waitlist_ids: waitlistIds,
    team_white: teamWhite,
    team_black: teamBlack,
  });
}

// Sort matches by date
matches.sort((a, b) => a.date.localeCompare(b.date));

const { error: matchErr } = await supabase.from('matches').insert(matches);
if (matchErr) { console.error('❌ Matches error:', matchErr.message); process.exit(1); }
console.log(`✅ Inserted ${matches.length} matches`);
console.log('\n🎉 Seed complete!');
