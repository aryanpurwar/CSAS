import { useState } from 'react';
import { NavLink, Outlet, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import Icon from './ui/Icon';
import './AppShell.css';

const trainingNav = [
  { to: '/dashboard', label: 'Dashboard', icon: 'dashboard' },
  { to: '/train/phishing', label: 'Phishing inspector', icon: 'mail' },
  { to: '/train/social', label: 'Social engineering', icon: 'phone' },
  { to: '/train/quiz', label: 'Quiz', icon: 'quiz' },
  { to: '/train/password', label: 'Password lab', icon: 'key' },
  { to: '/inbox', label: 'Inbox', icon: 'inbox' },
];
const studyNav = [
  { to: '/study', label: 'Research study', icon: 'book' },
  { to: '/leaderboard', label: 'Leaderboard', icon: 'trophy', gamifiedOnly: true },
];
const adminNav = [
  { to: '/admin', label: 'Overview', icon: 'chart', end: true },
  { to: '/admin/users', label: 'Participants', icon: 'users' },
  { to: '/admin/content', label: 'Content', icon: 'book' },
  { to: '/admin/campaigns', label: 'Campaigns', icon: 'target' },
  { to: '/admin/study', label: 'Study results', icon: 'spark' },
];

function Brand() {
  return (
    <div className="brand">
      <span className="brand-mark"><Icon name="shield" size={20} /></span>
      <span className="brand-text">
        <strong>CSAS</strong>
        <small>Awareness System</small>
      </span>
    </div>
  );
}

function NavGroup({ title, items, user, onNavigate }) {
  const visible = items.filter((i) => !i.gamifiedOnly || user?.gamified);
  if (!visible.length) return null;
  return (
    <div className="nav-group">
      <p className="nav-title">{title}</p>
      {visible.map((item) => (
        <NavLink
          key={item.to}
          to={item.to}
          end={item.end}
          onClick={onNavigate}
          className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
        >
          <Icon name={item.icon} size={18} />
          <span>{item.label}</span>
        </NavLink>
      ))}
    </div>
  );
}

export default function AppShell() {
  const { user, logout, isAdmin } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [open, setOpen] = useState(false);

  const close = () => setOpen(false);
  const handleLogout = async () => { await logout(); navigate('/login'); };

  return (
    <div className="shell">
      <button className="scrim" data-open={open} onClick={close} aria-hidden={!open} tabIndex={-1} />
      <aside className={`sidebar ${open ? 'open' : ''}`}>
        <Brand />
        <nav className="nav">
          <NavGroup title="Training" items={trainingNav} user={user} onNavigate={close} />
          <NavGroup title="Study" items={studyNav} user={user} onNavigate={close} />
          {isAdmin && <NavGroup title="Admin" items={adminNav} user={user} onNavigate={close} />}
        </nav>
        <div className="sidebar-foot">
          <NavLink to="/settings" onClick={close} className="user-chip">
            <span className="avatar" aria-hidden="true">{user?.name?.[0]?.toUpperCase()}</span>
            <span className="user-meta">
              <strong>{user?.name}</strong>
              <small className="faint">{user?.gamified ? `${user?.xp ?? 0} XP · ${user?.level?.name}` : user?.participantCode}</small>
            </span>
          </NavLink>
          <button className="btn btn-ghost btn-sm logout" onClick={handleLogout}>
            <Icon name="logout" size={16} /> Sign out
          </button>
        </div>
      </aside>

      <div className="main-col">
        <header className="topbar">
          <button className="menu-btn btn btn-ghost btn-sm" onClick={() => setOpen((o) => !o)} aria-label="Toggle menu" aria-expanded={open}>
            <Icon name="dashboard" size={18} />
          </button>
          <Brand />
          <NavLink to="/settings" className="avatar sm" aria-label="Settings">{user?.name?.[0]?.toUpperCase()}</NavLink>
        </header>
        <main className="content" key={location.pathname}>
          <div className="content-inner page-enter">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}
