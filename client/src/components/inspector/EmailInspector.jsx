import { useState } from 'react';
import Icon from '../ui/Icon';
import { cueLabel } from './cueLabels';
import './EmailInspector.css';

// The hero interaction. Every header field and body line is a selectable "evidence"
// surface. The learner flags what looks wrong, then commits a verdict. Which elements
// are real cues is never sent to the client, so flags are a genuine detection signal.
// After grading, `annotations` colour each flagged/missed element.

const authTone = (v) => (v === 'pass' ? 'pass' : v === 'none' ? 'none' : 'fail');

function AuthBadge({ label, value }) {
  const tone = authTone(value);
  const icon = tone === 'pass' ? 'check' : tone === 'none' ? 'x' : 'alert';
  return (
    <span className={`auth-badge auth-${tone}`} title={`${label}: ${value}`}>
      <Icon name={icon} size={12} /> {label}={value}
    </span>
  );
}

function Flaggable({ id, flagged, annotation, disabled, onToggle, className = '', children, hint }) {
  const status = annotation?.status; // hit | missed | false-alarm
  const cls = ['flaggable', className, flagged ? 'is-flagged' : '', status ? `ann-${status}` : '', disabled ? 'is-locked' : ''].join(' ');
  return (
    <button
      type="button"
      className={cls}
      aria-pressed={flagged}
      aria-label={hint}
      disabled={disabled && !status}
      onClick={() => !disabled && onToggle(id)}
    >
      {children}
      {flagged && !status && <span className="flag-dot" aria-hidden="true"><Icon name="flag" size={11} fill /></span>}
      {status === 'hit' && <span className="ann-tag ann-tag-hit"><Icon name="check" size={11} /> Red flag</span>}
      {status === 'missed' && <span className="ann-tag ann-tag-missed"><Icon name="alert" size={11} /> Missed</span>}
      {status === 'false-alarm' && <span className="ann-tag ann-tag-false"><Icon name="x" size={11} /> Not a flag</span>}
    </button>
  );
}

export default function EmailInspector({ email, flags, onToggleFlag, annotations, disabled }) {
  const [hoverHref, setHoverHref] = useState(null);
  const annFor = (target) => annotations?.find((a) => a.target === target);
  const isFlagged = (id) => flags.includes(id);

  return (
    <div className="inspector">
      <div className="inspector-hint">
        <Icon name="eye" size={15} />
        <span>Click any part of this email that looks suspicious, then hover links to reveal where they really go.</span>
      </div>

      <div className="email card">
        <div className="email-head">
          <Flaggable id="from" flagged={isFlagged('from')} annotation={annFor('from')} disabled={disabled} onToggle={onToggleFlag} className="hdr-row" hint="Flag the sender address">
            <span className="hdr-key">From</span>
            <span className="hdr-val"><span className="from-name">{email.fromName}</span> <span className="mono from-addr">&lt;{email.fromAddress}&gt;</span></span>
          </Flaggable>

          {email.replyTo && (
            <Flaggable id="replyTo" flagged={isFlagged('replyTo')} annotation={annFor('replyTo')} disabled={disabled} onToggle={onToggleFlag} className="hdr-row" hint="Flag the reply-to address">
              <span className="hdr-key">Reply-To</span>
              <span className="hdr-val mono">{email.replyTo}</span>
            </Flaggable>
          )}

          <div className="hdr-row static">
            <span className="hdr-key">To</span>
            <span className="hdr-val mono faint">{email.to}</span>
          </div>

          <Flaggable id="subject" flagged={isFlagged('subject')} annotation={annFor('subject')} disabled={disabled} onToggle={onToggleFlag} className="hdr-row" hint="Flag the subject line">
            <span className="hdr-key">Subject</span>
            <span className="hdr-val subject">{email.subject}</span>
          </Flaggable>

          <Flaggable id="auth" flagged={isFlagged('auth')} annotation={annFor('auth')} disabled={disabled} onToggle={onToggleFlag} className="hdr-row auth-row" hint="Flag the authentication results">
            <span className="hdr-key">Security</span>
            <span className="hdr-val auth-vals">
              <AuthBadge label="SPF" value={email.auth.spf} />
              <AuthBadge label="DKIM" value={email.auth.dkim} />
              <AuthBadge label="DMARC" value={email.auth.dmarc} />
            </span>
          </Flaggable>
        </div>

        <div className="email-body">
          {email.parts.map((part) => {
            const ann = annFor(part.id);
            if (part.kind === 'link') {
              return (
                <Flaggable key={part.id} id={part.id} flagged={isFlagged(part.id)} annotation={ann} disabled={disabled} onToggle={onToggleFlag} className="body-part" hint="Flag this link">
                  <span
                    className="email-link"
                    onMouseEnter={() => setHoverHref(part.href)}
                    onMouseLeave={() => setHoverHref(null)}
                    onFocus={() => setHoverHref(part.href)}
                    onBlur={() => setHoverHref(null)}
                  >
                    <Icon name="link" size={14} /> {part.text}
                  </span>
                </Flaggable>
              );
            }
            if (part.kind === 'attachment') {
              return (
                <Flaggable key={part.id} id={part.id} flagged={isFlagged(part.id)} annotation={ann} disabled={disabled} onToggle={onToggleFlag} className="body-part" hint="Flag this attachment">
                  <span className="email-attach"><Icon name="download" size={14} /> {part.text}</span>
                </Flaggable>
              );
            }
            return (
              <Flaggable key={part.id} id={part.id} flagged={isFlagged(part.id)} annotation={ann} disabled={disabled} onToggle={onToggleFlag} className="body-part text" hint="Flag this line">
                {part.text}
              </Flaggable>
            );
          })}
        </div>

        <div className="status-bar" aria-live="polite">
          {hoverHref ? <><Icon name="link" size={13} /> <span className="mono">{hoverHref}</span></> : <span className="faint">Hover a link to see its real destination</span>}
        </div>
      </div>
    </div>
  );
}

export function FlagSummary({ flags }) {
  if (!flags.length) return <span className="faint">No flags marked yet</span>;
  return <span>{flags.length} element{flags.length > 1 ? 's' : ''} flagged</span>;
}

export { cueLabel };
