import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../api/client';
import Icon from '../components/ui/Icon';
import './Public.css';

// The simulated phishing landing page. It looks like a sign-in form, but the field values
// are discarded on submit: the server call sends an empty body and records only that a
// submission happened. We never transmit or store what the participant typed.
export default function Landing() {
  const { token } = useParams();
  const navigate = useNavigate();
  const [info, setInfo] = useState(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    api.get(`/track/${token}/landing`).then((r) => setInfo(r.data)).catch(() => setInfo({ brand: 'Sign in', prompt: 'Sign in to continue' }));
  }, [token]);

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    try {
      await api.post(`/track/${token}/submit`, {}); // deliberately empty: no credentials sent
      navigate(`/lesson/${token}`, { replace: true });
    } catch {
      navigate(`/lesson/${token}`, { replace: true });
    }
  };

  if (!info) return null;

  return (
    <div className="public-wrap">
      <div className="fake-login card">
        <div className="fake-brand"><Icon name="shield" size={22} /> {info.brand}</div>
        <p className="muted">{info.prompt}</p>
        <form onSubmit={submit} className="fake-form">
          <div className="field"><label>Email</label><input className="input" type="email" autoComplete="off" /></div>
          <div className="field"><label>Password</label><input className="input" type="password" autoComplete="off" /></div>
          <button className="btn btn-primary btn-block" disabled={busy}>{busy ? <span className="spinner" /> : 'Sign in'}</button>
        </form>
      </div>
    </div>
  );
}
