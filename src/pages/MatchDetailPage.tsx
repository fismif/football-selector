import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import { getMatch, getPlayers, getMatches, upsertMatch } from '../storage';
import { assignTeams, teamAvg } from '../algorithm';
import { useToast } from '../components/Toast';
import { useGroup } from '../context/GroupContext';
import { PlayerHoverCard, useHoverCard } from '../components/PlayerHoverCard';
import type { Match, Player } from '../types';
import { FORMAT_PLAYERS } from '../types';
import { format } from 'date-fns';

// ── Albanian day names ─────────────────────────────────────────────────────
const ALBANIAN_DAYS: Record<number, string> = {
  0: 'E Diel', 1: 'E Hënë', 2: 'E Martë',
  3: 'E Mërkurë', 4: 'E Enjte', 5: 'E Premte', 6: 'E Shtunë',
};

type TeamSlot = 'white' | 'black' | 'waitlist';

// ── Team column with tap-to-select + tap-to-swap ────────────────────────────
function TeamColumn({ title, color, slot, playerIds: teamIds, allPlayers, allMatches, selectedPlayer, onPlayerClick }: {
  title: string;
  color: string;
  slot: TeamSlot;
  playerIds: string[];
  allPlayers: Player[];
  allMatches: Match[];
  selectedPlayer: { id: string; from: TeamSlot } | null;
  onPlayerClick: (id: string, from: TeamSlot) => void;
}) {
  const { hoverState, onPlayerMouseEnter, onPlayerMouseLeave } = useHoverCard();
  const players = teamIds.map((id) => allPlayers.find((p) => p.id === id)).filter(Boolean) as Player[];
  const avg = teamAvg(players);
  // This column contains swappable targets when a player from a different slot is selected
  const hasSwappableTargets = selectedPlayer && selectedPlayer.from !== slot;

  return (
    <>
      <div className={`team-column team-${color}${hasSwappableTargets ? ' team-targetable' : ''}`}>
        <h3 className="team-title">
          {color === 'white' ? '👕' : color === 'black' ? '🎽' : '⏳'} {title}
          {avg !== '—' && <span className="team-avg">⭐ {avg}</span>}
        </h3>
        <ol className="team-list">
          {players.map((p) => {
            const pos = p.attackDefense <= 3 ? '🛡️' : p.attackDefense <= 6 ? '🔀' : '⚡';
            const isSelected = selectedPlayer?.id === p.id;
            const isSwapTarget = !!(hasSwappableTargets && !isSelected);
            return (
              <li
                key={p.id}
                className={`team-list-item hoverable${isSelected ? ' team-item-selected' : ''}${isSwapTarget ? ' team-item-swappable' : ''}`}
                onClick={() => onPlayerClick(p.id, slot)}
                onMouseEnter={(e) => !isSelected && onPlayerMouseEnter(p, e)}
                onMouseLeave={onPlayerMouseLeave}
              >
                <span className="team-player-pos">{pos}</span>
                <span className="team-player-name">{p.name}</span>
                {isSwapTarget && <span className="swap-indicator">⇄</span>}
              </li>
            );
          })}
        </ol>
      </div>
      <PlayerHoverCard hoverState={hoverState} allMatches={allMatches} />
    </>
  );
}

// ── WhatsApp template ─────────────────────────────────────────────────────
function WhatsAppTemplate({ match, allPlayers }: { match: Match; allPlayers: Player[] }) {
  const { showToast } = useToast();

  let dayName = '';
  try { dayName = ALBANIAN_DAYS[new Date(match.date + 'T00:00:00').getDay()] ?? ''; } catch { /* noop */ }

  const feePerPlayer = match.fee > 0 ? Math.ceil(match.fee / (match.playerIds.length || 14)) : 0;

  const black = match.teamBlack
    .map((id) => allPlayers.find((p) => p.id === id)?.name ?? id)
    .sort((a, b) => a.localeCompare(b));
  const white = match.teamWhite
    .map((id) => allPlayers.find((p) => p.id === id)?.name ?? id)
    .sort((a, b) => a.localeCompare(b));

  const msg = [
    `*INFORMACIONE*`,
    ``,
    `📆⏲️ ${dayName}, *${match.time} - ${match.endTime}*`,
    `📍 ${match.venue}`,
    match.fee > 0 ? `💰 *${match.fee}€ fusha (~${feePerPlayer}€/person)*` : null,
    ``,
    `*RREGULLAT:*`,
    ``,
    `- *_Secili lojtar i cili vjen ne nje termin eshte i obliguar te tregoje sjellje njerezore dhe fair me te tjeret, qe nenkupton te zhvilloje loje me kujdes, pa tentuar t'i lendoj apo ofendoj ata. Nje sjellje jokonform kesaj rregulle pason me largim nga grupi._*`,
    ``,
    `- *Kush konfirmon e pastaj nuk lajmerohet qe nuk vjen deri para dites qe luhet termini ose nuk gjen zevendesues ate dite i heket mundesia pa perjashtim te jete pjese e grupit. Konfirmimi nenkupton votimin ne poll/shkrimin e emrit ne lista pas daljes se pollit*`,
    ``,
    `- *_Duhet te jeni 5 minuta para fillimit te terminit tek fusha, ne menyre qe te evitohen vonesat. Ne menyre qe te garantojme korrektesi per te gjithe pjesemarresit, mosrespektimi i kesaj rregulle sjell ne suspendim per 2 terminat e radhes. Thyerja e perseritur e kesaj rregulle pason me largim nga grupi._*`,
    ``,
    `*NDARJA E EKIPEVE*`,
    ``,
    `Ekipa 1 (ZI 🏴): ${black.join(', ')}`,
    ``,
    `Ekipa 2 (BARDH 🏳️): ${white.join(', ')}`,
    ``,
    `‼️ *Ju lutem ti veshni fanellat me ngjyra perkatese per loje me te pershtatshme. Gjithashtu, pagesen e parapare per termin ta keni me vete (cash).*‼️`,
  ].filter((line) => line !== null).join('\n');

  return (
    <div className="whatsapp-section">
      <div className="whatsapp-header">
        <h3>📲 WhatsApp Message</h3>
        <button className="btn btn-whatsapp"
          onClick={() => navigator.clipboard.writeText(msg).then(() => showToast('Mesazhi u kopjua!', 'info'))}>
          📋 Copy Message
        </button>
      </div>
      <pre className="whatsapp-preview">{msg}</pre>
    </div>
  );
}

// ── Drag-drop swap view (pre-assignment) ───────────────────────────────────
function SwapView({ match, allPlayers, allMatches, onSwap }: {
  match: Match;
  allPlayers: Player[];
  allMatches: Match[];
  onSwap: (newPlayerIds: string[], newWaitlistIds: string[]) => void;
}) {
  const dragRef = useRef<{ playerId: string; sourceList: 'main' | 'waitlist' } | null>(null);
  const [dragOver, setDragOver] = useState<string | null>(null);
  const { hoverState, onPlayerMouseEnter, onPlayerMouseLeave } = useHoverCard();

  function handleDragStart(e: React.DragEvent, playerId: string, sourceList: 'main' | 'waitlist') {
    dragRef.current = { playerId, sourceList };
    e.dataTransfer.effectAllowed = 'move';
    (e.currentTarget as HTMLElement).classList.add('dragging');
    onPlayerMouseLeave();
  }

  function handleDragEnd(e: React.DragEvent) {
    setDragOver(null);
    (e.currentTarget as HTMLElement).classList.remove('dragging');
  }

  function handleDrop(e: React.DragEvent, targetPlayerId: string, targetList: 'main' | 'waitlist') {
    e.preventDefault();
    setDragOver(null);
    if (!dragRef.current) return;
    const { playerId: sourceId, sourceList } = dragRef.current;
    if (sourceId === targetPlayerId || sourceList === targetList) return;

    let newMain = [...match.playerIds];
    let newWait = [...match.waitlistIds];

    if (sourceList === 'main' && targetList === 'waitlist') {
      newMain = newMain.map((id) => (id === sourceId ? targetPlayerId : id));
      newWait = newWait.map((id) => (id === targetPlayerId ? sourceId : id));
    } else if (sourceList === 'waitlist' && targetList === 'main') {
      newMain = newMain.map((id) => (id === targetPlayerId ? sourceId : id));
      newWait = newWait.map((id) => (id === sourceId ? targetPlayerId : id));
    }

    onSwap(newMain, newWait);
    dragRef.current = null;
  }

  function handleDropOnEmptyWaitlist(e: React.DragEvent) {
    e.preventDefault();
    if (!dragRef.current) return;
    const { playerId: sourceId, sourceList } = dragRef.current;
    if (sourceList !== 'main' || match.waitlistIds.length > 0) return;
    const newMain = match.playerIds.filter((id) => id !== sourceId);
    const newWait = [sourceId];
    onSwap(newMain, newWait);
    dragRef.current = null;
  }

  const renderPlayer = (pid: string, list: 'main' | 'waitlist') => {
    const p = allPlayers.find((pl) => pl.id === pid);
    const pos = p ? (p.attackDefense <= 3 ? '🛡️' : p.attackDefense <= 6 ? '🔀' : '⚡') : '•';
    return (
      <div
        key={pid}
        className={`draggable-player${dragOver === pid ? ' drag-over' : ''}`}
        draggable
        onDragStart={(e) => handleDragStart(e, pid, list)}
        onDragEnd={handleDragEnd}
        onDragOver={(e) => { e.preventDefault(); setDragOver(pid); }}
        onDragLeave={() => setDragOver(null)}
        onDrop={(e) => handleDrop(e, pid, list)}
        onMouseEnter={p ? (e) => onPlayerMouseEnter(p, e) : undefined}
        onMouseLeave={onPlayerMouseLeave}
      >
        <span className="drag-handle">⠿</span>
        <span className="draggable-pos">{pos}</span>
        <span className="draggable-name">{p?.name ?? '?'}</span>
      </div>
    );
  };

  return (
    <>
      <div className="swap-area">
        <div className="swap-list">
          <div className="swap-list-header">
            <span>👥 Main Squad</span>
            <span className="slot-count">{match.playerIds.length}</span>
          </div>
          <div className="swap-slots">
            {match.playerIds.map((pid) => renderPlayer(pid, 'main'))}
          </div>
        </div>

        <div className="swap-divider">⇄</div>

        <div className="swap-list">
          <div className="swap-list-header">
            <span>⏳ Waitlist</span>
            <span className="slot-count slot-full">{match.waitlistIds.length}</span>
          </div>
          <div
            className="swap-slots"
            onDragOver={(e) => e.preventDefault()}
            onDrop={handleDropOnEmptyWaitlist}
          >
            {match.waitlistIds.length === 0
              ? <div className="swap-empty-drop">Drop a player here to move to waitlist</div>
              : match.waitlistIds.map((pid) => renderPlayer(pid, 'waitlist'))
            }
          </div>
        </div>
      </div>
      <PlayerHoverCard hoverState={hoverState} allMatches={allMatches} />
    </>
  );
}

// ── Main page ──────────────────────────────────────────────────────────────
export function MatchDetailPage() {
  const { id } = useParams<{ id: string }>();
  const group = useGroup();
  const { showToast } = useToast();

  const [match, setMatch] = useState<Match | undefined>();
  const [allPlayers, setAllPlayers] = useState<Player[]>([]);
  const [allMatches, setAllMatches] = useState<Match[]>([]);
  const [loading, setLoading] = useState(true);
  const [assigning, setAssigning] = useState(false);
  const [selectedPlayer, setSelectedPlayer] = useState<{ id: string; from: TeamSlot } | null>(null);
  const [swapping, setSwapping] = useState(false);

  const loadData = useCallback(async () => {
    if (!id) return;
    try {
      setLoading(true);
      const [m, players, matches] = await Promise.all([getMatch(id), getPlayers(group.id), getMatches(group.id)]);
      setMatch(m);
      setAllPlayers(players);
      setAllMatches(matches.filter((mx) => mx.id !== id));
    } catch (e: unknown) {
      showToast(e instanceof Error ? e.message : 'Failed to load match', 'error');
    } finally {
      setLoading(false);
    }
  }, [id, group.id, showToast]);

  useEffect(() => { loadData(); }, [loadData]);

  if (loading) {
    return <div className="page"><div className="empty-state"><div className="spinner" />Loading match…</div></div>;
  }
  if (!match) {
    return (
      <div className="page">
        <div className="empty-state">
          <div className="empty-icon">🔍</div>
          <h3>Match not found</h3>
          <Link to={`/groups/${group.id}/matches`} className="btn btn-secondary">← Back to Matches</Link>
        </div>
      </div>
    );
  }

  let formattedDate = match.date;
  try { formattedDate = format(new Date(match.date + 'T00:00:00'), 'EEEE, dd MMMM yyyy'); } catch { /* noop */ }

  const assigned = match.teamWhite.length > 0;

  async function handleAssign() {
    if (!match) return;
    const requiredCount = FORMAT_PLAYERS[match.format ?? '7v7'];
    const selected = match.playerIds
      .map((pid) => allPlayers.find((p) => p.id === pid))
      .filter(Boolean) as Player[];

    if (selected.length !== requiredCount) {
      showToast(`Expected ${requiredCount} players for ${match.format}`, 'error');
      return;
    }
    setAssigning(true);
    try {
      const { teamWhite, teamBlack } = assignTeams(selected);
      const updated: Match = { ...match, teamWhite, teamBlack };
      await upsertMatch(updated);
      setMatch(updated);
      setSelectedPlayer(null);
      showToast('Teams assigned! ⚽');
    } catch (e: unknown) {
      showToast(e instanceof Error ? e.message : 'Assignment failed', 'error');
    } finally {
      setAssigning(false);
    }
  }

  /** Instant re-shuffle */
  async function handleReset() {
    if (!match) return;
    setAssigning(true);
    try {
      const selected = match.playerIds
        .map((pid) => allPlayers.find((p) => p.id === pid))
        .filter(Boolean) as Player[];
      const { teamWhite, teamBlack } = assignTeams(selected);
      const updated: Match = { ...match, teamWhite, teamBlack };
      await upsertMatch(updated);
      setMatch(updated);
      setSelectedPlayer(null);
      showToast('Teams reshuffled! 🔀');
    } catch (e: unknown) {
      showToast(e instanceof Error ? e.message : 'Reshuffle failed', 'error');
    } finally {
      setAssigning(false);
    }
  }

  /** True two-player swap: A goes to B's slot, B goes to A's slot */
  async function handleSwapPlayers(idA: string, fromA: TeamSlot, idB: string, fromB: TeamSlot) {
    if (!match || fromA === fromB) return;
    setSwapping(true);
    try {
      let { teamWhite, teamBlack, waitlistIds } = match;
      // Swap A ↔ B by replacing each in their respective list
      if (fromA === 'white') teamWhite = teamWhite.map((x) => x === idA ? idB : x);
      else if (fromA === 'black') teamBlack = teamBlack.map((x) => x === idA ? idB : x);
      else waitlistIds = waitlistIds.map((x) => x === idA ? idB : x);

      if (fromB === 'white') teamWhite = teamWhite.map((x) => x === idB ? idA : x);
      else if (fromB === 'black') teamBlack = teamBlack.map((x) => x === idB ? idA : x);
      else waitlistIds = waitlistIds.map((x) => x === idB ? idA : x);

      const updated: Match = { ...match, teamWhite, teamBlack, waitlistIds };
      await upsertMatch(updated);
      setMatch(updated);
      setSelectedPlayer(null);
    } catch (e: unknown) {
      showToast(e instanceof Error ? e.message : 'Swap failed', 'error');
    } finally {
      setSwapping(false);
    }
  }

  /** Tap a player: first tap selects, second tap on different team swaps them */
  function handlePlayerClick(id: string, from: TeamSlot) {
    if (!selectedPlayer) {
      setSelectedPlayer({ id, from });
    } else if (selectedPlayer.id === id) {
      setSelectedPlayer(null); // deselect same player
    } else if (selectedPlayer.from === from) {
      setSelectedPlayer({ id, from }); // change selection within same team
    } else {
      // Different team/slot — perform the swap
      handleSwapPlayers(selectedPlayer.id, selectedPlayer.from, id, from);
    }
  }

  async function handleSwap(newPlayerIds: string[], newWaitlistIds: string[]) {
    if (!match) return;
    try {
      const updated: Match = { ...match, playerIds: newPlayerIds, waitlistIds: newWaitlistIds };
      await upsertMatch(updated);
      setMatch(updated);
    } catch (e: unknown) {
      showToast(e instanceof Error ? e.message : 'Swap failed', 'error');
    }
  }

  const waitlistPlayers = match.waitlistIds
    .map((pid) => allPlayers.find((p) => p.id === pid))
    .filter(Boolean) as Player[];

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <Link to={`/groups/${group.id}/matches`} className="back-link">← Matches</Link>
          <h1 className="page-title">⚽ Match Details</h1>
        </div>
        {!assigned ? (
          <button className="btn btn-primary btn-assign" onClick={handleAssign} disabled={assigning}>
            {assigning ? '⏳ Assigning…' : '🤖 Assign Teams'}
          </button>
        ) : (
          <button className="btn btn-secondary" onClick={handleReset} disabled={assigning}>
            🔀 Re-shuffle
          </button>
        )}
      </div>

      {/* Match info card */}
      <div className="match-info-card">
        <div className="match-info-row">
          <span>📅 <strong>{formattedDate}</strong></span>
          <span>⏰ <strong>{match.time}{match.endTime ? ` – ${match.endTime}` : ''}</strong></span>
          <span>📍 <strong>{match.venue}</strong></span>
        </div>
        <div className="match-info-row">
          <span>⚽ <strong>{match.format ?? '7v7'}</strong></span>
          <span>👥 <strong>{match.playerIds.length} players</strong></span>
          {match.fee > 0 && (
            <span>💰 <strong>{match.fee}€</strong> (~{Math.ceil(match.fee / match.playerIds.length)}€/person)</span>
          )}
          {waitlistPlayers.length > 0 && <span>⏳ <strong>{waitlistPlayers.length} on waitlist</strong></span>}
          <span className={assigned ? 'status-assigned' : 'status-pending'}>
            {assigned ? '✅ Teams assigned' : '⏸️ Pending assignment'}
          </span>
        </div>
      </div>

      {/* Pre-assignment: drag-drop swap view */}
      {!assigned && (
        <div className="unassigned-hint">
          <p>
            👆 Click <strong>Assign Teams</strong> to auto-balance. Or <strong>drag players</strong> between
            the main squad and waitlist to adjust before assigning.
          </p>
          <SwapView
            match={match}
            allPlayers={allPlayers}
            allMatches={allMatches}
            onSwap={handleSwap}
          />
        </div>
      )}

      {/* Post-assignment: team columns with in-place tap-to-move */}
      {assigned && (
        <>
          {selectedPlayer && (
            <div className="swap-hint-banner">
              {swapping ? '⏳ Swapping…' : <>⇄ Now tap any player from the other team to swap with <strong>{allPlayers.find(p => p.id === selectedPlayer.id)?.name ?? '…'}</strong> — or tap them again to deselect</>}
            </div>
          )}
          <div className="teams-grid teams-grid-assigned">
            <TeamColumn
              title="White Team" color="white" slot="white"
              playerIds={match.teamWhite} allPlayers={allPlayers} allMatches={allMatches}
              selectedPlayer={selectedPlayer} onPlayerClick={handlePlayerClick}
            />
            <TeamColumn
              title="Black Team" color="black" slot="black"
              playerIds={match.teamBlack} allPlayers={allPlayers} allMatches={allMatches}
              selectedPlayer={selectedPlayer} onPlayerClick={handlePlayerClick}
            />
          </div>

          {/* Waitlist section — interactive for swaps */}
          {(waitlistPlayers.length > 0 || selectedPlayer) && (
            <TeamColumn
              title="Waitlist" color="wait" slot="waitlist"
              playerIds={match.waitlistIds} allPlayers={allPlayers} allMatches={allMatches}
              selectedPlayer={selectedPlayer} onPlayerClick={handlePlayerClick}
            />
          )}

          <WhatsAppTemplate match={match} allPlayers={allPlayers} />
        </>
      )}
    </div>
  );
}
