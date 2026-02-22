import { useState, useEffect, useCallback, useMemo } from 'react';
import { getPlayers, getMatches } from '../storage';
import { useGroup } from '../context/GroupContext';
import { useToast } from '../components/Toast';
import type { Player, Match } from '../types';

const PAGE_SIZE = 10;

const FORMAT_OPTIONS = ['All', '4v4', '5v5', '6v6', '7v7'];

export function LoyaltyPage() {
  const group = useGroup();
  const { showToast } = useToast();

  const [players, setPlayers] = useState<Player[]>([]);
  const [matches, setMatches] = useState<Match[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [year, setYear] = useState<string>('All');
  const [format, setFormat] = useState<string>('All');
  // Player sort: 'played' (default, descending) or 'alpha' (A→Z)
  const [playerSort, setPlayerSort] = useState<'played' | 'alpha'>('played');

  // Pagination — page 0 = most recent 10
  const [page, setPage] = useState(0);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const [p, m] = await Promise.all([getPlayers(group.id), getMatches(group.id)]);
      setPlayers(p.sort((a, b) => a.name.localeCompare(b.name)));
      // Only matches where teams are actually assigned
      setMatches(m.filter((mx) => mx.teamWhite.length > 0));
    } catch (e: unknown) {
      showToast(e instanceof Error ? e.message : 'Failed to load', 'error');
    } finally {
      setLoading(false);
    }
  }, [group.id, showToast]);

  useEffect(() => { load(); }, [load]);

  // Available years from match data
  const years = useMemo(() => {
    const ys = new Set(matches.map((m) => m.date.slice(0, 4)));
    return ['All', ...Array.from(ys).sort((a, b) => b.localeCompare(a))];
  }, [matches]);

  // Apply filters then sort newest→oldest
  const filtered = useMemo(() => {
    return matches
      .filter((m) => {
        if (year !== 'All' && !m.date.startsWith(year)) return false;
        if (format !== 'All' && m.format !== format) return false;
        return true;
      })
      .sort((a, b) => b.date.localeCompare(a.date));
  }, [matches, year, format]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));

  // Page 0 = most recent 10; displayed left=oldest in page, right=most recent
  // Slice from the right end: page 0 → last PAGE_SIZE items
  const pageMatches = useMemo(() => {
    const start = Math.max(0, filtered.length - (page + 1) * PAGE_SIZE);
    const end = filtered.length - page * PAGE_SIZE;
    return filtered.slice(start, end).reverse(); // reverse so newest is rightmost
  }, [filtered, page]);

  function participationCell(player: Player, match: Match): '✅' | '❌' | '—' {
    const inMain = match.playerIds.includes(player.id);
    const inWait = match.waitlistIds.includes(player.id);
    const inTeam = match.teamWhite.includes(player.id) || match.teamBlack.includes(player.id);
    if (inTeam || inMain) return '✅';
    if (inWait) return '—'; // on waitlist counts as neither
    return '❌';
  }

  function playerParticipationCount(player: Player): number {
    return filtered.filter((m) => m.teamWhite.includes(player.id) || m.teamBlack.includes(player.id)).length;
  }

  const sortedPlayers = useMemo(() => {
    if (playerSort === 'alpha') return [...players]; // already sorted alpha on load
    return [...players].sort((a, b) => playerParticipationCount(b) - playerParticipationCount(a));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [players, playerSort, filtered]);

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1 className="page-title">🏆 Loyalty</h1>
          <p className="page-subtitle">
            {loading ? 'Loading…' : `${filtered.length} matches · ${players.length} players`}
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="loyalty-filters">
        <div className="loyalty-filter-group">
          <label className="loyalty-filter-label">Year</label>
          <div className="loyalty-filter-pills">
            {years.map((y) => (
              <button key={y} className={`sort-btn${year === y ? ' active' : ''}`}
                onClick={() => { setYear(y); setPage(0); }}>
                {y}
              </button>
            ))}
          </div>
        </div>
        <div className="loyalty-filter-group">
          <label className="loyalty-filter-label">Format</label>
          <div className="loyalty-filter-pills">
            {FORMAT_OPTIONS.map((f) => (
              <button key={f} className={`sort-btn${format === f ? ' active' : ''}`}
                onClick={() => { setFormat(f); setPage(0); }}>
                {f}
              </button>
            ))}
          </div>
        </div>
      </div>

      {loading ? (
        <div className="empty-state"><div className="spinner" />Loading…</div>
      ) : filtered.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">🏆</div>
          <h3>No matches found</h3>
          <p>Try adjusting the filters above.</p>
        </div>
      ) : (
        <>
          {/* Pagination controls */}
          <div className="loyalty-pagination">
            <button className="btn btn-secondary btn-sm"
              disabled={page >= totalPages - 1}
              onClick={() => setPage((p) => p + 1)}>
              ← Older
            </button>
            <span className="loyalty-page-label">
              {page === 0
                ? `Most recent ${Math.min(PAGE_SIZE, filtered.length)} of ${filtered.length}`
                : `${page * PAGE_SIZE + 1}–${Math.min((page + 1) * PAGE_SIZE, filtered.length)} of ${filtered.length}`}
            </span>
            <button className="btn btn-secondary btn-sm"
              disabled={page === 0}
              onClick={() => setPage((p) => p - 1)}>
              Newer →
            </button>
          </div>

          {/* Grid table */}
          <div className="loyalty-table-wrap">
            <table className="loyalty-table">
              <thead>
                <tr>
                  <th
                    className="loyalty-player-header loyalty-player-header-btn"
                    onClick={() => setPlayerSort((s) => s === 'alpha' ? 'played' : 'alpha')}
                    title="Click to toggle sort"
                  >
                    Player {playerSort === 'alpha' ? '↑ A-Z' : '🏅'}
                  </th>
                  <th className="loyalty-total-header" title="Total played in filtered matches">Played</th>
                  {pageMatches.map((m) => (
                    <th key={m.id} className="loyalty-match-header">
                      <span className="loyalty-match-date">{m.date.slice(5)}</span>
                      <span className="loyalty-match-fmt">{m.format ?? '7v7'}</span>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {sortedPlayers.map((p) => {
                  const total = playerParticipationCount(p);
                  const rate = filtered.length > 0 ? Math.round((total / filtered.length) * 100) : 0;
                  return (
                    <tr key={p.id} className="loyalty-row">
                      <td className="loyalty-player-cell">
                        <span className="loyalty-player-name">{p.name}</span>
                        <span className="loyalty-rate">{rate}%</span>
                      </td>
                      <td className="loyalty-total-cell">{total}</td>
                      {pageMatches.map((m) => {
                        const cell = participationCell(p, m);
                        return (
                          <td key={m.id} className={`loyalty-cell loyalty-cell-${cell === '✅' ? 'yes' : cell === '❌' ? 'no' : 'wait'}`}>
                            {cell}
                          </td>
                        );
                      })}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="loyalty-pagination">
            <button className="btn btn-secondary btn-sm"
              disabled={page >= totalPages - 1}
              onClick={() => setPage((p) => p + 1)}>
              ← Older
            </button>
            <span className="loyalty-page-label">Page {page + 1} / {totalPages}</span>
            <button className="btn btn-secondary btn-sm"
              disabled={page === 0}
              onClick={() => setPage((p) => p - 1)}>
              Newer →
            </button>
          </div>
        </>
      )}
    </div>
  );
}
