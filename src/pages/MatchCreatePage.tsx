import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { PlayerAutocomplete } from '../components/PlayerAutocomplete';
import { useToast } from '../components/Toast';
import { getPlayers, upsertMatch } from '../storage';
import { useGroup } from '../context/GroupContext';
import type { Match, Player, MatchFormat } from '../types';
import { FORMAT_PLAYERS } from '../types';

const FORMATS: MatchFormat[] = ['4v4', '5v5', '6v6', '7v7'];

export function MatchCreatePage() {
  const group = useGroup();
  const navigate = useNavigate();
  const { showToast } = useToast();

  const [allPlayers, setAllPlayers] = useState<Player[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const today = new Date().toISOString().slice(0, 10);
  const [date, setDate] = useState(today);
  const [time, setTime] = useState('20:00');
  const [endTime, setEndTime] = useState('21:00');
  const [venue, setVenue] = useState('');
  const [fee, setFee] = useState<number>(0);
  const [format, setFormat] = useState<MatchFormat>('7v7');
  const [playerIds, setPlayerIds] = useState<string[]>([]);
  const [waitlistIds, setWaitlistIds] = useState<string[]>([]);

  const requiredPlayers = FORMAT_PLAYERS[format];

  const showToastRef = useRef(showToast);
  useEffect(() => { showToastRef.current = showToast; });

  useEffect(() => {
    getPlayers(group.id)
      .then(setAllPlayers)
      .catch((e: unknown) => showToastRef.current(e instanceof Error ? e.message : 'Failed to load players', 'error'))
      .finally(() => setLoading(false));
  }, [group.id]);

  useEffect(() => {
    if (playerIds.length > requiredPlayers) {
      setPlayerIds((prev) => prev.slice(0, requiredPlayers));
    }
  }, [format, requiredPlayers, playerIds.length]);

  const feePerPlayer = playerIds.length > 0 ? Math.ceil(fee / playerIds.length) : 0;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!venue.trim()) return;
    if (playerIds.length !== requiredPlayers) {
      showToast(`Please select exactly ${requiredPlayers} players for ${format}`, 'error');
      return;
    }
    setSaving(true);
    try {
      const match: Match = {
        id: crypto.randomUUID(),
        groupId: group.id,
        date,
        time,
        endTime,
        venue: venue.trim(),
        fee,
        format,
        playerIds,
        waitlistIds,
        teamWhite: [],
        teamBlack: [],
        createdAt: new Date().toISOString(),
      };
      await upsertMatch(match);
      showToast('Match created!');
      navigate(`/groups/${group.id}/matches/${match.id}`);
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
          <p className="page-subtitle">Fill in details and select your players</p>
        </div>
      </div>

      {loading ? (
        <div className="empty-state"><div className="spinner" />Loading players…</div>
      ) : (
        <form className="match-form" onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">⚽ Format</label>
            <div className="format-picker">
              {FORMATS.map((f) => (
                <button key={f} type="button"
                  className={`format-btn${format === f ? ' active' : ''}`}
                  onClick={() => setFormat(f)}
                >
                  {f}
                  <span className="format-sub">{FORMAT_PLAYERS[f]} players</span>
                </button>
              ))}
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label className="form-label">📅 Date</label>
              <input className="form-input" type="date" value={date} onChange={(e) => setDate(e.target.value)} required />
            </div>
            <div className="form-group">
              <label className="form-label">⏰ Start Time</label>
              <input className="form-input" type="time" value={time} onChange={(e) => setTime(e.target.value)} required />
            </div>
            <div className="form-group">
              <label className="form-label">⏰ End Time</label>
              <input className="form-input" type="time" value={endTime} onChange={(e) => setEndTime(e.target.value)} required />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">📍 Venue</label>
            <input className="form-input" type="text" placeholder="e.g. Hopsagasse 5, 1200 Wien"
              value={venue} onChange={(e) => setVenue(e.target.value)} required />
          </div>

          <div className="form-row">
            <div className="form-group">
              <label className="form-label">💰 Total Fee (€)</label>
              <input className="form-input" type="number" min="0" step="1" placeholder="e.g. 65"
                value={fee || ''} onChange={(e) => setFee(Number(e.target.value))} />
            </div>
            <div className="form-group">
              <label className="form-label">👤 Per Player (€)</label>
              <div className="form-input fee-display">
                {playerIds.length > 0 ? `~${feePerPlayer}€ / person (${playerIds.length} players)` : `—`}
              </div>
            </div>
          </div>

          {allPlayers.length < requiredPlayers ? (
            <div className="warning-box">
              ⚠️ You need at least {requiredPlayers} players in the database for {format}. Currently you have {allPlayers.length}.
            </div>
          ) : (
            <>
              <PlayerAutocomplete
                players={allPlayers.filter((p) => !waitlistIds.includes(p.id))}
                selectedIds={playerIds}
                maxSelection={requiredPlayers}
                label={`👥 Players (${requiredPlayers} required for ${format})`}
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
            <button type="button" className="btn btn-secondary" onClick={() => navigate(`/groups/${group.id}/matches`)}>Cancel</button>
            <button type="submit" className="btn btn-primary"
              disabled={playerIds.length !== requiredPlayers || !venue.trim() || saving}>
              {saving ? '⏳ Creating…' : '🎮 Create Match'}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
