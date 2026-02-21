import type { Player } from '../types';

interface PlayerCardProps {
  player: Player;
  onEdit: (player: Player) => void;
  onDelete: (id: string) => void;
}

function AttributeBar({ label, value, max = 10 }: { label: string; value: number; max?: number }) {
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

export function PlayerCard({ player, onEdit, onDelete }: PlayerCardProps) {
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

      <div className="player-card-actions">
        <button className="btn btn-secondary btn-sm" onClick={() => onEdit(player)}>✏️ Edit</button>
        <button className="btn btn-danger btn-sm" onClick={() => onDelete(player.id)}>🗑️ Delete</button>
      </div>
    </div>
  );
}
