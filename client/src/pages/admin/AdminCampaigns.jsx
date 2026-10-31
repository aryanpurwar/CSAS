import { useEffect, useState } from 'react';
import api, { apiMessage } from '../../api/client';
import { useToast } from '../../context/ToastContext';
import { PageHeader, Spinner, EmptyState } from '../../components/ui/common';
import Icon from '../../components/ui/Icon';
import AdminTabs from './AdminTabs';
import './Admin.css';

export default function AdminCampaigns() {
  const toast = useToast();
  const [data, setData] = useState(null);
  const [users, setUsers] = useState([]);
  const [selected, setSelected] = useState(null);
  const [metrics, setMetrics] = useState(null);
  const [form, setForm] = useState({ name: '', scenarioId: '', sendEmail: false, targets: [] });

  const load = () => api.get('/admin/campaigns').then((r) => { setData(r.data); if (!form.scenarioId && r.data.templates[0]) setForm((f) => ({ ...f, scenarioId: r.data.templates[0]._id })); });
  useEffect(() => { load(); api.get('/admin/users').then((r) => setUsers(r.data.filter((u) => u.role === 'student'))); }, []);

  const consenting = users.filter((u) => u.consent.campaigns);

  const launch = async () => {
    if (!form.name || !form.scenarioId || !form.targets.length) { toast.error('Name, template and at least one consenting target are required.'); return; }
    try {
      const { data: res } = await api.post('/admin/campaigns', { name: form.name, scenarioId: form.scenarioId, userIds: form.targets, sendEmail: form.sendEmail });
      toast.success(`Launched to ${res.targeted} participant(s)${res.skipped ? `, ${res.skipped} skipped (no consent)` : ''}.`);
      setForm((f) => ({ ...f, name: '', targets: [] }));
      load();
    } catch (err) { toast.error(apiMessage(err)); }
  };

  const openMetrics = async (id) => { setSelected(id); setMetrics(null); const { data: m } = await api.get(`/admin/campaigns/${id}`); setMetrics(m); };
  const end = async (id) => { try { await api.post(`/admin/campaigns/${id}/end`); load(); if (selected === id) openMetrics(id); } catch (err) { toast.error(apiMessage(err)); } };

  if (!data) return <Spinner />;

  return (
    <div className="stack" style={{ gap: '1.2rem' }}>
      <PageHeader title="Phishing campaigns" subtitle="Run consented simulated-phishing exercises and measure the click/report funnel." />
      <AdminTabs />

      <div className="banner banner-amber"><Icon name="alert" size={18} /><span>Only participants who consented to campaigns can be targeted. Consent is enforced on the server. Get ethics approval before running a real campaign.</span></div>

      <div className="campaign-grid">
        <div className="card" style={{ padding: '1.2rem' }}>
          <h3>New campaign</h3>
          <div className="stack" style={{ gap: '0.8rem', marginTop: '0.8rem' }}>
            <div className="field"><label>Campaign name</label><input className="input" value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} placeholder="e.g. Wi-Fi expiry drill" /></div>
            <div className="field">
              <label>Email template</label>
              <select className="input" value={form.scenarioId} onChange={(e) => setForm((f) => ({ ...f, scenarioId: e.target.value }))}>
                {data.templates.map((t) => <option key={t._id} value={t._id}>{t.title} {t.isPhishing ? '(phishing)' : '(legit control)'}</option>)}
              </select>
            </div>
            <div className="field">
              <label>Targets ({consenting.length} consenting)</label>
              <div className="target-list">
                {consenting.length === 0 && <p className="faint">No participants have consented to campaigns yet.</p>}
                {consenting.map((u) => (
                  <label key={u.id} className="target-item">
                    <input type="checkbox" checked={form.targets.includes(u.id)} onChange={(e) => setForm((f) => ({ ...f, targets: e.target.checked ? [...f.targets, u.id] : f.targets.filter((x) => x !== u.id) }))} />
                    <span>{u.participantCode} · {u.name}</span>
                  </label>
                ))}
              </div>
            </div>
            {data.smtpEnabled && (
              <label className="target-item"><input type="checkbox" checked={form.sendEmail} onChange={(e) => setForm((f) => ({ ...f, sendEmail: e.target.checked }))} /><span>Also send real email (via Mailpit)</span></label>
            )}
            <button className="btn btn-primary" onClick={launch}>Launch campaign</button>
          </div>
        </div>

        <div className="card" style={{ padding: '1.2rem' }}>
          <h3>Campaigns</h3>
          {data.campaigns.length === 0 ? <p className="muted" style={{ marginTop: '0.6rem' }}>No campaigns yet.</p> : (
            <div className="stack" style={{ gap: '0.5rem', marginTop: '0.8rem' }}>
              {data.campaigns.map((c) => (
                <div key={c._id} className="campaign-row">
                  <button className="campaign-name" onClick={() => openMetrics(c._id)}>
                    <strong>{c.name}</strong>
                    <span className="faint" style={{ fontSize: '0.8rem' }}>{c.targetCount} targets · {c.status}</span>
                  </button>
                  {c.status === 'running' && <button className="btn btn-sm" onClick={() => end(c._id)}>End</button>}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {selected && (
        <div className="card" style={{ padding: '1.2rem' }}>
          <h3>Results</h3>
          {!metrics ? <Spinner /> : <Funnel metrics={metrics} />}
        </div>
      )}
    </div>
  );
}

function Funnel({ metrics }) {
  const f = metrics.funnel;
  const rows = [
    { label: 'Delivered', value: f.delivered, color: 'var(--text-dim)' },
    { label: 'Opened', value: f.opened, color: '#60a5fa' },
    { label: 'Clicked', value: f.clicked, color: 'var(--danger)' },
    { label: 'Entered data', value: f.submitted, color: '#c0392b' },
    { label: 'Reported', value: f.reported, color: 'var(--success)' },
  ];
  const max = f.delivered || 1;
  return (
    <div className="stack" style={{ gap: '1rem' }}>
      <div className="funnel">
        {rows.map((r) => (
          <div key={r.label} className="funnel-row">
            <span>{r.label}</span>
            <div className="funnel-bar-track"><div className="funnel-bar" style={{ width: `${(r.value / max) * 100}%`, background: r.color }} /></div>
            <span className="mono">{r.value}</span>
          </div>
        ))}
      </div>
      <div className="row" style={{ gap: '0.5rem', flexWrap: 'wrap' }}>
        <span className="pill pill-danger">Click rate {Math.round(metrics.rates.clickRate * 100)}%</span>
        <span className="pill pill-success">Report rate {Math.round(metrics.rates.reportRate * 100)}%</span>
        <span className="pill">Reported before clicking: {f.reportedBeforeClick}</span>
        {metrics.medianMinutesToClick != null && <span className="pill">Median time to click: {metrics.medianMinutesToClick.toFixed(1)} min</span>}
      </div>
    </div>
  );
}
