import { BrowserRouter, Routes, Route, Navigate, useParams, Link, NavLink } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { ToastProvider } from './components/Toast';
import { GroupContext } from './context/GroupContext';
import { GroupsPage } from './pages/GroupsPage';
import { PlayersPage } from './pages/PlayersPage';
import { MatchesPage } from './pages/MatchesPage';
import { MatchCreatePage } from './pages/MatchCreatePage';
import { MatchDetailPage } from './pages/MatchDetailPage';
import { LoyaltyPage } from './pages/LoyaltyPage';
import { getGroups } from './storage';
import type { Group } from './types';

// ── Group layout (Navbar + nested routes for one group) ──────────────────────
function GroupLayout() {
  const { groupId } = useParams<{ groupId: string }>();
  const [group, setGroup] = useState<Group | null>(null);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    if (!groupId) return;
    getGroups().then((gs) => {
      const g = gs.find((x) => x.id === groupId);
      if (g) setGroup(g);
      else setNotFound(true);
    });
  }, [groupId]);

  if (notFound) return (
    <div className="page"><div className="empty-state"><h3>Group not found</h3><Link to="/" className="btn btn-primary">Back to Groups</Link></div></div>
  );
  if (!group) return <div className="empty-state"><div className="spinner" /></div>;

  return (
    <GroupContext.Provider value={group}>
      <nav className="navbar">
        <div className="navbar-brand">
          <Link to="/" className="navbar-back">‹</Link>
          <span className="navbar-icon">⚽</span>
          <span className="navbar-title">{group.name}</span>
          <span className={`mode-badge mode-badge-${group.mode}`}>
            {group.mode === 'advanced' ? '🎮 Advanced' : '⚡ Simplified'}
          </span>
        </div>
        <div className="navbar-links">
          <NavLink to={`/groups/${group.id}/players`} className={({ isActive }) => isActive ? 'nav-link active' : 'nav-link'}>
            👤 Players
          </NavLink>
          <NavLink to={`/groups/${group.id}/matches`} className={({ isActive }) => isActive ? 'nav-link active' : 'nav-link'}>
            🗓️ Matches
          </NavLink>
          <NavLink to={`/groups/${group.id}/loyalty`} className={({ isActive }) => isActive ? 'nav-link active' : 'nav-link'}>
            🏆 Loyalty
          </NavLink>
        </div>
      </nav>
      <main className="main-content">
        <Routes>
          <Route path="players" element={<PlayersPage />} />
          <Route path="matches" element={<MatchesPage />} />
          <Route path="matches/new" element={<MatchCreatePage />} />
          <Route path="matches/:id" element={<MatchDetailPage />} />
          <Route path="loyalty" element={<LoyaltyPage />} />
          <Route path="" element={<Navigate to="matches" replace />} />
        </Routes>
      </main>
    </GroupContext.Provider>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <ToastProvider>
        <div className="app-layout">
          <Routes>
            <Route path="/" element={<><nav className="navbar"><div className="navbar-brand"><span className="navbar-icon">⚽</span><span className="navbar-title">Football Groups</span></div></nav><main className="main-content"><GroupsPage /></main></>} />
            <Route path="/groups/:groupId/*" element={<GroupLayout />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </div>
      </ToastProvider>
    </BrowserRouter>
  );
}
