import { useEffect, useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, LineChart, Line, CartesianGrid } from 'recharts';
import api from '../../api/client';
import { PageHeader, Stat, Spinner, Meter } from '../../components/ui/common';
import { cueLabel } from '../../components/inspector/cueLabels';
import AdminTabs from './AdminTabs';
import './Admin.css';

const chartColors = { teal: '#3ec7c2', amber: '#f0b429', danger: '#f2616b' };
const tooltipStyle = { background: '#141c26', border: '1px solid #2b3a4d', borderRadius: 10, fontSize: 13 };

export default function AdminOverview() {
  const [data, setData] = useState(null);
  useEffect(() => { api.get('/admin/overview').then((r) => setData(r.data)); }, []);
  if (!data) return <Spinner />;

  const cueData = data.cueDetection.map((c) => ({ name: cueLabel(c.type), rate: Math.round(c.rate * 100) }));

  return (
    <div className="stack" style={{ gap: '1.3rem' }}>
      <PageHeader title="Admin overview" subtitle="How the cohort is doing across the programme." />
      <AdminTabs />

      <div className="stats-grid">
        <Stat label="Participants" value={data.students} sub={`${data.enrolled} enrolled in study`} />
        <Stat label="Phish detection" value={data.phishingVerdicts.phishDetectionRate != null ? `${Math.round(data.phishingVerdicts.phishDetectionRate * 100)}%` : '—'} tone="teal" sub="Correct on phishing emails" />
        <Stat label="False alarms" value={data.phishingVerdicts.falseAlarmRate != null ? `${Math.round(data.phishingVerdicts.falseAlarmRate * 100)}%` : '—'} tone="amber" sub="Legit flagged as phish" />
        <Stat label="Content items" value={data.content.phishing + data.content.social + data.content.quiz + data.content.password} sub={`${data.content.phishing} emails`} />
      </div>

      <div className="admin-two">
        <div className="card chart-card">
          <h3>Module performance</h3>
          <div className="module-stats">
            {data.modules.map((m) => (
              <div key={m.module} className="module-stat-row">
                <span className="module-stat-name">{m.module}</span>
                <div className="module-stat-meter"><Meter value={m.averageScore ?? 0} tone={m.averageScore >= 70 ? 'teal' : 'amber'} /></div>
                <span className="mono faint">{m.averageScore ?? '—'}%</span>
                <span className="faint module-stat-sub">{m.sessions} sessions</span>
              </div>
            ))}
          </div>
        </div>

        <div className="card chart-card">
          <h3>Cue detection rate</h3>
          <p className="faint" style={{ fontSize: '0.82rem', marginBottom: '0.5rem' }}>Which red flags the cohort finds. Low bars are training gaps.</p>
          <ResponsiveContainer width="100%" height={Math.max(180, cueData.length * 26)}>
            <BarChart data={cueData} layout="vertical" margin={{ left: 10, right: 20 }}>
              <XAxis type="number" domain={[0, 100]} tick={{ fill: '#6f8096', fontSize: 11 }} />
              <YAxis type="category" dataKey="name" width={130} tick={{ fill: '#a7b4c4', fontSize: 11 }} />
              <Tooltip contentStyle={tooltipStyle} formatter={(v) => [`${v}%`, 'Detected']} cursor={{ fill: 'rgba(255,255,255,0.03)' }} />
              <Bar dataKey="rate" radius={[0, 4, 4, 0]} fill={chartColors.teal} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {data.activity.length > 0 && (
        <div className="card chart-card">
          <h3>Activity (last 14 days)</h3>
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={data.activity} margin={{ left: -10, right: 10, top: 10 }}>
              <CartesianGrid stroke="#202c3a" vertical={false} />
              <XAxis dataKey="day" tick={{ fill: '#6f8096', fontSize: 11 }} tickFormatter={(d) => d.slice(5)} />
              <YAxis tick={{ fill: '#6f8096', fontSize: 11 }} />
              <Tooltip contentStyle={tooltipStyle} />
              <Line type="monotone" dataKey="responses" stroke={chartColors.teal} strokeWidth={2} dot={false} name="Responses" />
              <Line type="monotone" dataKey="accuracy" stroke={chartColors.amber} strokeWidth={2} dot={false} name="Accuracy" yAxisId="right" hide />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}
