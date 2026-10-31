import { useState } from 'react';
import { PageHeader } from '../components/ui/common';
import { useStrength, strengthColor } from '../hooks/useStrength';
import { usePwnedCheck } from '../hooks/usePwnedCheck';
import { useToast } from '../context/ToastContext';
import McqRunner from '../components/McqRunner';
import Icon from '../components/ui/Icon';
import './Trainer.css';
import './PasswordLab.css';

function Analyzer() {
  const [pw, setPw] = useState('');
  const [show, setShow] = useState(false);
  const toast = useToast();
  const strength = useStrength(pw);
  const pwned = usePwnedCheck(pw);

  const generate = () => {
    const words = ['harbor', 'lantern', 'copper', 'meadow', 'anchor', 'violet', 'ridge', 'crisp', 'maple', 'ember', 'quartz', 'willow', 'cobalt', 'drift', 'thistle', 'onyx'];
    const pick = () => words[crypto.getRandomValues(new Uint32Array(1))[0] % words.length];
    const num = crypto.getRandomValues(new Uint32Array(1))[0] % 100;
    const phrase = `${pick()}-${pick()}-${pick()}-${pick()}${num}`;
    setPw(phrase);
    setShow(true);
  };

  return (
    <div className="card pw-card">
      <div className="banner banner-teal" style={{ marginBottom: '1rem' }}>
        <Icon name="shield" size={18} />
        <span>Your password never leaves this page. The breach check sends only the first 5 characters of its hash (k-anonymity), so even that reveals nothing.</span>
      </div>

      <div className="field">
        <label htmlFor="pw">Try a password</label>
        <div className="pw-input">
          <input id="pw" className="input mono" type={show ? 'text' : 'password'} value={pw} onChange={(e) => setPw(e.target.value)} placeholder="Type a practice password" autoComplete="off" />
          <button type="button" className="pw-toggle" onClick={() => setShow((s) => !s)} aria-label={show ? 'Hide' : 'Show'}><Icon name={show ? 'eye-off' : 'eye'} size={18} /></button>
        </div>
      </div>

      {pw && (
        <>
          <div className="pw-meters">
            <div className="strength-bars" aria-hidden="true">
              {[0, 1, 2, 3].map((i) => <span key={i} className="strength-seg" style={{ background: i < strength.score ? strengthColor(strength.score) : undefined }} />)}
            </div>
            <div className="strength-row">
              <strong style={{ color: strengthColor(strength.score) }}>{strength.label}</strong>
              {strength.crackTime && <span className="faint">cracks in ~{strength.crackTime}</span>}
            </div>
          </div>

          <div className={`pw-breach pw-breach-${pwned.status}`}>
            {pwned.status === 'checking' && <><span className="spinner" /> Checking breach databases…</>}
            {pwned.status === 'clean' && <><Icon name="check" size={16} /> Not found in known breaches</>}
            {pwned.status === 'pwned' && <><Icon name="alert" size={16} /> Found in {pwned.count.toLocaleString()} breaches — never use this</>}
            {pwned.status === 'error' && <><Icon name="x" size={16} /> Breach check unavailable right now</>}
          </div>

          {(strength.warning || strength.suggestions?.length > 0) && (
            <ul className="pw-tips">
              {strength.warning && <li>{strength.warning}</li>}
              {strength.suggestions?.map((s) => <li key={s}>{s}</li>)}
            </ul>
          )}
        </>
      )}

      <div className="row" style={{ gap: '0.6rem', marginTop: '1rem', flexWrap: 'wrap' }}>
        <button className="btn btn-ghost" onClick={generate}><Icon name="spark" size={16} /> Generate a passphrase</button>
        {pw && <button className="btn btn-ghost" onClick={() => { navigator.clipboard?.writeText(pw); toast.success('Copied'); }}>Copy</button>}
      </div>
    </div>
  );
}

export default function PasswordLab() {
  return (
    <div className="stack" style={{ gap: '1.6rem' }}>
      <div>
        <PageHeader title="Password lab" subtitle="See what makes a password strong, and test your judgement." />
        <Analyzer />
      </div>
      <div>
        <h2 className="section-title">Challenge</h2>
        <p className="muted" style={{ marginBottom: '1rem' }}>These are graded on the server. Length and unpredictability beat added symbols.</p>
        <McqRunner
          title="Password challenge"
          startPath="/training/password/sessions"
          icon="key"
          showConfidence={false}
        />
      </div>
    </div>
  );
}
