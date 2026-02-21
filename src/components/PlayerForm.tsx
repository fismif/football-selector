import { useState, useEffect } from 'react';
import type { Player } from '../types';

interface PlayerFormProps {
  initial?: Player;
  onSave: (player: Player) => void;
  onCancel: () => void;
}

const DEFAULTS = {
  name: '',
  attackDefense: 5,
  stamina: 7,
  skills: 7,
  teamPlayer: 7,
  physicality: 7,
};

function Slider({
  label, name, value, min, max, onChange,
}: {
  label: string; name: string; value: number; min: number; max: number;
  onChange: (name: string, value: number) => void;
}) {
  return (
    <div className="form-group">
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

export function PlayerForm({ initial, onSave, onCancel }: PlayerFormProps) {
  const [form, setForm] = useState({ ...DEFAULTS, ...initial });

  useEffect(() => {
    setForm({ ...DEFAULTS, ...initial });
  }, [initial]);

  function handleSlider(name: string, value: number) {
    setForm((prev) => ({ ...prev, [name]: value }));
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim()) return;
    onSave({
      id: initial?.id ?? crypto.randomUUID(),
      name: form.name.trim(),
      attackDefense: form.attackDefense,
      stamina: form.stamina,
      skills: form.skills,
      teamPlayer: form.teamPlayer,
      physicality: form.physicality,
      createdAt: initial?.createdAt ?? new Date().toISOString(),
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
          value={form.name}
          onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
          required
          autoFocus
        />
      </div>

      <Slider label="⚔️ Attack / Defense (0–10)" name="attackDefense" value={form.attackDefense} min={0} max={10} onChange={handleSlider} />
      <Slider label="💨 Stamina (1–10)" name="stamina" value={form.stamina} min={1} max={10} onChange={handleSlider} />
      <Slider label="🎯 Skills & Technicality (1–10)" name="skills" value={form.skills} min={1} max={10} onChange={handleSlider} />
      <Slider label="🤝 Team Player (1–10)" name="teamPlayer" value={form.teamPlayer} min={1} max={10} onChange={handleSlider} />
      <Slider label="💪 Physicality (1–10)" name="physicality" value={form.physicality} min={1} max={10} onChange={handleSlider} />

      <div className="form-actions">
        <button type="button" className="btn btn-secondary" onClick={onCancel}>Cancel</button>
        <button type="submit" className="btn btn-primary">
          {initial ? '💾 Save Changes' : '➕ Add Player'}
        </button>
      </div>
    </form>
  );
}
