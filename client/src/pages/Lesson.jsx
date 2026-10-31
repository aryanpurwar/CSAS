import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../api/client';
import { useAuth } from '../context/AuthContext';
import { cueLabel } from '../components/inspector/cueLabels';
import Icon from '../components/ui/Icon';
import './Public.css';

// Shown right after a participant clicks or "signs in" to a simulated phish. The whole
// point of a campaign: the teachable moment lands when the mistake is fresh.
export default function Lesson() {
  const { token } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [lesson, setLesson] = useState(null);

  useEffect(() => { api.get(`/track/${token}/lesson`).then((r) => setLesson(r.data)).catch(() => setLesson({ error: true })); }, [token]);

  if (!lesson) return null;

  return (
    <div className="public-wrap lesson-wrap">
      <div className="lesson card">
        <div className="lesson-badge"><Icon name="shield" size={20} /> Security awareness exercise</div>
        <h1>{lesson.submitted ? 'If this were real, your account would now be compromised.' : 'That was a simulated phishing email.'}</h1>
        <p className="muted">
          No harm done — this was a controlled exercise. But a real attacker would now have
          {lesson.submitted ? ' the credentials you entered.' : ' tricked you into clicking.'} Here's how to spot it next time.
        </p>

        {lesson.cues?.length > 0 && (
          <div className="lesson-cues">
            <h3>What gave it away</h3>
            {lesson.cues.map((c, i) => (
              <div key={i} className="cue-item cue-missed">
                <span className="cue-icon"><Icon name="flag" size={15} /></span>
                <div><div className="cue-label">{cueLabel(c.type)}</div><div className="cue-expl">{c.explanation}</div></div>
              </div>
            ))}
          </div>
        )}

        {lesson.takeaway && <div className="banner banner-teal"><Icon name="spark" size={18} /><span>{lesson.takeaway}</span></div>}

        <div className="lesson-actions">
          <button className="btn btn-primary" onClick={() => navigate(user ? '/train/phishing' : '/login')}>
            {user ? 'Practise spotting these' : 'Sign in to train'}
          </button>
          {user && <button className="btn btn-ghost" onClick={() => navigate('/dashboard')}>Go to dashboard</button>}
        </div>
      </div>
    </div>
  );
}
