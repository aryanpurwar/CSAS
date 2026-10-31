import { Component } from 'react';
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import { Spinner } from './components/ui/common';
import AppShell from './components/AppShell';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import PhishingTrainer from './pages/PhishingTrainer';
import SocialTrainer from './pages/SocialTrainer';
import QuizTrainer from './pages/QuizTrainer';
import PasswordLab from './pages/PasswordLab';
import Inbox from './pages/Inbox';
import Study from './pages/Study';
import Leaderboard from './pages/Leaderboard';
import Settings from './pages/Settings';
import AdminOverview from './pages/admin/AdminOverview';
import AdminUsers from './pages/admin/AdminUsers';
import AdminContent from './pages/admin/AdminContent';
import AdminCampaigns from './pages/admin/AdminCampaigns';
import AdminStudy from './pages/admin/AdminStudy';
import Landing from './pages/Landing';
import Lesson from './pages/Lesson';

class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }
  static getDerivedStateFromError(error) {
    return { error };
  }
  componentDidCatch(error, info) {
    console.error('ErrorBoundary caught:', error, info);
  }
  render() {
    if (this.state.error) {
      return (
        <div style={{ padding: '2rem', color: '#b3261e', fontFamily: 'monospace' }}>
          <h2>Something went wrong</h2>
          <pre style={{ whiteSpace: 'pre-wrap', marginTop: '1rem' }}>{this.state.error.message}</pre>
          <pre style={{ whiteSpace: 'pre-wrap', marginTop: '0.5rem', fontSize: '0.85rem', color: '#4a5563' }}>{this.state.error.stack}</pre>
          <button onClick={() => this.setState({ error: null })} style={{ marginTop: '1rem', padding: '0.5rem 1rem', background: '#fff', color: '#1d2733', border: '1px solid #c9c3ae', borderRadius: '4px', cursor: 'pointer' }}>
            Try again
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

function Protected({ children, adminOnly }) {
  const { user, loading } = useAuth();
  const location = useLocation();
  if (loading) return <Spinner />;
  if (!user) return <Navigate to="/login" replace state={{ from: location }} />;
  if (adminOnly && user.role !== 'admin') return <Navigate to="/dashboard" replace />;
  return children;
}

function PublicOnly({ children }) {
  const { user, loading } = useAuth();
  if (loading) return <Spinner />;
  if (user) return <Navigate to="/dashboard" replace />;
  return children;
}

export default function App() {
  return (
    <ErrorBoundary>
    <Routes>
      <Route path="/login" element={<PublicOnly><Login /></PublicOnly>} />
      <Route path="/register" element={<PublicOnly><Register /></PublicOnly>} />

      {/* Public campaign pages: a participant may open these from their real mailbox. */}
      <Route path="/lp/:token" element={<Landing />} />
      <Route path="/lesson/:token" element={<Lesson />} />

      <Route element={<Protected><AppShell /></Protected>}>
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/train/phishing" element={<PhishingTrainer />} />
        <Route path="/train/social" element={<SocialTrainer />} />
        <Route path="/train/quiz" element={<QuizTrainer />} />
        <Route path="/train/password" element={<PasswordLab />} />
        <Route path="/inbox" element={<Inbox />} />
        <Route path="/study" element={<Study />} />
        <Route path="/leaderboard" element={<Leaderboard />} />
        <Route path="/settings" element={<Settings />} />
        <Route path="/admin" element={<Protected adminOnly><AdminOverview /></Protected>} />
        <Route path="/admin/users" element={<Protected adminOnly><AdminUsers /></Protected>} />
        <Route path="/admin/content" element={<Protected adminOnly><AdminContent /></Protected>} />
        <Route path="/admin/campaigns" element={<Protected adminOnly><AdminCampaigns /></Protected>} />
        <Route path="/admin/study" element={<Protected adminOnly><AdminStudy /></Protected>} />
      </Route>

      <Route path="/" element={<Navigate to="/dashboard" replace />} />
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
    </ErrorBoundary>
  );
}
