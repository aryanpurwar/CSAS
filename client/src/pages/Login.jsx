import { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { apiMessage } from '../api/client';
import Icon from '../components/ui/Icon';
import AuthAside from './AuthAside';
import './Auth.css';

export default function Login() {
  const { login, verifyMfa } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();
  const location = useLocation();
  const dest = location.state?.from?.pathname || '/dashboard';

  const [form, setForm] = useState({ email: '', password: '' });
  const [showPw, setShowPw] = useState(false);
  const [mfa, setMfa] = useState(false);
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      const res = await login(form.email, form.password);
      if (res.mfaRequired) { setMfa(true); return; }
      navigate(dest, { replace: true });
    } catch (err) {
      setError(apiMessage(err, 'Could not sign in.'));
    } finally {
      setBusy(false);
    }
  };

  const submitMfa = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      await verifyMfa(code);
      navigate(dest, { replace: true });
    } catch (err) {
      setError(apiMessage(err, 'That code did not work.'));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="auth-wrap">
      <AuthAside />
      <div className="auth-main">
        <div className="auth-card card" style={{ padding: '2rem' }}>
          {!mfa ? (
            <>
              <h2>Welcome back</h2>
              <p className="sub">Sign in to continue your training.</p>
              {error && <div className="banner banner-danger" style={{ marginBottom: '1rem' }}><Icon name="alert" size={18} />{error}</div>}
              <form className="auth-form" onSubmit={submit}>
                <div className="field">
                  <label htmlFor="email">Email</label>
                  <input id="email" className="input" type="email" autoComplete="email" required value={form.email} onChange={set('email')} />
                </div>
                <div className="field">
                  <label htmlFor="password">Password</label>
                  <div className="pw-input">
                    <input id="password" className="input" type={showPw ? 'text' : 'password'} autoComplete="current-password" required value={form.password} onChange={set('password')} />
                    <button type="button" className="pw-toggle" onClick={() => setShowPw((s) => !s)} aria-label={showPw ? 'Hide password' : 'Show password'}>
                      <Icon name={showPw ? 'eye-off' : 'eye'} size={18} />
                    </button>
                  </div>
                </div>
                <button className="btn btn-primary btn-lg btn-block" disabled={busy}>
                  {busy ? <span className="spinner" /> : 'Sign in'}
                </button>
              </form>
              <p className="auth-alt">New here? <Link to="/register">Create an account</Link></p>
            </>
          ) : (
            <>
              <h2>Two-factor code</h2>
              <p className="sub">Enter the 6-digit code from your authenticator app.</p>
              {error && <div className="banner banner-danger" style={{ marginBottom: '1rem' }}><Icon name="alert" size={18} />{error}</div>}
              <form className="auth-form" onSubmit={submitMfa}>
                <div className="field mfa-digits">
                  <input
                    className="input mono" inputMode="numeric" pattern="\d{6}" maxLength={6} autoFocus
                    style={{ textAlign: 'center', fontSize: '1.5rem', letterSpacing: '0.4em' }}
                    value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                    aria-label="Authentication code"
                  />
                </div>
                <button className="btn btn-primary btn-lg btn-block" disabled={busy || code.length !== 6}>
                  {busy ? <span className="spinner" /> : 'Verify'}
                </button>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
