import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../api/client';
import { PageHeader, Stat, Meter, Spinner } from '../components/ui/common';
import { cueLabel } from '../components/inspector/cueLabels';
import Icon from '../components/ui/Icon';
import './Dashboard.css';

const MODULE_META = {
  phishing: { label: 'Phishing inspector', icon: 'mail', to: '/train/phishing' },
  social: { label: 'Social engineering', icon: 'phone', to: '/train/social' },
  quiz: { label: 'Knowledge quiz', icon: 'quiz', to: '/train/quiz' },
  password: { label: 'Password lab', icon: 'key', to: '/train/password' },
};

export default function Dashboard() {
  const { user, refresh } = useAuth();
  const [insights, setInsights] = useState(null);

  useEffect(() => { refresh(); api.get('/me/insights').then((r) => setInsights(r.data)).catch(() => setInsights({ cues: [] })); }, [refresh]);

  if (!user) return <Spinner />;

  const progressByModule = Object.fromEntries((user.progress || []).map((p) => [p.module, p]));
  const level = user.level;
  const toNext = level?.nextAt ? level.nextAt - user.xp : 0;
  const levelPct = level?.nextAt ? ((user.xp - level.min) / (level.nextAt - level.min)) * 100 : 100;
  const weakCues = (insights?.cues || []).filter((c) => c.hit + c.missed >= 2).slice(0, 3);

  return (
    <div className="stack" style={{ gap: '1.6rem' }}>
      <PageHeader title={`Hello, ${user.name.split(' ')[0]}`} subtitle="Your cybersecurity training overview." />

      <div className="stats-grid">
        <Stat label="Training score" value={`${user.trainingScore}%`} tone="teal" sub="Weighted across modules" />
        {user.gamified ? (
          <>
            <Stat label="Total XP" value={user.xp} sub={level?.nextAt ? `${toNext} XP to ${level.nextName}` : 'Max level'} />
            <Stat label="Level" value={level?.name} />
            <Stat label="Streak" value={`${user.streak?.current ?? 0} days`} tone="amber" sub={`Best: ${user.streak?.best ?? 0}`} />
          </>
        ) : (
          <>
            <Stat label="Phishing skill" value={`${user.skills?.phishing ?? 0}`} sub="Rating-based (0–100)" />
            <Stat label="Group" value="Control" sub="Study participant" />
            <Stat label="Participant" value={user.participantCode} />
          </>
        )}
      </div>

      {user.gamified && level?.nextAt && (
        <div className="card level-bar">
          <div className="level-bar-head">
            <strong>{level.name}</strong>
            <span className="faint">{user.xp} / {level.nextAt} XP</span>
          </div>
          <Meter value={levelPct} tone="teal" />
        </div>
      )}

      <div>
        <h2 className="section-title">Training modules</h2>
        <div className="modules-grid">
          {Object.entries(MODULE_META).map(([key, meta]) => {
            const p = progressByModule[key];
            return (
              <Link key={key} to={meta.to} className="module-card card">
                <div className="module-top">
                  <span className="module-icon"><Icon name={meta.icon} size={18} /></span>
                  {p?.completed && <span className="pill pill-success"><Icon name="check" size={12} /> Done</span>}
                </div>
                <h3>{meta.label}</h3>
                <div className="module-score">
                  <Meter value={p?.score ?? 0} tone={p?.score >= 70 ? 'teal' : 'amber'} />
                  <span className="faint">{p ? `${p.score}% · ${p.sessions} session${p.sessions === 1 ? '' : 's'}` : 'Not started'}</span>
                </div>
                <span className="module-go">Start <Icon name="arrow" size={14} /></span>
              </Link>
            );
          })}
        </div>
      </div>

      <div className="dash-two">
        {weakCues.length > 0 && (
          <div className="card insight-card">
            <h3><Icon name="target" size={17} /> Your blind spots</h3>
            <p className="muted" style={{ fontSize: '0.88rem' }}>Red flags you miss most often. Focus here.</p>
            <div className="insight-list">
              {weakCues.map((c) => (
                <div key={c.type} className="insight-row">
                  <span>{cueLabel(c.type)}</span>
                  <div className="insight-meter"><Meter value={c.rate * 100} tone={c.rate < 0.5 ? 'danger' : 'amber'} /></div>
                  <span className="faint mono">{Math.round(c.rate * 100)}%</span>
                </div>
              ))}
            </div>
            <Link to="/train/phishing" className="btn btn-ghost btn-sm" style={{ marginTop: '0.8rem' }}>Practise phishing <Icon name="arrow" size={14} /></Link>
          </div>
        )}

        {user.gamified && user.badges?.length > 0 && (
          <div className="card insight-card">
            <h3><Icon name="trophy" size={17} /> Badges</h3>
            <div className="badges-grid">
              {user.badges.map((b) => (
                <div key={b.id} className="badge-item" title={b.description}>
                  <Icon name="shield" size={16} fill /> <span>{b.label}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
