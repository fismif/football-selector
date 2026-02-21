# Football Group – ALB 🇦🇱

A lightweight web app for organising weekly football matches within a private group. Built to handle the full match lifecycle — from managing the player roster to generating a ready-to-paste WhatsApp announcement.

## What it does

### 👤 Player management
- Add, edit, and delete players from a shared roster
- Each player has five attributes rated 1–10:
  - **Skills** — technical ability
  - **Stamina** — endurance over the match
  - **Physicality** — strength and aerial ability
  - **Team Player** — tactical and cooperative play
  - **Attack / Defence** — positional tendency (0 = pure defender, 10 = pure attacker)

### 🗓️ Match management
- Create a match with date, start/end time, venue, and total field fee
- Select exactly 14 players from the roster (+ optional waitlist)
- Per-player fee is calculated automatically from the total

### 🤖 Automatic team balancing
- One click assigns players into two balanced teams of 7
- The algorithm uses composite player scores + simulated annealing to minimise the skill gap between teams
- Teams can be re-shuffled at any time

### 📲 WhatsApp message generator
- Generates a fully formatted Albanian-language match announcement
- Includes day name, time slot, venue, fee, team rosters (Ekipa ZI / Ekipa BARDH), and the group rules
- Copy to clipboard with one click — paste directly into WhatsApp

## Tech stack

| Layer | Technology |
|---|---|
| Frontend | React + TypeScript (Vite) |
| Database | Supabase (Postgres) |
| Hosting | Vercel |
| Team algorithm | Composite scoring + simulated annealing |

## Setup

```bash
# 1. Clone and install
npm install

# 2. Create .env (copy from .env.example)
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key

# 3. Run the SQL schema in Supabase SQL Editor (see below)

# 4. Start locally
npm run dev
```

### Supabase schema

```sql
create table players (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  attack_defense numeric not null default 5,
  stamina numeric not null default 7,
  skills numeric not null default 7,
  team_player numeric not null default 7,
  physicality numeric not null default 7,
  created_at timestamptz default now()
);

create table matches (
  id uuid primary key default gen_random_uuid(),
  date text not null,
  time text not null,
  end_time text default '',
  venue text not null,
  fee numeric default 0,
  player_ids text[] default '{}',
  waitlist_ids text[] default '{}',
  team_white text[] default '{}',
  team_black text[] default '{}',
  created_at timestamptz default now()
);

alter table players enable row level security;
alter table matches enable row level security;
create policy "public_all" on players for all using (true) with check (true);
create policy "public_all" on matches for all using (true) with check (true);
```

## Deploying to Vercel

1. Push this repo to GitHub
2. Import the repo at [vercel.com](https://vercel.com)
3. Add `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` as environment variables
4. Deploy — all group members share the same database via the public URL
