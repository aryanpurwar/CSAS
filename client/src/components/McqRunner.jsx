import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useSession } from '../hooks/useSession';
import SessionResult from './SessionResult';
import Confidence from './ui/Confidence';
import Timer from './ui/Timer';
import { Spinner, EmptyState, PageHeader, Meter } from './ui/common';
import Icon from './ui/Icon';
import '../pages/Trainer.css';

const LETTERS = ['A', 'B', 'C', 'D', 'E'];

// Shared runner for social-engineering, quiz and password modules, which are all MCQ.
// `renderContext` lets each module draw its own stem (a chat transcript, a plain prompt).
export default function McqRunner({ title, subtitle, startPath, icon = 'quiz', renderContext, showConfidence = true }) {
  const { user, refresh } = useAuth();
  const session = useSession({ startPath });
  const [selected, setSelected] = useState(null);
  const [confidence, setConfidence] = useState(0);
  const [submitting, setSubmitting] = useState(false);

  const answer = async (index) => {
    if (submitting || session.feedback) return;
    setSelected(index);
    setSubmitting(true);
    const res = await session.submit({ selectedIndex: index, confidence: confidence || 3 });
    setSubmitting(false);
    if (res?.result) refresh();
  };

  const onExpire = () => { if (!session.feedback && !submitting) answer(-1); };
  const advance = () => { setSelected(null); setConfidence(0); session.next(); };
  const restart = () => { setSelected(null); setConfidence(0); session.start(); };

  if (session.state === 'loading' || session.state === 'idle') return <Spinner />;
  if (session.state === 'error') {
    return <EmptyState icon={icon} title="Couldn't start" action={<button className="btn btn-primary" onClick={session.start}>Try again</button>}>{session.error}</EmptyState>;
  }
  if (session.state === 'done' && !session.result) {
    return <EmptyState icon={icon} title="No content available">Ask an admin to add items for this module.</EmptyState>;
  }
  if (session.result && session.state !== 'active') {
    return (
      <div className="trainer">
        <PageHeader title={title} />
        <SessionResult result={session.result} gamified={user?.gamified} onRestart={restart} />
      </div>
    );
  }

  const { item, position, length, deadline, timeLimitSec } = session.current;
  const fb = session.feedback;

  return (
    <div className="trainer">
      <PageHeader title={title} subtitle={subtitle} />

      <div className="trainer-top">
        <div className="trainer-progress">
          <Meter value={position - (fb ? 0 : 1)} max={length} />
          <span className="trainer-count">{position} / {length}</span>
        </div>
        <div className="trainer-tags">
          <span className="pill">{item.difficulty}</span>
          {timeLimitSec && !fb && deadline && <Timer deadline={deadline} onExpire={onExpire} />}
          {session.meta?.mode === 'adaptive' && <span className="pill pill-teal"><Icon name="target" size={13} /> Adaptive</span>}
        </div>
      </div>

      <div className="card" style={{ padding: '1.2rem' }}>
        {renderContext?.(item)}
        <h3 style={{ marginTop: renderContext ? '0.6rem' : 0, marginBottom: '1rem' }}>{item.prompt}</h3>

        <div className="mcq-options">
          {item.options.map((opt, i) => {
            let cls = 'mcq-option';
            if (fb) {
              if (i === fb.correctIndex) cls += ' correct';
              else if (i === selected) cls += ' wrong';
            } else if (i === selected) cls += ' selected';
            return (
              <button key={i} className={cls} disabled={Boolean(fb) || submitting} onClick={() => answer(i)}>
                <span className="mcq-letter">{LETTERS[i]}</span>
                <span>
                  {opt}
                  {fb && item.optionNotes?.[i] && <span className="mcq-note">{item.optionNotes[i]}</span>}
                </span>
                {fb && i === fb.correctIndex && <span style={{ marginLeft: 'auto', color: 'var(--success)' }}><Icon name="check" size={18} /></span>}
              </button>
            );
          })}
        </div>

        {showConfidence && !fb && (
          <div style={{ marginTop: '1rem' }}><Confidence value={confidence} onChange={setConfidence} disabled={submitting} /></div>
        )}
      </div>

      {fb && (
        <div className="feedback card" style={{ padding: '1.1rem' }}>
          <div className="feedback-head">
            <h3>{fb.timedOut ? 'Time ran out' : fb.correct ? 'Correct' : 'Not quite'}</h3>
            <span className={`pill ${fb.correct ? 'pill-success' : fb.timedOut ? 'pill-amber' : 'pill-danger'}`}>
              <Icon name={fb.correct ? 'check' : fb.timedOut ? 'clock' : 'x'} size={13} />
              {fb.correct ? 'Correct' : fb.timedOut ? 'Timed out' : 'Incorrect'}
            </span>
          </div>
          <p>{fb.explanation}</p>
          {fb.redFlags?.length > 0 && (
            <div className="cue-review">
              <p className="muted" style={{ fontSize: '0.85rem', fontWeight: 600 }}>Red flags:</p>
              {fb.redFlags.map((r) => (
                <div key={r} className="cue-item cue-missed"><span className="cue-icon"><Icon name="flag" size={15} /></span><div className="cue-expl" style={{ marginTop: 0 }}>{r}</div></div>
              ))}
            </div>
          )}
          {fb.recommendedAction && (
            <div className="banner banner-teal takeaway"><Icon name="shield" size={18} /><span><strong>Do this instead:</strong> {fb.recommendedAction}</span></div>
          )}
          <button className="btn btn-primary btn-block" onClick={advance}>
            {session.result ? 'See results' : 'Next'} <Icon name="arrow" size={16} />
          </button>
        </div>
      )}
    </div>
  );
}
