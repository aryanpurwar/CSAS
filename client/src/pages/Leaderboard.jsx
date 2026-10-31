import { useEffect, useState } from 'react';
import api from '../api/client';
import { PageHeader, Spinner, EmptyState } from '../components/ui/common';
import Icon from '../components/ui/Icon';
import './Leaderboard.css';

export default function Leaderboard() {
  const [rows, setRows] = useState(null);
  const [error, setError] = useState('');
  useEffect(() => { api.get('/me/leaderboard').then((r) => setRows(r.data)).catch((e) => { setError(e.response?.data?.message || 'Unavailable'); setRows([]); }); }, []);

  if (rows === null) return <Spinner />;
  if (error) return <EmptyState icon="trophy" title="Leaderboard unavailable">{error}</EmptyState>;

  return (
    <div className="stack" style={{ gap: '1.2rem' }}>
      <PageHeader title="Leaderboard" subtitle="Ranked by XP across the gamified group." />
      <div className="card lb">
        <div className="lb-head"><span>#</span><span>Name</span><span>Level</span><span>Streak</span><span>XP</span></div>
        {rows.map((r) => (
          <div key={r.id} className={`lb-row ${r.you ? 'you' : ''}`}>
            <span className={`lb-rank ${r.rank <= 3 ? `top-${r.rank}` : ''}`}>{r.rank <= 3 ? <Icon name="trophy" size={15} /> : r.rank}</span>
            <span className="lb-name">{r.name}{r.you && <span className="pill pill-teal" style={{ marginLeft: '0.5rem' }}>You</span>}</span>
            <span className="faint">{r.level}</span>
            <span>{r.streak > 0 ? `${r.streak}d` : '—'}</span>
            <span className="mono lb-xp">{r.xp}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
