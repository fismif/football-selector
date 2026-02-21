import { useState, useRef, useEffect } from 'react';
import Fuse from 'fuse.js';
import type { Player } from '../types';

interface PlayerAutocompleteProps {
  players: Player[];
  selectedIds: string[];
  maxSelection: number;
  label: string;
  placeholder?: string;
  onSelect: (id: string) => void;
  onRemove: (id: string) => void;
}

export function PlayerAutocomplete({
  players,
  selectedIds,
  maxSelection,
  label,
  placeholder = 'Search player...',
  onSelect,
  onRemove,
}: PlayerAutocompleteProps) {
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const available = players.filter((p) => !selectedIds.includes(p.id));
  const fuse = new Fuse(available, { keys: ['name'], threshold: 0.4 });
  const results = query ? fuse.search(query).map((r) => r.item) : available.slice(0, 8);

  const selectedPlayers = selectedIds.map((id) => players.find((p) => p.id === id)).filter(Boolean) as Player[];

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  function handleSelect(id: string) {
    if (selectedIds.length >= maxSelection) return;
    onSelect(id);
    setQuery('');
    setOpen(false);
  }

  return (
    <div className="autocomplete-wrapper" ref={containerRef}>
      <div className="autocomplete-header">
        <label className="form-label">{label}</label>
        <span className={`slot-count ${selectedIds.length >= maxSelection ? 'slot-full' : ''}`}>
          {selectedIds.length}/{maxSelection}
        </span>
      </div>

      <div className="selected-tags">
        {selectedPlayers.map((p, idx) => (
          <span key={p.id} className="player-tag">
            <span className="tag-num">{idx + 1}</span>
            {p.name}
            <button className="tag-remove" onClick={() => onRemove(p.id)}>×</button>
          </span>
        ))}
      </div>

      {selectedIds.length < maxSelection && (
        <div className="autocomplete-input-wrap">
          <input
            className="form-input"
            type="text"
            placeholder={placeholder}
            value={query}
            onChange={(e) => { setQuery(e.target.value); setOpen(true); }}
            onFocus={() => setOpen(true)}
          />
          {open && results.length > 0 && (
            <ul className="autocomplete-dropdown">
              {results.map((p) => (
                <li key={p.id} className="autocomplete-item" onMouseDown={() => handleSelect(p.id)}>
                  <span className="ac-name">{p.name}</span>
                  <span className="ac-info">
                    {p.attackDefense <= 3 ? '🛡️ Def' : p.attackDefense <= 6 ? '🔀 Mid' : '⚡ Att'}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
