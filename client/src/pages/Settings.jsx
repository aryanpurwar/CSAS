import { useState } from 'react';
import api, { apiMessage } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { useStrength, strengthColor } from '../hooks/useStrength';
import { PageHeader } from '../components/ui/common';
import Icon from '../components/ui/Icon';
import './Settings.css';

export default function Settings() {
  const { user, setUser, refresh } = useAuth();
  const toast = useToast();

  return (
    <div className="stack" style={{ gap: '1.2rem' }}>
      <PageHeader title="Settings" subtitle="Manage your account and security." />
      <ProfileCard user={user} onSaved={(u) => setUser(u)} toast={toast} />
      <PasswordCard user={user} toast={toast} />
      <MfaCard user={user} onChange={refresh} toast={toast} />
    </div>
  );
}

function ProfileCard({ user, onSaved, toast }) {
  const [name, setName] = useState(user.name);
  const [busy, setBusy] = useState(false);
  const save = async () => {
    setBusy(true);
    try { const { data } = await api.patch('/me', { name }); onSaved(data); toast.success('Profile updated.'); }
    catch (err) { toast.error(apiMessage(err)); }
    finally { setBusy(false); }
  };
  return (
    <section className="card set-card">
      <h3>Profile</h3>
      <div className="set-grid">
        <div className="field"><label>Name</label><input className="input" value={name} onChange={(e) => setName(e.target.value)} /></div>
        <div className="field"><label>Email</label><input className="input" value={user.email} disabled /></div>
        <div className="field"><label>Time zone</label><input className="input" value={user.timezone} disabled /></div>
        <div className="field"><label>Participant code</label><input className="input mono" value={user.participantCode} disabled /></div>
      </div>
      <button className="btn btn-primary" onClick={save} disabled={busy || name === user.name}>Save changes</button>
    </section>
  );
}

function PasswordCard({ user, toast }) {
  const [form, setForm] = useState({ current: '', next: '' });
  const [busy, setBusy] = useState(false);
  const strength = useStrength(form.next, [user.name, user.email]);
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const save = async () => {
    if (strength.score < 3) { toast.error('Choose a stronger new password.'); return; }
    setBusy(true);
    try { await api.post('/me/password', form); toast.success('Password changed. Other sessions were signed out.'); setForm({ current: '', next: '' }); }
    catch (err) { toast.error(apiMessage(err)); }
    finally { setBusy(false); }
  };

  return (
    <section className="card set-card">
      <h3>Password</h3>
      <div className="set-grid">
        <div className="field"><label>Current password</label><input className="input" type="password" value={form.current} onChange={set('current')} autoComplete="current-password" /></div>
        <div className="field">
          <label>New password</label>
          <input className="input" type="password" value={form.next} onChange={set('next')} autoComplete="new-password" />
          {form.next && <div className="strength-row" style={{ marginTop: '0.3rem' }}><span style={{ color: strengthColor(strength.score) }}>{strength.label}</span>{strength.crackTime && <span className="faint">~{strength.crackTime}</span>}</div>}
        </div>
      </div>
      <button className="btn btn-primary" onClick={save} disabled={busy || !form.current || !form.next}>Change password</button>
    </section>
  );
}

function MfaCard({ user, onChange, toast }) {
  const [setup, setSetup] = useState(null); // { qrDataUrl, secret }
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);

  const begin = async () => {
    setBusy(true);
    try { const { data } = await api.post('/auth/mfa/setup'); setSetup(data); }
    catch (err) { toast.error(apiMessage(err)); }
    finally { setBusy(false); }
  };
  const enable = async () => {
    setBusy(true);
    try { await api.post('/auth/mfa/enable', { code }); toast.success('Two-factor authentication is on.'); setSetup(null); setCode(''); onChange(); }
    catch (err) { toast.error(apiMessage(err)); }
    finally { setBusy(false); }
  };

  return (
    <section className="card set-card">
      <h3>Two-factor authentication <Icon name="key" size={16} /></h3>
      {user.mfaEnabled ? (
        <p className="muted"><span className="pill pill-success"><Icon name="check" size={12} /> Enabled</span> Your account asks for an authenticator code at sign-in.</p>
      ) : !setup ? (
        <>
          <p className="muted">Add a time-based code from an authenticator app (Google Authenticator, Authy) for a second layer of security.</p>
          <button className="btn btn-primary" onClick={begin} disabled={busy}>Set up two-factor</button>
        </>
      ) : (
        <div className="mfa-setup">
          <p className="muted">Scan this QR code with your authenticator app, then enter the 6-digit code it shows.</p>
          <img src={setup.qrDataUrl} alt="Two-factor QR code" className="mfa-qr" />
          <p className="faint mono" style={{ fontSize: '0.8rem', wordBreak: 'break-all' }}>Manual key: {setup.secret}</p>
          <div className="row" style={{ gap: '0.6rem' }}>
            <input className="input mono" style={{ maxWidth: '140px', textAlign: 'center', letterSpacing: '0.3em' }} value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))} placeholder="000000" />
            <button className="btn btn-primary" onClick={enable} disabled={busy || code.length !== 6}>Enable</button>
            <button className="btn btn-ghost" onClick={() => setSetup(null)}>Cancel</button>
          </div>
        </div>
      )}
    </section>
  );
}
