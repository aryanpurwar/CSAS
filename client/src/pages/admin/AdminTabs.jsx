import { NavLink } from 'react-router-dom';
import Icon from '../../components/ui/Icon';

const tabs = [
  { to: '/admin', label: 'Overview', icon: 'chart', end: true },
  { to: '/admin/users', label: 'Participants', icon: 'users' },
  { to: '/admin/content', label: 'Content', icon: 'book' },
  { to: '/admin/campaigns', label: 'Campaigns', icon: 'target' },
  { to: '/admin/study', label: 'Study results', icon: 'spark' },
];

export default function AdminTabs() {
  return (
    <nav className="admin-tabs">
      {tabs.map((t) => (
        <NavLink key={t.to} to={t.to} end={t.end} className={({ isActive }) => `admin-tab ${isActive ? 'active' : ''}`}>
          <Icon name={t.icon} size={15} /> {t.label}
        </NavLink>
      ))}
    </nav>
  );
}
