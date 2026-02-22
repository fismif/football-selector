import { supabase } from './supabase';
import type { Player, Match, MatchFormat, Group, GroupMode } from './types';

// ── helpers: map DB row (snake_case) ↔ app type (camelCase) ────────────────

function rowToGroup(row: Record<string, unknown>): Group {
  return {
    id: row.id as string,
    name: row.name as string,
    mode: (row.mode as GroupMode) ?? 'advanced',
    createdAt: row.created_at as string,
  };
}

function rowToPlayer(row: Record<string, unknown>): Player {
  return {
    id: row.id as string,
    groupId: (row.group_id as string) ?? '',
    name: row.name as string,
    attackDefense: row.attack_defense as number,
    stamina: row.stamina as number,
    skills: row.skills as number,
    teamPlayer: row.team_player as number,
    physicality: row.physicality as number,
    createdAt: row.created_at as string,
  };
}

function playerToRow(p: Player) {
  return {
    id: p.id,
    group_id: p.groupId,
    name: p.name,
    attack_defense: p.attackDefense,
    stamina: p.stamina,
    skills: p.skills,
    team_player: p.teamPlayer,
    physicality: p.physicality,
    created_at: p.createdAt,
  };
}

function rowToMatch(row: Record<string, unknown>): Match {
  return {
    id: row.id as string,
    groupId: (row.group_id as string) ?? '',
    date: row.date as string,
    time: row.time as string,
    endTime: (row.end_time as string) ?? '',
    venue: row.venue as string,
    fee: (row.fee as number) ?? 0,
    format: ((row.format as string) ?? '7v7') as MatchFormat,
    playerIds: (row.player_ids as string[]) ?? [],
    waitlistIds: (row.waitlist_ids as string[]) ?? [],
    teamWhite: (row.team_white as string[]) ?? [],
    teamBlack: (row.team_black as string[]) ?? [],
    createdAt: row.created_at as string,
  };
}

function matchToRow(m: Match) {
  return {
    id: m.id,
    group_id: m.groupId,
    date: m.date,
    time: m.time,
    end_time: m.endTime,
    venue: m.venue,
    fee: m.fee,
    format: m.format,
    player_ids: m.playerIds,
    waitlist_ids: m.waitlistIds,
    team_white: m.teamWhite,
    team_black: m.teamBlack,
    created_at: m.createdAt,
  };
}

// ── Groups ────────────────────────────────────────────────────────────────────

export async function getGroups(): Promise<Group[]> {
  const { data, error } = await supabase
    .from('groups')
    .select('*')
    .order('created_at', { ascending: true });
  if (error) throw error;
  return (data ?? []).map(rowToGroup);
}

export async function upsertGroup(group: Omit<Group, 'createdAt'>): Promise<Group> {
  const { data, error } = await supabase
    .from('groups')
    .upsert({ id: group.id, name: group.name, mode: group.mode }, { onConflict: 'id' })
    .select()
    .single();
  if (error) throw error;
  return rowToGroup(data);
}

export async function deleteGroup(id: string): Promise<void> {
  const { error } = await supabase.from('groups').delete().eq('id', id);
  if (error) throw error;
}

// ── Players ──────────────────────────────────────────────────────────────────

export async function getPlayers(groupId: string): Promise<Player[]> {
  const { data, error } = await supabase
    .from('players')
    .select('*')
    .eq('group_id', groupId)
    .order('created_at', { ascending: true });
  if (error) throw error;
  return (data ?? []).map(rowToPlayer);
}

export async function upsertPlayer(player: Player): Promise<void> {
  const { error } = await supabase
    .from('players')
    .upsert(playerToRow(player), { onConflict: 'id' });
  if (error) throw error;
}

export async function deletePlayer(id: string): Promise<void> {
  const { error } = await supabase.from('players').delete().eq('id', id);
  if (error) throw error;
}

// ── Matches ──────────────────────────────────────────────────────────────────

export async function getMatches(groupId: string): Promise<Match[]> {
  const { data, error } = await supabase
    .from('matches')
    .select('*')
    .eq('group_id', groupId)
    .order('date', { ascending: false });
  if (error) throw error;
  return (data ?? []).map(rowToMatch);
}

export async function getMatch(id: string): Promise<Match | undefined> {
  const { data, error } = await supabase
    .from('matches')
    .select('*')
    .eq('id', id)
    .single();
  if (error) {
    if (error.code === 'PGRST116') return undefined; // not found
    throw error;
  }
  return data ? rowToMatch(data) : undefined;
}

export async function upsertMatch(match: Match): Promise<void> {
  const { error } = await supabase
    .from('matches')
    .upsert(matchToRow(match), { onConflict: 'id' });
  if (error) throw error;
}

export async function deleteMatch(id: string): Promise<void> {
  const { error } = await supabase.from('matches').delete().eq('id', id);
  if (error) throw error;
}
