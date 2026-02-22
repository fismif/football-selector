import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { getMatches, deleteMatch } from '../storage';
import { useToast } from '../components/Toast';
import type { Match } from '../types';
import { FORMAT_PLAYERS } from '../types';
import { format } from 'date-fns';

export function MatchesPage() {
  const [matches, setMatches] = useState<Match[]>([]);
  const [loading, setLoading] = useState(true);
  const { showToast } = useToast();

  const loadMatches = useCallback(async () => {
    try {
      setLoading(true);
      setMatches(await getMatches());
    } catch (e: unknown) {
      showToast(e instanceof Error ? e.message : 'Failed to load matches', 'error');
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => { loadMatches(); }, [loadMatches]);

  async function handleDelete(id: string) {
    const match = matches.find((m) => m.id === id);
    if (window.confirm(`Delete this match (${match?.date})?`)) {
      try {
        await deleteMatch(id);
        setMatches((prev) => prev.filter((m) => m.id !== id));
        showToast('Match deleted', 'error');
      } catch (e: unknown) {
        showToast(e instanceof Error ? e.message : 'Delete failed', 'error');
      }
    }
  }

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1 className="page-title">🗓️ Matches</h1>
          <p className="page-subtitle">{loading ? 'Loading…' : `${matches.length} matches scheduled`}</p>
        </div>
        <Link to="/matches/new" className="btn btn-primary">➕ New Match</Link>
      </div>

      {loading ? (
        <div className="empty-state"><div className="spinner" />Loading matches…</div>
      ) : matches.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">🗓️</div>
          <h3>No matches yet</h3>
          <p>Create your first match to get started.</p>
          <Link to="/matches/new" className="btn btn-primary">➕ New Match</Link>
        </div>
      ) : (
        <div className="match-list">
          {matches.map((m) => {
            const assigned = m.teamWhite.length > 0;
            let formattedDate = m.date;
            try {
              formattedDate = format(new Date(m.date + 'T00:00:00'), 'EEE, dd MMM yyyy');
            } catch { /* noop */ }

            return (
              <div key={m.id} className="match-card">
                <div className="match-card-left">
                  <div className="match-date-badge">
                    <span className="match-month">{m.date.slice(5, 7)}</span>
                    <span className="match-day">{m.date.slice(8, 10)}</span>
                  </div>
                </div>
                <div className="match-card-body">
                  <h3 className="match-venue">📍 {m.venue}</h3>
                  <div className="match-meta">
                    <span>📅 {formattedDate}</span>
                    <span>⏰ {m.time}</span>
                    <span>👥 {m.playerIds.length}/{FORMAT_PLAYERS[m.format ?? '7v7']} players</span>
                    {assigned && <span className="badge-assigned">✅ Teams assigned</span>}
                  </div>
                </div>
                <div className="match-card-actions">
                  <Link to={`/matches/${m.id}`} className="btn btn-secondary btn-sm">View</Link>
                  <button className="btn btn-danger btn-sm" onClick={() => handleDelete(m.id)}>🗑️</button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
