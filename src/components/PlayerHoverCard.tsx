import { useState, useEffect, useRef } from 'react';
import type { Player, Match } from '../types';
import { AttributeBar, ParticipationDots } from './PlayerCard';

interface HoverState {
  player: Player;
  anchorRect: DOMRect;
}

interface PlayerHoverCardProps {
  hoverState: HoverState | null;
  allMatches: Match[];
}

export function PlayerHoverCard({ hoverState, allMatches }: PlayerHoverCardProps) {
  const [visible, setVisible] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    if (hoverState) {
      timerRef.current = setTimeout(() => setVisible(true), 40);
    } else {
      setVisible(false);
    }
    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  }, [hoverState]);

  if (!hoverState) return null;

  const { player, anchorRect } = hoverState;
  const CARD_W = 264;
  const CARD_H = 300;
  const GAP = 10;

  // Prefer right; flip to left if near right edge
  let left = anchorRect.right + GAP;
  if (left + CARD_W > window.innerWidth - 8) {
    left = anchorRect.left - CARD_W - GAP;
  }
  // Prefer aligning to top of anchor; clamp to viewport
  let top = anchorRect.top;
  if (top + CARD_H > window.innerHeight - 8) {
    top = window.innerHeight - CARD_H - 8;
  }
  top = Math.max(8, top);

  const overall = (
    (player.skills + player.stamina + player.physicality + player.teamPlayer) / 4
  ).toFixed(1);
  const positionLabel =
    player.attackDefense <= 3 ? 'Defender' :
    player.attackDefense <= 6 ? 'Midfielder' : 'Attacker';

  return (
    <div
      className={`player-hover-card${visible ? ' visible' : ''}`}
      style={{ left, top }}
    >
      <div className="player-card-header" style={{ marginBottom: 12 }}>
        <div>
          <div className="player-name" style={{ fontSize: 15 }}>{player.name}</div>
          <span className="position-badge">{positionLabel}</span>
        </div>
        <div className="player-overall" style={{ fontSize: 22 }}>{overall}</div>
      </div>

      <div className="attrs">
        <AttributeBar label="⚔️ Atk/Def" value={player.attackDefense} />
        <AttributeBar label="💨 Stamina" value={player.stamina} />
        <AttributeBar label="🎯 Skills" value={player.skills} />
        <AttributeBar label="🤝 Team" value={player.teamPlayer} />
        <AttributeBar label="💪 Physique" value={player.physicality} />
      </div>

      <ParticipationDots playerId={player.id} recentMatches={allMatches} />
    </div>
  );
}

/** Hook to attach hover card handlers to any player list item */
export function useHoverCard() {
  const [hoverState, setHoverState] = useState<HoverState | null>(null);

  function onPlayerMouseEnter(player: Player, e: React.MouseEvent<HTMLElement>) {
    setHoverState({ player, anchorRect: e.currentTarget.getBoundingClientRect() });
  }
  function onPlayerMouseLeave() {
    setHoverState(null);
  }

  return { hoverState, onPlayerMouseEnter, onPlayerMouseLeave };
}
