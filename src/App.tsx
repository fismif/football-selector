import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Navbar } from './components/Navbar';
import { ToastProvider } from './components/Toast';
import { PlayersPage } from './pages/PlayersPage';
import { MatchesPage } from './pages/MatchesPage';
import { MatchCreatePage } from './pages/MatchCreatePage';
import { MatchDetailPage } from './pages/MatchDetailPage';

export default function App() {
  return (
    <BrowserRouter>
      <ToastProvider>
        <div className="app-layout">
          <Navbar />
          <main className="main-content">
            <Routes>
              <Route path="/" element={<Navigate to="/players" replace />} />
              <Route path="/players" element={<PlayersPage />} />
              <Route path="/matches" element={<MatchesPage />} />
              <Route path="/matches/new" element={<MatchCreatePage />} />
              <Route path="/matches/:id" element={<MatchDetailPage />} />
            </Routes>
          </main>
        </div>
      </ToastProvider>
    </BrowserRouter>
  );
}
