import { useNavigate } from 'react-router-dom';
import Icon from './ui/Icon';

// Shown when a training session finishes. Rewards are only displayed for gamified users;
// the control group sees the score and a plain "done".
export default function SessionResult({ result, gamified, onRestart, title = 'Session complete' }) {
  const navigate = useNavigate();
  return (
    <div className="result-card card">
      <div className="empty-icon"><Icon name="shield" size={26} /></div>
      <h2>{title}</h2>
      <div className="result-score">{result.moduleScore ?? result.sessionScore}%</div>
      <p className="muted">{result.correct} of {result.total} correct this round</p>

      {gamified && (
        <div className="result-rewards">
          {result.xpGained > 0 && <span className="pill pill-teal"><Icon name="spark" size={13} /> +{result.xpGained} XP</span>}
          {result.leveledUp && <span className="pill pill-amber"><Icon name="trophy" size={13} /> Level up: {result.level?.name}</span>}
          {(result.newBadges || []).map((b) => <span key={b} className="pill pill-success"><Icon name="check" size={13} /> New badge</span>)}
        </div>
      )}

      <div className="result-actions">
        <button className="btn btn-primary" onClick={onRestart}>Practise again</button>
        <button className="btn btn-ghost" onClick={() => navigate('/dashboard')}>Back to dashboard</button>
      </div>
    </div>
  );
}
