import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { PlayerAutocomplete } from '../components/PlayerAutocomplete';
import { useToast } from '../components/Toast';
import { getPlayers, upsertMatch } from '../storage';
import type { Match, Player } from '../types';

export function MatchCreatePage() {
  const navigate = useNavigate();
  const { showToast } = useToast();

  const [allPlayers, setAllPlayers] = useState<Player[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const today = new Date().toISOString().slice(0, 10);
  const [date, setDate] = useState(today);
  const [time, setTime] = useState('10:00');
  const [venue, setVenue] = useState('');
  const [playerIds, setPlayerIds] = useState<string[]>([]);
  const [waitlistIds, setWaitlistIds] = useState<string[]>([]);

  const showToastRef = useRef(showToast);
  useEffect(() => { showToastRef.current = showToast; });

  useEffect(() => {
    getPlayers()
      .then(setAllPlayers)
      .catch((e: unknown) => showToastRef.current(e instanceof Error ? e.message : 'Failed to load players', 'error'))
      .finally(() => setLoading(false));
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!venue.trim()) return;
    if (playerIds.length !== 14) {
      showToast('Please select exactly 14 players', 'error');
      return;
    }
    setSaving(true);
    try {
      const match: Match = {
        id: crypto.randomUUID(),
        date,
        time,
        venue: venue.trim(),
        playerIds,
        waitlistIds,
        teamWhite: [],
        teamBlack: [],
        createdAt: new Date().toISOString(),
      };
      await upsertMatch(match);
      showToast('Match created!');
      navigate(`/matches/${match.id}`);
    } catch (e: unknown) {
      showToast(e instanceof Error ? e.message : 'Save failed', 'error');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1 className="page-title">➕ New Match</h1>
          <p className="page-subtitle">Fill in details and select your 14 players</p>
        </div>
      </div>

      {loading ? (
        <div className="empty-state"><div className="spinner" />Loading players…</div>
      ) : (
        <form className="match-form" onSubmit={handleSubmit}>
          <div className="form-row">
            <div className="form-group">
              <label className="form-label">📅 Date</label>
              <input className="form-input" type="date" value={date} onChange={(e) => setDate(e.target.value)} required />
            </div>
            <div className="form-group">
              <label className="form-label">⏰ Time</label>
              <input className="form-input" type="time" value={time} onChange={(e) => setTime(e.target.value)} required />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">📍 Venue</label>
            <input className="form-input" type="text" placeholder="e.g. City Park Pitch 1"
              value={venue} onChange={(e) => setVenue(e.target.value)} required />
          </div>

          {allPlayers.length < 14 ? (
            <div className="warning-box">
              ⚠️ You need at least 14 players in the database. Currently you have {allPlayers.length}.
            </div>
          ) : (
            <>
              <PlayerAutocomplete
                players={allPlayers.filter((p) => !waitlistIds.includes(p.id))}
                selectedIds={playerIds}
                maxSelection={14}
                label="👥 Players (14 required)"
                placeholder="Search and add player…"
                onSelect={(id) => setPlayerIds((prev) => [...prev, id])}
                onRemove={(id) => setPlayerIds((prev) => prev.filter((x) => x !== id))}
              />
              <PlayerAutocomplete
                players={allPlayers.filter((p) => !playerIds.includes(p.id))}
                selectedIds={waitlistIds}
                maxSelection={10}
                label="⏳ Waiting List (optional)"
                placeholder="Search and add to waitlist…"
                onSelect={(id) => setWaitlistIds((prev) => [...prev, id])}
                onRemove={(id) => setWaitlistIds((prev) => prev.filter((x) => x !== id))}
              />
            </>
          )}

          <div className="form-actions">
            <button type="button" className="btn btn-secondary" onClick={() => navigate('/matches')}>Cancel</button>
            <button type="submit" className="btn btn-primary"
              disabled={playerIds.length !== 14 || !venue.trim() || saving}>
              {saving ? '⏳ Creating…' : '🎮 Create Match'}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
