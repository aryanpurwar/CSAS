import { useCallback, useEffect, useRef, useState } from 'react';
import api, { apiMessage } from '../api/client';

// Drives any training or assessment session: start, pull the next item, submit an answer.
// It keeps the server as the source of truth (position, length, timer deadline) and never
// holds answer keys. `startPath` differs for training vs assessment.
export function useSession({ startPath, autoStart = true }) {
  const [state, setState] = useState('idle'); // idle | loading | active | feedback | done | error
  const [sessionId, setSessionId] = useState(null);
  const [current, setCurrent] = useState(null); // { position, length, item, servedAt, deadline, timeLimitSec }
  const [feedback, setFeedback] = useState(null);
  const [result, setResult] = useState(null);
  const [meta, setMeta] = useState(null); // { mode, timeLimitSec, phase, form }
  const [error, setError] = useState('');
  const startedRef = useRef(false);

  const loadNext = useCallback(async (sid) => {
    const { data } = await api.post(`/training/sessions/${sid}/next`);
    if (data.done) { setState('done'); setCurrent(null); return; }
    setCurrent(data);
    setFeedback(null);
    setState('active');
  }, []);

  const start = useCallback(async () => {
    setState('loading');
    setError('');
    setFeedback(null);
    setResult(null);
    try {
      const { data } = await api.post(startPath);
      setSessionId(data.sessionId);
      setMeta({ mode: data.mode, timeLimitSec: data.timeLimitSec, phase: data.phase, form: data.form, length: data.length });
      await loadNext(data.sessionId);
    } catch (err) {
      setError(apiMessage(err, 'Could not start the session.'));
      setState('error');
    }
  }, [startPath, loadNext]);

  useEffect(() => {
    if (!autoStart || startedRef.current) return;
    startedRef.current = true;
    start();
  }, [autoStart, start]);

  const submit = useCallback(async (answer) => {
    if (!current) return null;
    try {
      const { data } = await api.post(`/training/sessions/${sessionId}/answer`, { itemId: current.item.id, answer });
      setFeedback(data.feedback);
      if (data.result) setResult(data.result);
      setState('feedback');
      return data;
    } catch (err) {
      // A duplicate/expired answer means the session moved on; re-sync.
      setError(apiMessage(err, 'Could not record that answer.'));
      if (err?.response?.data?.code === 'ALREADY_ANSWERED') await loadNext(sessionId);
      return null;
    }
  }, [current, sessionId, loadNext]);

  const next = useCallback(() => loadNext(sessionId), [loadNext, sessionId]);

  return { state, current, feedback, result, meta, error, start, submit, next };
}
