import { useState, useEffect, useCallback } from 'react';
import { PlayerCard } from '../components/PlayerCard';
import { PlayerForm } from '../components/PlayerForm';
import { useToast } from '../components/Toast';
import { getPlayers, upsertPlayer, deletePlayer, getMatches } from '../storage';
import { useGroup } from '../context/GroupContext';
import type { Player, Match } from '../types';

export function PlayersPage() {
  const group = useGroup();
  const [players, setPlayers] = useState<Player[]>([]);
  const [matches, setMatches] = useState<Match[]>([]);
  const [loading, setLoading] = useState(true);
  const [editTarget, setEditTarget] = useState<Player | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [search, setSearch] = useState('');
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
      // Ensure groupId is set
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

  const filtered = players.filter((p) => p.name.toLowerCase().includes(search.toLowerCase()));

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
            <div className="search-bar">
              <span className="search-icon">🔍</span>
              <input className="form-input" type="text" placeholder="Search players…"
                value={search} onChange={(e) => setSearch(e.target.value)} />
            </div>
          )}
          {players.length === 0 ? (
            <div className="empty-state">
              <div className="empty-icon">⚽</div>
              <h3>No players yet</h3>
              <p>Add your first player to get started.</p>
              <button className="btn btn-primary" onClick={() => setShowForm(true)}>➕ Add Player</button>
            </div>
          ) : filtered.length === 0 ? (
            <div className="empty-state">
              <div className="empty-icon">🔍</div>
              <h3>No players found</h3>
              <p>Try a different search term.</p>
            </div>
          ) : (
            <div className="player-grid">
              {filtered.map((p) => (
                <PlayerCard key={p.id} player={p} mode={group.mode} recentMatches={matches} onEdit={handleEdit} onDelete={handleDelete} />
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
