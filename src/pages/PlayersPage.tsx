import { useState, useEffect, useCallback, useMemo } from 'react';
import { PlayerCard } from '../components/PlayerCard';
import { PlayerForm } from '../components/PlayerForm';
import { useToast } from '../components/Toast';
import { getPlayers, upsertPlayer, deletePlayer, getMatches } from '../storage';
import { useGroup } from '../context/GroupContext';
import type { Player, Match } from '../types';
import { positionFromAttackDefense } from '../types';

// ── Sort helpers ──────────────────────────────────────────────────────────────
type SortKey = 'rating-desc' | 'rating-asc' | 'participation' | 'position' | 'alpha-asc' | 'alpha-desc';

const SORT_OPTIONS: { key: SortKey; label: string }[] = [
  { key: 'rating-desc', label: '⭐ Rating ↓' },
  { key: 'rating-asc',  label: '⭐ Rating ↑' },
  { key: 'participation', label: '📊 Participations' },
  { key: 'position',    label: '🏃 Position' },
  { key: 'alpha-asc',  label: '🔤 A → Z' },
  { key: 'alpha-desc', label: '🔤 Z → A' },
];

const POSITION_ORDER: Record<string, number> = { DEF: 0, MID: 1, ATT: 2 };

function playerOverall(p: Player) {
  return (p.skills + p.stamina + p.physicality + p.teamPlayer) / 4;
}

function participationCount(playerId: string, matches: Match[]): number {
  const played = matches
    .filter((m) => m.teamWhite.length > 0)
    .sort((a, b) => b.date.localeCompare(a.date))
    .slice(0, 5);
  return played.filter((m) => m.playerIds.includes(playerId)).length;
}

// ─────────────────────────────────────────────────────────────────────────────

export function PlayersPage() {
  const group = useGroup();
  const [players, setPlayers] = useState<Player[]>([]);
  const [matches, setMatches] = useState<Match[]>([]);
  const [loading, setLoading] = useState(true);
  const [editTarget, setEditTarget] = useState<Player | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [search, setSearch] = useState('');
  const [sortKey, setSortKey] = useState<SortKey>('rating-desc');
  const { showToast } = useToast();

  const refresh = useCallback(async () => {
    try {
      setLoading(true);
      const [p, m] = await Promise.all([getPlayers(group.id), getMatches(group.id)]);
      setPlayers(p);
      setMatches(m);
    } catch (e: unknown) {
      showToast(e instanceof Error ? e.message : 'Failed to load players', 'error');
    } finally {
      setLoading(false);
    }
  }, [group.id, showToast]);

  useEffect(() => { refresh(); }, [refresh]);

  async function handleSave(player: Player) {
    try {
      await upsertPlayer({ ...player, groupId: group.id });
      await refresh();
      setShowForm(false);
      setEditTarget(null);
      showToast(editTarget ? `${player.name} updated!` : `${player.name} added!`);
    } catch (e: unknown) {
      showToast(e instanceof Error ? e.message : 'Save failed', 'error');
    }
  }

  async function handleDelete(id: string) {
    const player = players.find((p) => p.id === id);
    if (window.confirm(`Delete ${player?.name}?`)) {
      try {
        await deletePlayer(id);
        await refresh();
        showToast(`${player?.name} deleted`, 'error');
      } catch (e: unknown) {
        showToast(e instanceof Error ? e.message : 'Delete failed', 'error');
      }
    }
  }

  function handleEdit(player: Player) {
    setEditTarget(player);
    setShowForm(true);
  }

  function buildNewPlayer(): Player {
    return {
      id: crypto.randomUUID(),
      groupId: group.id,
      name: '',
      attackDefense: 5,
      stamina: 7,
      skills: 7,
      teamPlayer: 7,
      physicality: 7,
      createdAt: new Date().toISOString(),
    };
  }

  // Filter then sort
  const sorted = useMemo(() => {
    const filtered = players.filter((p) =>
      p.name.toLowerCase().includes(search.toLowerCase())
    );

    if (group.mode !== 'simplified') return filtered; // no custom sort in advanced mode

    return [...filtered].sort((a, b) => {
      switch (sortKey) {
        case 'rating-desc': return playerOverall(b) - playerOverall(a);
        case 'rating-asc':  return playerOverall(a) - playerOverall(b);
        case 'participation': {
          const pA = participationCount(a.id, matches);
          const pB = participationCount(b.id, matches);
          return pB - pA; // most participations first
        }
        case 'position': {
          const posA = POSITION_ORDER[positionFromAttackDefense(a.attackDefense)] ?? 0;
          const posB = POSITION_ORDER[positionFromAttackDefense(b.attackDefense)] ?? 0;
          return posA !== posB ? posA - posB : playerOverall(b) - playerOverall(a);
        }
        case 'alpha-asc':  return a.name.localeCompare(b.name);
        case 'alpha-desc': return b.name.localeCompare(a.name);
        default: return 0;
      }
    });
  }, [players, search, sortKey, matches, group.mode]);

  const isSimplified = group.mode === 'simplified';

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1 className="page-title">👤 Players</h1>
          <p className="page-subtitle">{loading ? 'Loading…' : `${players.length} players in your squad`}</p>
        </div>
        <button className="btn btn-primary" onClick={() => { setEditTarget(null); setShowForm(true); }}>
          ➕ Add Player
        </button>
      </div>

      {showForm && (
        <div className="modal-overlay" onClick={() => { setShowForm(false); setEditTarget(null); }}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{editTarget ? '✏️ Edit Player' : '➕ New Player'}</h2>
              <button className="modal-close" onClick={() => { setShowForm(false); setEditTarget(null); }}>×</button>
            </div>
            <PlayerForm
              mode={group.mode}
              initial={editTarget ?? buildNewPlayer()}
              onSave={handleSave}
              onCancel={() => { setShowForm(false); setEditTarget(null); }}
            />
          </div>
        </div>
      )}

      {loading ? (
        <div className="empty-state"><div className="spinner" />Loading players…</div>
      ) : (
        <>
          {players.length > 0 && (
            <>
              {/* Search bar */}
              <div className="search-bar">
                <span className="search-icon">🔍</span>
                <input className="form-input" type="text" placeholder="Search players…"
                  value={search} onChange={(e) => setSearch(e.target.value)} />
              </div>

              {/* Sort bar — simplified mode only */}
              {isSimplified && (
                <div className="sort-bar">
                  {SORT_OPTIONS.map((opt) => (
                    <button
                      key={opt.key}
                      className={`sort-btn${sortKey === opt.key ? ' active' : ''}`}
                      onClick={() => setSortKey(opt.key)}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              )}
            </>
          )}

          {players.length === 0 ? (
            <div className="empty-state">
              <div className="empty-icon">⚽</div>
              <h3>No players yet</h3>
              <p>Add your first player to get started.</p>
              <button className="btn btn-primary" onClick={() => setShowForm(true)}>➕ Add Player</button>
            </div>
          ) : sorted.length === 0 ? (
            <div className="empty-state">
              <div className="empty-icon">🔍</div>
              <h3>No players found</h3>
              <p>Try a different search term.</p>
            </div>
          ) : (
            <div className="player-grid">
              {sorted.map((p) => (
                <PlayerCard key={p.id} player={p} mode={group.mode} recentMatches={matches} onEdit={handleEdit} onDelete={handleDelete} />
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
