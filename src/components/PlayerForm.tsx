import { useState, useEffect } from 'react';
import type { Player, GroupMode, Position } from '../types';
import { ATK_DEF_FOR_POSITION, positionFromAttackDefense } from '../types';

interface PlayerFormProps {
  mode?: GroupMode;
  initial: Player;
  onSave: (player: Player) => void;
  onCancel: () => void;
}

function Slider({
  label, name, value, min, max, onChange,
}: {
  label: string; name: string; value: number; min: number; max: number;
  onChange: (name: string, value: number) => void;
}) {
  return (
    <div className="form-group" onPointerDown={() => (document.activeElement as HTMLElement)?.blur()}>
      <div className="slider-header">
        <label className="form-label">{label}</label>
        <span className="slider-value">{value}</span>
      </div>
      {name === 'attackDefense' && (
        <div className="slider-extremes">
          <span>🛡️ Defensive</span>
          <span>⚽ Attacking</span>
        </div>
      )}
      <input
        type="range"
        className="slider"
        min={min}
        max={max}
        value={value}
        onChange={(e) => onChange(name, Number(e.target.value))}
      />
    </div>
  );
}

export function PlayerForm({ mode = 'advanced', initial, onSave, onCancel }: PlayerFormProps) {
  const [name, setName] = useState(initial.name);
  // Simplified mode state
  const [overall, setOverall] = useState(
    parseFloat(((initial.skills + initial.stamina + initial.physicality + initial.teamPlayer) / 4).toFixed(1))
  );
  const [position, setPosition] = useState<Position>(positionFromAttackDefense(initial.attackDefense));
  // Advanced mode state (sliders)
  const [form, setForm] = useState({
    attackDefense: initial.attackDefense,
    stamina: initial.stamina,
    skills: initial.skills,
    teamPlayer: initial.teamPlayer,
    physicality: initial.physicality,
  });

  useEffect(() => {
    setName(initial.name);
    setOverall(parseFloat(((initial.skills + initial.stamina + initial.physicality + initial.teamPlayer) / 4).toFixed(1)));
    setPosition(positionFromAttackDefense(initial.attackDefense));
    setForm({
      attackDefense: initial.attackDefense,
      stamina: initial.stamina,
      skills: initial.skills,
      teamPlayer: initial.teamPlayer,
      physicality: initial.physicality,
    });
  }, [initial]);

  function handleSlider(n: string, value: number) {
    setForm((prev) => ({ ...prev, [n]: value }));
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;

    let stats: Pick<Player, 'attackDefense' | 'stamina' | 'skills' | 'teamPlayer' | 'physicality'>;
    if (mode === 'simplified') {
      // Expand overall → uniform stats, position → attackDefense
      stats = {
        attackDefense: ATK_DEF_FOR_POSITION[position],
        stamina: overall,
        skills: overall,
        teamPlayer: overall,
        physicality: overall,
      };
    } else {
      stats = form;
    }

    onSave({
      ...initial,
      name: name.trim(),
      ...stats,
    });
  }

  return (
    <form className="player-form" onSubmit={handleSubmit}>
      <div className="form-group">
        <label className="form-label">Player Name</label>
        <input
          className="form-input"
          type="text"
          placeholder="Enter full name..."
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
        />
      </div>

      {mode === 'simplified' ? (
        <>
          {/* Overall rating */}
          <div className="form-group" onPointerDown={() => (document.activeElement as HTMLElement)?.blur()}>
            <div className="slider-header">
              <label className="form-label">⭐ Overall Rating</label>
              <span className="slider-value">{overall.toFixed(1)}</span>
            </div>
            <input
              type="range"
              className="slider"
              min={1}
              max={10}
              step={0.5}
              value={overall}
              onChange={(e) => setOverall(Number(e.target.value))}
            />
          </div>

          {/* Position picker */}
          <div className="form-group">
            <label className="form-label">🏃 Position</label>
            <div className="position-picker">
              {(['DEF', 'MID', 'ATT'] as Position[]).map((pos) => (
                <button
                  key={pos}
                  type="button"
                  className={`position-btn${position === pos ? ' active' : ''} position-btn-${pos.toLowerCase()}`}
                  onClick={() => setPosition(pos)}
                >
                  {pos === 'DEF' ? '🛡️ DEF' : pos === 'MID' ? '🔀 MID' : '⚡ ATT'}
                </button>
              ))}
            </div>
          </div>
        </>
      ) : (
        <>
          <Slider label="⚔️ Attack / Defense (0–10)" name="attackDefense" value={form.attackDefense} min={0} max={10} onChange={handleSlider} />
          <Slider label="💨 Stamina (1–10)" name="stamina" value={form.stamina} min={1} max={10} onChange={handleSlider} />
          <Slider label="🎯 Skills & Technicality (1–10)" name="skills" value={form.skills} min={1} max={10} onChange={handleSlider} />
          <Slider label="🤝 Team Player (1–10)" name="teamPlayer" value={form.teamPlayer} min={1} max={10} onChange={handleSlider} />
          <Slider label="💪 Physicality (1–10)" name="physicality" value={form.physicality} min={1} max={10} onChange={handleSlider} />
        </>
      )}

      <div className="form-actions">
        <button type="button" className="btn btn-secondary" onClick={onCancel}>Cancel</button>
        <button type="submit" className="btn btn-primary">
          {initial.name ? '💾 Save Changes' : '➕ Add Player'}
        </button>
      </div>
    </form>
  );
}
