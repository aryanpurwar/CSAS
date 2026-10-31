import { useState, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { useSession } from '../hooks/useSession';
import EmailInspector, { FlagSummary, cueLabel } from '../components/inspector/EmailInspector';
import SessionResult from '../components/SessionResult';
import Confidence from '../components/ui/Confidence';
import { Spinner, EmptyState, PageHeader, Meter } from '../components/ui/common';
import Icon from '../components/ui/Icon';
import './Trainer.css';

export default function PhishingTrainer() {
  const { user, refresh } = useAuth();
  const session = useSession({ startPath: '/training/phishing/sessions' });
  const [flags, setFlags] = useState([]);
  const [confidence, setConfidence] = useState(0);
  const [submitting, setSubmitting] = useState(false);

  const toggleFlag = useCallback((id) => {
    setFlags((f) => (f.includes(id) ? f.filter((x) => x !== id) : [...f, id]));
  }, []);

  const decide = async (verdict) => {
    if (!confidence) return;
    setSubmitting(true);
    const res = await session.submit({ verdict, flags, confidence });
    setSubmitting(false);
    if (res?.result) refresh();
  };

  const advance = () => { setFlags([]); setConfidence(0); session.next(); };
  const restart = () => { setFlags([]); setConfidence(0); session.start(); };

  if (session.state === 'loading' || session.state === 'idle') return <Spinner label="Preparing emails" />;
  if (session.state === 'error') {
    return <EmptyState icon="mail" title="Couldn't start training" action={<button className="btn btn-primary" onClick={session.start}>Try again</button>}>{session.error}</EmptyState>;
  }
  if (session.state === 'done' && !session.result) {
    return <EmptyState icon="mail" title="No emails available">Ask an admin to add phishing content.</EmptyState>;
  }
  if (session.result && session.state !== 'active') {
    return (
      <div className="trainer">
        <PageHeader title="Phishing inspector" />
        <SessionResult result={session.result} gamified={user?.gamified} onRestart={restart} title="Drill complete" />
      </div>
    );
  }

  const { item, position, length } = session.current;
  const fb = session.feedback;

  return (
    <div className="trainer">
      <PageHeader title="Phishing inspector" subtitle="Inspect the email, flag what's wrong, then decide." />

      <div className="trainer-top">
        <div className="trainer-progress">
          <Meter value={position - (fb ? 0 : 1)} max={length} />
          <span className="trainer-count">{position} / {length}</span>
        </div>
        <div className="trainer-tags">
          <span className="pill">{item.difficulty}</span>
          {session.meta?.mode === 'adaptive' && <span className="pill pill-teal"><Icon name="target" size={13} /> Adaptive</span>}
        </div>
      </div>

      <EmailInspector
        email={item}
        flags={flags}
        onToggleFlag={toggleFlag}
        annotations={fb?.annotations}
        disabled={Boolean(fb)}
      />

      {!fb ? (
        <div className="answer-panel card" style={{ padding: '1.1rem' }}>
          <div className="row" style={{ justifyContent: 'space-between', gap: '0.6rem', flexWrap: 'wrap' }}>
            <span className="pill pill-amber"><Icon name="flag" size={13} /> <FlagSummary flags={flags} /></span>
            <span className="faint" style={{ fontSize: '0.84rem' }}>Flagging is optional, but it's scored.</span>
          </div>
          <Confidence value={confidence} onChange={setConfidence} />
          <div className="verdict-bar">
            <button className="btn btn-legit btn-lg" disabled={submitting || !confidence} onClick={() => decide('legit')}>
              <Icon name="check" size={18} /> Looks legitimate
            </button>
            <button className="btn btn-phish btn-lg" disabled={submitting || !confidence} onClick={() => decide('phish')}>
              <Icon name="alert" size={18} /> Phishing attempt
            </button>
          </div>
          {!confidence && <p className="faint" style={{ fontSize: '0.82rem', textAlign: 'center' }}>Pick a confidence level to continue.</p>}
        </div>
      ) : (
        <Feedback feedback={fb} onNext={advance} finished={Boolean(session.result)} />
      )}
    </div>
  );
}

function Feedback({ feedback, onNext, finished }) {
  const verdictCls = feedback.verdictCorrect ? 'pill-success' : 'pill-danger';
  const hits = feedback.annotations.filter((a) => a.status === 'hit');
  const missed = feedback.annotations.filter((a) => a.status === 'missed');
  return (
    <div className="feedback card" style={{ padding: '1.1rem' }}>
      <div className="feedback-head">
        <h3>{feedback.isPhishing ? 'This was a phishing attempt' : 'This was a legitimate email'}</h3>
        <div className="feedback-scores">
          <span className={`pill ${verdictCls}`}>
            <Icon name={feedback.verdictCorrect ? 'check' : 'x'} size={13} /> {feedback.verdictCorrect ? 'Correct verdict' : 'Wrong verdict'}
          </span>
          {feedback.recall != null && <span className="pill">Red flags found: {Math.round(feedback.recall * 100)}%</span>}
        </div>
      </div>

      {hits.length > 0 && (
        <div className="cue-review">
          {hits.map((a) => (
            <div key={a.target} className="cue-item cue-hit">
              <span className="cue-icon"><Icon name="check" size={16} /></span>
              <div><div className="cue-label">{cueLabel(a.type)}</div><div className="cue-expl">{a.explanation}</div></div>
            </div>
          ))}
        </div>
      )}
      {missed.length > 0 && (
        <div className="cue-review">
          <p className="muted" style={{ fontSize: '0.85rem', fontWeight: 600 }}>Red flags you missed:</p>
          {missed.map((a) => (
            <div key={a.target} className="cue-item cue-missed">
              <span className="cue-icon"><Icon name="alert" size={16} /></span>
              <div><div className="cue-label">{cueLabel(a.type)}</div><div className="cue-expl">{a.explanation}</div></div>
            </div>
          ))}
        </div>
      )}
      {!feedback.isPhishing && feedback.legitReasons?.length > 0 && (
        <div className="cue-review">
          <p className="muted" style={{ fontSize: '0.85rem', fontWeight: 600 }}>Why it's legitimate:</p>
          {feedback.legitReasons.map((r) => (
            <div key={r} className="cue-item cue-hit"><span className="cue-icon"><Icon name="check" size={16} /></span><div className="cue-expl" style={{ marginTop: 0 }}>{r}</div></div>
          ))}
        </div>
      )}

      {feedback.takeaway && (
        <div className="banner banner-teal takeaway"><Icon name="spark" size={18} /><span>{feedback.takeaway}</span></div>
      )}

      <button className="btn btn-primary btn-block" onClick={onNext}>
        {finished ? 'See results' : 'Next email'} <Icon name="arrow" size={16} />
      </button>
    </div>
  );
}
