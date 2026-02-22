import type { Player, Match } from '../types';

export function AttributeBar({ label, value, max = 10 }: { label: string; value: number; max?: number }) {
  const pct = (value / max) * 100;
  return (
    <div className="attr-row">
      <span className="attr-label">{label}</span>
      <div className="attr-bar-track">
        <div className="attr-bar-fill" style={{ width: `${pct}%` }} />
      </div>
      <span className="attr-value">{value}</span>
    </div>
  );
}

/** Compute last-5-match participation dots for a player. */
export function ParticipationDots({ playerId, recentMatches }: { playerId: string; recentMatches: Match[] }) {
  // Only matches that actually took place (teams assigned), sorted newest → oldest
  const played = recentMatches
    .filter((m) => m.teamWhite.length > 0)
    .sort((a, b) => b.date.localeCompare(a.date));
  // Take the 5 most recent, then reverse so display is oldest → newest (left → right)
  const last5 = played.slice(0, 5).reverse();
  // Pad to 5 slots with nulls if fewer than 5 matches
  const slots = Array.from({ length: 5 }, (_, i) => last5[i] ?? null);
  return (
    <div className="participation-row" title="Last 5 matches (oldest → newest)">
      {slots.map((m, i) => {
        if (!m) return <span key={i} className="part-dot part-empty">⬜</span>;
        const played = m.playerIds.includes(playerId);
        return (
          <span key={m.id} className="part-dot" title={m.date}>
            {played ? '✅' : '❌'}
          </span>
        );
      })}
    </div>
  );
}

interface PlayerCardProps {
  player: Player;
  recentMatches?: Match[];
  onEdit: (player: Player) => void;
  onDelete: (id: string) => void;
}

export function PlayerCard({ player, recentMatches, onEdit, onDelete }: PlayerCardProps) {
  const overall = (
    (player.skills + player.stamina + player.physicality + player.teamPlayer) / 4
  ).toFixed(1);

  const positionLabel =
    player.attackDefense <= 3 ? 'Defender' :
    player.attackDefense <= 6 ? 'Midfielder' : 'Attacker';

  return (
    <div className="player-card">
      <div className="player-card-header">
        <div>
          <h3 className="player-name">{player.name}</h3>
          <span className="position-badge">{positionLabel}</span>
        </div>
        <div className="player-overall">{overall}</div>
      </div>

      <div className="attrs">
        <AttributeBar label="⚔️ Atk/Def" value={player.attackDefense} />
        <AttributeBar label="💨 Stamina" value={player.stamina} />
        <AttributeBar label="🎯 Skills" value={player.skills} />
        <AttributeBar label="🤝 Team" value={player.teamPlayer} />
        <AttributeBar label="💪 Physique" value={player.physicality} />
      </div>

      {recentMatches !== undefined && (
        <ParticipationDots playerId={player.id} recentMatches={recentMatches} />
      )}

      <div className="player-card-actions">
        <button className="btn btn-secondary btn-sm" onClick={() => onEdit(player)}>✏️ Edit</button>
        <button className="btn btn-danger btn-sm" onClick={() => onDelete(player.id)}>🗑️ Delete</button>
      </div>
    </div>
  );
}
