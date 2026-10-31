import Icon from './Icon';

export function Spinner({ label = 'Loading' }) {
  return (
    <div className="full-center" role="status">
      <div className="spinner" />
      <span className="sr-only">{label}</span>
    </div>
  );
}

export function PageHeader({ title, subtitle, children }) {
  return (
    <header className="page-head">
      <div>
        <h1>{title}</h1>
        {subtitle && <p className="muted">{subtitle}</p>}
      </div>
      {children && <div className="page-head-actions">{children}</div>}
    </header>
  );
}

export function EmptyState({ icon = 'inbox', title, children, action }) {
  return (
    <div className="empty card">
      <div className="empty-icon"><Icon name={icon} size={26} /></div>
      <h3>{title}</h3>
      {children && <p className="muted">{children}</p>}
      {action}
    </div>
  );
}

// A verdict chip that NEVER relies on colour alone: it always pairs an icon and a word.
export function Verdict({ correct, timedOut }) {
  if (timedOut) return <span className="pill pill-amber"><Icon name="clock" size={14} /> Timed out</span>;
  return correct
    ? <span className="pill pill-success"><Icon name="check" size={14} /> Correct</span>
    : <span className="pill pill-danger"><Icon name="x" size={14} /> Not quite</span>;
}

export function Stat({ label, value, sub, tone }) {
  return (
    <div className="stat card">
      <div className="stat-label">{label}</div>
      <div className={`stat-value ${tone ? `tone-${tone}` : ''}`}>{value}</div>
      {sub && <div className="stat-sub faint">{sub}</div>}
    </div>
  );
}

export function Meter({ value, max = 100, tone = 'teal' }) {
  const pct = Math.max(0, Math.min(100, (value / max) * 100));
  return (
    <div className="meter" role="progressbar" aria-valuenow={Math.round(value)} aria-valuemin={0} aria-valuemax={max}>
      <span className={`meter-fill meter-${tone}`} style={{ width: `${pct}%` }} />
    </div>
  );
}
