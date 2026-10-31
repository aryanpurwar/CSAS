import { useEffect, useState } from 'react';
import Icon from './Icon';

// Visual countdown for timed modules. The server is authoritative on timing; this is a
// cue for the learner. When it hits zero it calls onExpire once.
export default function Timer({ deadline, onExpire }) {
  const [remaining, setRemaining] = useState(() => Math.max(0, new Date(deadline) - Date.now()));

  useEffect(() => {
    setRemaining(Math.max(0, new Date(deadline) - Date.now()));
    const id = setInterval(() => {
      const left = Math.max(0, new Date(deadline) - Date.now());
      setRemaining(left);
      if (left <= 0) { clearInterval(id); onExpire?.(); }
    }, 200);
    return () => clearInterval(id);
  }, [deadline, onExpire]);

  const secs = Math.ceil(remaining / 1000);
  const low = secs <= 10;
  return (
    <span className={`timer ${low ? 'timer-low' : ''}`} aria-live="off">
      <Icon name="clock" size={15} /> <span className="mono">{secs}s</span>
    </span>
  );
}
