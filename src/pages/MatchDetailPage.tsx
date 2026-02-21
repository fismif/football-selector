import { useState, useEffect, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import { getMatch, getPlayers, upsertMatch } from '../storage';
import { assignTeams } from '../algorithm';
import { useToast } from '../components/Toast';
import type { Match, Player } from '../types';
import { format } from 'date-fns';

function TeamColumn({ title, color, playerIds, allPlayers }: {
  title: string; color: string; playerIds: string[]; allPlayers: Player[];
}) {
  const players = playerIds.map((id) => allPlayers.find((p) => p.id === id)).filter(Boolean) as Player[];
  return (
    <div className={`team-column team-${color}`}>
      <h3 className="team-title">
        {color === 'white' ? '👕' : '🎽'} {title}
      </h3>
      <ol className="team-list">
        {players.map((p) => {
          const pos = p.attackDefense <= 3 ? '🛡️' : p.attackDefense <= 6 ? '🔀' : '⚡';
          return (
            <li key={p.id} className="team-list-item">
              <span className="team-player-pos">{pos}</span>
              <span className="team-player-name">{p.name}</span>
            </li>
          );
        })}
      </ol>
    </div>
  );
}

function WhatsAppTemplate({ match, allPlayers }: { match: Match; allPlayers: Player[] }) {
  const { showToast } = useToast();

  let formattedDate = match.date;
  try {
    formattedDate = format(new Date(match.date + 'T00:00:00'), 'EEEE, dd MMMM yyyy');
  } catch { /* noop */ }

  const white = match.teamWhite.map((id) => allPlayers.find((p) => p.id === id)?.name ?? id);
  const black = match.teamBlack.map((id) => allPlayers.find((p) => p.id === id)?.name ?? id);
  const waitlist = match.waitlistIds.map((id) => allPlayers.find((p) => p.id === id)?.name ?? id);

  const msg = [
    `⚽ *Football – ${formattedDate} @ ${match.time}*`,
    `📍 *Venue:* ${match.venue}`,
    ``,
    `👕 *White Team*`,
    white.map((n, i) => `${i + 1}. ${n}`).join('\n'),
    ``,
    `🎽 *Black Team*`,
    black.map((n, i) => `${i + 1}. ${n}`).join('\n'),
    waitlist.length > 0 ? `\n⏳ *Waiting List*\n${waitlist.map((n, i) => `${i + 1}. ${n}`).join('\n')}` : '',
    ``,
    `🏃 See you on the pitch! Let's go! 💪`,
  ].join('\n');

  function copy() {
    navigator.clipboard.writeText(msg).then(() => showToast('Message copied to clipboard!', 'info'));
  }

  return (
    <div className="whatsapp-section">
      <div className="whatsapp-header">
        <h3>📲 WhatsApp Message</h3>
        <button className="btn btn-whatsapp" onClick={copy}>📋 Copy Message</button>
      </div>
      <pre className="whatsapp-preview">{msg}</pre>
    </div>
  );
}

export function MatchDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { showToast } = useToast();

  const [match, setMatch] = useState<Match | undefined>();
  const [allPlayers, setAllPlayers] = useState<Player[]>([]);
  const [loading, setLoading] = useState(true);
  const [assigning, setAssigning] = useState(false);

  const loadData = useCallback(async () => {
    if (!id) return;
    try {
      setLoading(true);
      const [m, players] = await Promise.all([getMatch(id), getPlayers()]);
      setMatch(m);
      setAllPlayers(players);
    } catch (e: unknown) {
      showToast(e instanceof Error ? e.message : 'Failed to load match', 'error');
    } finally {
      setLoading(false);
    }
  }, [id, showToast]);

  useEffect(() => { loadData(); }, [loadData]);

  if (loading) {
    return (
      <div className="page">
        <div className="empty-state"><div className="spinner" />Loading match…</div>
      </div>
    );
  }

  if (!match) {
    return (
      <div className="page">
        <div className="empty-state">
          <div className="empty-icon">🔍</div>
          <h3>Match not found</h3>
          <Link to="/matches" className="btn btn-secondary">← Back to Matches</Link>
        </div>
      </div>
    );
  }

  let formattedDate = match.date;
  try {
    formattedDate = format(new Date(match.date + 'T00:00:00'), 'EEEE, dd MMMM yyyy');
  } catch { /* noop */ }

  const assigned = match.teamWhite.length > 0;

  async function handleAssign() {
    if (!match) return;
    const selected = match.playerIds
      .map((pid) => allPlayers.find((p) => p.id === pid))
      .filter(Boolean) as Player[];

    if (selected.length !== 14) {
      showToast('Cannot assign: less than 14 players found in DB', 'error');
      return;
    }

    setAssigning(true);
    try {
      const { teamWhite, teamBlack } = assignTeams(selected);
      const updated: Match = { ...match, teamWhite, teamBlack };
      await upsertMatch(updated);
      setMatch(updated);
      showToast('Teams assigned successfully! ⚽');
    } catch (e: unknown) {
      showToast(e instanceof Error ? e.message : 'Assignment failed', 'error');
    } finally {
      setAssigning(false);
    }
  }

  async function handleReassign() {
    if (window.confirm('Re-shuffle teams? This will create a new random assignment.')) {
      await handleAssign();
    }
  }

  const waitlistPlayers = match.waitlistIds
    .map((pid) => allPlayers.find((p) => p.id === pid))
    .filter(Boolean) as Player[];

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <Link to="/matches" className="back-link">← Matches</Link>
          <h1 className="page-title">⚽ Match Details</h1>
        </div>
        {!assigned ? (
          <button className="btn btn-primary btn-assign" onClick={handleAssign} disabled={assigning}>
            {assigning ? '⏳ Assigning…' : '🤖 Assign Teams'}
          </button>
        ) : (
          <button className="btn btn-secondary" onClick={handleReassign} disabled={assigning}>
            🔀 Re-shuffle
          </button>
        )}
      </div>

      <div className="match-info-card">
        <div className="match-info-row">
          <span>📅 <strong>{formattedDate}</strong></span>
          <span>⏰ <strong>{match.time}</strong></span>
          <span>📍 <strong>{match.venue}</strong></span>
        </div>
        <div className="match-info-row">
          <span>👥 <strong>{match.playerIds.length} players</strong></span>
          {waitlistPlayers.length > 0 && <span>⏳ <strong>{waitlistPlayers.length} on waitlist</strong></span>}
          <span className={assigned ? 'status-assigned' : 'status-pending'}>
            {assigned ? '✅ Teams assigned' : '⏸️ Teams not yet assigned'}
          </span>
        </div>
      </div>

      {!assigned && (
        <div className="unassigned-hint">
          <p>👆 Click <strong>Assign Teams</strong> to automatically balance the two teams using player attributes.</p>
          <div className="all-players-list">
            {match.playerIds.map((pid, i) => {
              const p = allPlayers.find((pl) => pl.id === pid);
              return <span key={pid} className="player-tag">{i + 1}. {p?.name ?? '?'}</span>;
            })}
          </div>
        </div>
      )}

      {assigned && (
        <>
          <div className="teams-grid">
            <TeamColumn title="White Team" color="white" playerIds={match.teamWhite} allPlayers={allPlayers} />
            <TeamColumn title="Black Team" color="black" playerIds={match.teamBlack} allPlayers={allPlayers} />
          </div>

          {waitlistPlayers.length > 0 && (
            <div className="waitlist-section">
              <h3>⏳ Waiting List</h3>
              <div className="team-list">
                {waitlistPlayers.map((p, i) => (
                  <span key={p.id} className="player-tag">{i + 1}. {p.name}</span>
                ))}
              </div>
            </div>
          )}

          <WhatsAppTemplate match={match} allPlayers={allPlayers} />
        </>
      )}
    </div>
  );
}
