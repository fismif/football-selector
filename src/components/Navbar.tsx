import { NavLink } from 'react-router-dom';

export function Navbar() {
  return (
    <nav className="navbar">
      <div className="navbar-brand">
        <span className="navbar-icon">⚽</span>
        <span className="navbar-title">Football Group – ALB</span>
      </div>
      <div className="navbar-links">
        <NavLink to="/players" className={({ isActive }) => isActive ? 'nav-link active' : 'nav-link'}>
          👤 Players
        </NavLink>
        <NavLink to="/matches" className={({ isActive }) => isActive ? 'nav-link active' : 'nav-link'}>
          🗓️ Matches
        </NavLink>
      </div>
    </nav>
  );
}
