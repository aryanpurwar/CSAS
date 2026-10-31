import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import api, { apiMessage } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';

import EmailInspector from '../components/inspector/EmailInspector';
import Confidence from '../components/ui/Confidence';
import { PageHeader, Spinner, Meter } from '../components/ui/common';
import Icon from '../components/ui/Icon';
import './Study.css';

const PHASE_LABEL = { pre: 'Pre-test', post: 'Post-test', retention: 'Retention test' };

export default function Study() {
  const { user, setUser } = useAuth();
  const toast = useToast();
  const [status, setStatus] = useState(null);
  const [sus, setSus] = useState(null);
  const [assessment, setAssessment] = useState(null); // { sessionId, phase }

  const load = useCallback(() => {
    Promise.all([api.get('/study/status'), api.get('/study/sus')]).then(([s, su]) => { setStatus(s.data); setSus(su.data); });
  }, []);
  useEffect(() => { load(); }, [load]);

  if (assessment) return <AssessmentRunner phase={assessment.phase} onDone={() => { setAssessment(null); load(); }} />;
  if (!status) return <Spinner />;

  return (
    <div className="stack" style={{ gap: '1.4rem' }}>
      <PageHeader title="Research study" subtitle="This platform measures whether its training changes real phishing-detection skill." />

      {!status.enrolled ? (
        <Consent onDone={(u) => { setUser(u); load(); }} />
      ) : (
        <>
          <div className="banner banner-teal"><Icon name="book" size={18} /><span>You're enrolled as participant <strong>{user.participantCode}</strong>. Your responses are stored under this code, not your name.</span></div>

          <div className="phase-grid">
            {['pre', 'post', 'retention'].map((phase) => {
              const p = status.phases[phase];
              return (
                <div key={phase} className={`phase-card card ${p.done ? 'done' : p.available ? 'open' : 'locked'}`}>
                  <div className="phase-top">
                    <h3>{PHASE_LABEL[phase]}</h3>
                    {p.done ? <span className="pill pill-success"><Icon name="check" size={12} /> Done</span>
                      : p.available ? <span className="pill pill-teal">Open</span>
                      : <span className="pill">Locked</span>}
                  </div>
                  <p className="muted phase-desc">
                    {phase === 'pre' && 'Baseline: your skill before training.'}
                    {phase === 'post' && `After at least ${status.postTestMinSessions} training sessions.`}
                    {phase === 'retention' && `${status.phases.retention.opensAt ? 'Opens later to test what you retained.' : 'Available after the post-test.'}`}
                  </p>
                  {p.done && p.result && <p className="faint" style={{ fontSize: '0.84rem' }}>Score: {Math.round((p.result.meanScore ?? 0) * 100)}%</p>}
                  {!p.done && p.available && <button className="btn btn-primary btn-sm" onClick={() => startPhase(phase, setAssessment, toast)}>Start {PHASE_LABEL[phase].toLowerCase()}</button>}
                  {!p.done && !p.available && phase === 'post' && <p className="faint" style={{ fontSize: '0.82rem' }}>{status.trainingSessions}/{status.postTestMinSessions} sessions done</p>}
                </div>
              );
            })}
          </div>

          <div className="card sus-card">
            <h3><Icon name="spark" size={17} /> Usability questionnaire</h3>
            {sus?.submitted ? (
              <p className="muted">Thank you — your usability score of <strong>{sus.score}</strong> is recorded.</p>
            ) : (
              <SusForm onDone={load} />
            )}
          </div>
        </>
      )}
    </div>
  );
}

async function startPhase(phase, setAssessment, toast) {
  try {
    const { data } = await api.post(`/study/assessments/${phase}/start`);
    setAssessment({ sessionId: data.sessionId, phase });
  } catch (err) {
    toast.error(apiMessage(err));
  }
}

function Consent({ onDone }) {
  const toast = useToast();
  const [study, setStudy] = useState(false);
  const [campaigns, setCampaigns] = useState(false);
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    setBusy(true);
    try {
      const { data } = await api.post('/study/consent', { study, campaigns });
      toast.success('Thanks for joining the study.');
      onDone(data);
    } catch (err) {
      toast.error(apiMessage(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="card consent">
      <h2>Join the study</h2>
      <p className="muted">Participation is voluntary and you can withdraw at any time. Here is what it involves.</p>
      <ul className="consent-points">
        <li><Icon name="check" size={16} /> You take a short pre-test, train over some weeks, then a post-test and a retention test.</li>
        <li><Icon name="check" size={16} /> You're randomly assigned to one of two training styles; you may not get the gamified version.</li>
        <li><Icon name="check" size={16} /> Data is stored under an anonymous participant code and used only for this project.</li>
        <li><Icon name="check" size={16} /> No real passwords or personal messages are ever collected.</li>
      </ul>
      <label className="consent-check">
        <input type="checkbox" checked={study} onChange={(e) => setStudy(e.target.checked)} />
        <span>I consent to take part in the study and to my anonymised responses being analysed.</span>
      </label>
      <label className="consent-check">
        <input type="checkbox" checked={campaigns} onChange={(e) => setCampaigns(e.target.checked)} />
        <span>I agree to receive simulated phishing emails as part of the awareness programme (optional).</span>
      </label>
      <button className="btn btn-primary" disabled={!study || busy} onClick={submit}>{busy ? <span className="spinner" /> : 'Join study'}</button>
      <p className="faint" style={{ fontSize: '0.8rem' }}>This mirrors a real ethics-approved consent form. For a live study, use your institution's approved wording.</p>
    </div>
  );
}

const SUS_ITEMS = [
  'I think I would like to use this system frequently.',
  'I found the system unnecessarily complex.',
  'I thought the system was easy to use.',
  'I think I would need support from a technical person to use this system.',
  'I found the various functions in this system were well integrated.',
  'I thought there was too much inconsistency in this system.',
  'I would imagine most people would learn to use this system very quickly.',
  'I found the system very cumbersome to use.',
  'I felt very confident using the system.',
  'I needed to learn a lot of things before I could get going with this system.',
];

function SusForm({ onDone }) {
  const toast = useToast();
  const [answers, setAnswers] = useState(Array(10).fill(0));
  const [busy, setBusy] = useState(false);
  const complete = answers.every((a) => a > 0);

  const submit = async () => {
    setBusy(true);
    try {
      await api.post('/study/sus', { answers });
      toast.success('Usability questionnaire submitted. Thank you.');
      onDone();
    } catch (err) {
      toast.error(apiMessage(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="sus-form">
      <p className="muted" style={{ fontSize: '0.88rem' }}>Rate each statement from 1 (strongly disagree) to 5 (strongly agree).</p>
      {SUS_ITEMS.map((item, i) => (
        <div key={i} className="sus-item">
          <span className="sus-q">{i + 1}. {item}</span>
          <div className="sus-scale" role="radiogroup" aria-label={item}>
            {[1, 2, 3, 4, 5].map((v) => (
              <button key={v} role="radio" aria-checked={answers[i] === v} className={`sus-dot ${answers[i] === v ? 'active' : ''}`}
                onClick={() => setAnswers((a) => a.map((x, idx) => (idx === i ? v : x)))}>{v}</button>
            ))}
          </div>
        </div>
      ))}
      <button className="btn btn-primary" disabled={!complete || busy} onClick={submit}>{busy ? <span className="spinner" /> : 'Submit questionnaire'}</button>
    </div>
  );
}

// Assessments reuse the email inspector but give NO feedback between items. The study
// endpoint only starts the session; items are then served and answered through the same
// generic session endpoints as training, so grading stays in one place on the server.
function AssessmentRunner({ phase, onDone }) {
  const [flags, setFlags] = useState([]);
  const [confidence, setConfidence] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [started, setStarted] = useState(false);
  const [sessionId, setSessionId] = useState(null);
  const [current, setCurrent] = useState(null);
  const [done, setDone] = useState(false);
  const toast = useToast();

  const loadNext = useCallback(async (sid) => {
    const { data } = await api.post(`/training/sessions/${sid}/next`);
    if (data.done) { setDone(true); setCurrent(null); return; }
    setCurrent(data); setFlags([]); setConfidence(0);
  }, []);

  useEffect(() => {
    (async () => {
      try {
        const { data } = await api.post(`/study/assessments/${phase}/start`);
        setSessionId(data.sessionId);
        setStarted(true);
        await loadNext(data.sessionId);
      } catch (err) {
        toast.error(apiMessage(err));
        onDone();
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const decide = async (verdict) => {
    if (!confidence) return;
    setSubmitting(true);
    try {
      const { data } = await api.post(`/training/sessions/${sessionId}/answer`, { itemId: current.item.id, answer: { verdict, flags, confidence } });
      if (data.finished) { setDone(true); setCurrent(null); }
      else await loadNext(sessionId);
    } catch (err) {
      toast.error(apiMessage(err));
    } finally {
      setSubmitting(false);
    }
  };

  if (!started || (!current && !done)) return <Spinner label="Preparing assessment" />;

  if (done) {
    return (
      <div className="stack" style={{ gap: '1.2rem' }}>
        <PageHeader title={`${PHASE_LABEL[phase]} complete`} />
        <div className="card result-card">
          <div className="empty-icon"><Icon name="check" size={26} /></div>
          <h2>Thank you</h2>
          <p className="muted" style={{ maxWidth: '44ch' }}>Your responses are recorded. To keep the measurement fair, assessments don't show per-question feedback.</p>
          <button className="btn btn-primary" onClick={onDone}>Back to study</button>
        </div>
      </div>
    );
  }

  const toggleFlag = (id) => setFlags((f) => (f.includes(id) ? f.filter((x) => x !== id) : [...f, id]));

  return (
    <div className="trainer">
      <PageHeader title={PHASE_LABEL[phase]} subtitle="Assessment in progress — no feedback is shown between emails." />
      <div className="banner banner-amber"><Icon name="alert" size={18} /><span>This is a measured assessment. Take your time and answer as you would in real life.</span></div>
      <div className="trainer-top">
        <div className="trainer-progress"><Meter value={current.position - 1} max={current.length} /><span className="trainer-count">{current.position} / {current.length}</span></div>
      </div>
      <EmailInspector email={current.item} flags={flags} onToggleFlag={toggleFlag} disabled={submitting} />
      <div className="answer-panel card" style={{ padding: '1.1rem' }}>
        <Confidence value={confidence} onChange={setConfidence} disabled={submitting} />
        <div className="verdict-bar">
          <button className="btn btn-legit btn-lg" disabled={submitting || !confidence} onClick={() => decide('legit')}><Icon name="check" size={18} /> Legitimate</button>
          <button className="btn btn-phish btn-lg" disabled={submitting || !confidence} onClick={() => decide('phish')}><Icon name="alert" size={18} /> Phishing</button>
        </div>
      </div>
    </div>
  );
}
