import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { apiMessage } from '../api/client';
import { useStrength, strengthColor } from '../hooks/useStrength';
import Icon from '../components/ui/Icon';
import AuthAside from './AuthAside';
import './Auth.css';

export default function Register() {
  const { register } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();
  const [form, setForm] = useState({ name: '', email: '', password: '' });
  const [showPw, setShowPw] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  // Words from the form are passed in so passwords like "aryan2026" are marked weak.
  const strength = useStrength(form.password, [form.name, form.email.split('@')[0]]);

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const submit = async (e) => {
    e.preventDefault();
    if (strength.score < 3) { 
      setError('Choose a stronger password. A few unrelated words works well.'); 
      return; 
    }
    setBusy(true);
    setError('');
    try {
      const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
      await register({ ...form, timezone: tz });
      toast.success('Account created. Please sign in.');
      navigate('/login');
    } catch (err) {
      setError(apiMessage(err, 'Could not create the account.'));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="auth-wrap">
      <AuthAside />
      <div className="auth-main">
        <div className="auth-card card" style={{ padding: '2rem' }}>
          <h2>Create your account</h2>
          <p className="sub">Start building real phishing-detection skill.</p>
          
          {error && (
            <div className="banner banner-danger" style={{ marginBottom: '1rem' }}>
              <Icon name="alert" size={18} />
              {error}
            </div>
          )}
          
          <form className="auth-form" onSubmit={submit}>
            <div className="field">
              <label htmlFor="name">Full name</label>
              <input id="name" className="input" required minLength={2} value={form.name} onChange={set('name')} autoComplete="name" />
            </div>
            
            <div className="field">
              <label htmlFor="email">Email</label>
              <input id="email" className="input" type="email" required value={form.email} onChange={set('email')} autoComplete="email" />
            </div>
            
            <div className="field">
              <label htmlFor="password">Password</label>
              <div className="pw-input">
                <input id="password" className="input" type={showPw ? 'text' : 'password'} required value={form.password} onChange={set('password')} autoComplete="new-password" aria-describedby="pw-help" />
                <button type="button" className="pw-toggle" onClick={() => setShowPw((s) => !s)} aria-label={showPw ? 'Hide password' : 'Show password'}>
                  <Icon name={showPw ? 'eye-off' : 'eye'} size={18} />
                </button>
              </div>
              
                            {form.password && (
                <div className="strength" id="pw-help">
                  <div className="strength-bars" aria-hidden="true">
                    {[0, 1, 2, 3].map((i) => (
                      <span key={i} className="strength-seg" style={{ background: i < strength.score ? strengthColor(strength.score) : undefined }} />
                    ))}
                  </div>
                  <div className="strength-row">
                    <span style={{ color: strengthColor(strength.score) }}>{strength.label}</span>
                    {strength.crackTime && <span className="faint">cracks in ~{strength.crackTime}</span>}
                  </div>
                  {(strength.warning || (strength.suggestions && strength.suggestions.length > 0)) && (
                    <p className="strength-hint">{strength.warning || strength.suggestions[0]}</p>
                  )}
                </div>
              )}
              
              <p className="strength-hint">Length matters more than symbols. A passphrase of unrelated words is strong and memorable.</p>
            </div>
            
            <button className="btn btn-primary btn-lg btn-block" disabled={busy}>
              {busy ? <span className="spinner" /> : 'Create account'}
            </button>
          </form>
          <p className="auth-alt">Already have an account? <Link to="/login">Sign in</Link></p>
        </div>
      </div>
    </div>
  );
}