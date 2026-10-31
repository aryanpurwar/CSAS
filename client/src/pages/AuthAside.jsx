import Icon from '../components/ui/Icon';

export default function AuthAside() {
  return (
    <aside className="auth-aside">
      <div className="brand">
        <span className="brand-mark"><Icon name="shield" size={20} /></span>
        <span className="brand-text">
          <strong>CSAS</strong>
          <small>Cybersecurity Awareness System</small>
        </span>
      </div>

      <div className="auth-hero">
        <h1>Learn to spot the attack, not just pass the quiz.</h1>
        <p>
          Inspect real-looking emails, mark the red flags, and see whether your skill actually
          changes over time. This platform doubles as a research study into what training works.
        </p>
        <div className="auth-points">
          <div className="auth-point"><Icon name="mail" size={18} /><span>Interactive email inspection with per-cue feedback</span></div>
          <div className="auth-point"><Icon name="target" size={18} /><span>Adaptive difficulty that follows your skill</span></div>
          <div className="auth-point"><Icon name="key" size={18} /><span>Privacy-first password lab using breach checks</span></div>
        </div>
      </div>
    </aside>
  );
}
