import { useEffect, useState } from 'react';
import api, { apiMessage } from '../api/client';
import { useToast } from '../context/ToastContext';
import { useAuth } from '../context/AuthContext';
import { PageHeader, EmptyState, Spinner } from '../components/ui/common';
import Icon from '../components/ui/Icon';
import './Inbox.css';

export default function Inbox() {
  const toast = useToast();
  const { refresh } = useAuth();
  const [messages, setMessages] = useState(null);
  const [open, setOpen] = useState(null);
  const [hoverHref, setHoverHref] = useState(null);

  const load = () => api.get('/inbox').then((r) => setMessages(r.data)).catch(() => setMessages([]));
  useEffect(() => { load(); }, []);

  const openMessage = async (m) => {
    setOpen(m);
    if (!m.opened) { try { await api.post(`/inbox/${m.id}/open`); } catch { /* ignore */ } }
  };

  const report = async (m) => {
    try {
      const res = await api.post(`/inbox/${m.id}/report`);
      toast.success(res.data.wasSimulation ? 'Reported. This was a simulated phish — well spotted.' : 'Reported. Note: this one was legitimate.');
      await load();
      await refresh();
      setOpen(null);
    } catch (err) {
      toast.error(apiMessage(err));
    }
  };

  // A click in the inbox follows the tracked link so the campaign can measure clicks,
  // then returns the learner to a teachable-moment lesson.
  const clickLink = (part) => {
    if (part.trackUrl) window.location.href = part.trackUrl;
  };

  if (messages === null) return <Spinner />;

  return (
    <div className="stack" style={{ gap: '1.2rem' }}>
      <PageHeader title="Inbox" subtitle="Messages delivered to you as part of the awareness programme. Some may be simulated phishing." />
      {messages.length === 0 ? (
        <EmptyState icon="inbox" title="Your inbox is empty">When an administrator runs an awareness campaign you consented to, messages appear here.</EmptyState>
      ) : (
        <div className="inbox-layout">
          <ul className="msg-list">
            {messages.map((m) => (
              <li key={m.id}>
                <button className={`msg-row ${open?.id === m.id ? 'active' : ''} ${m.opened ? '' : 'unread'}`} onClick={() => openMessage(m)}>
                  <div className="msg-row-top">
                    <span className="msg-from">{m.fromName}</span>
                    {m.reported && <span className="pill pill-success"><Icon name="flag" size={11} /> Reported</span>}
                  </div>
                  <span className="msg-subj">{m.subject}</span>
                  <span className="faint msg-date">{new Date(m.deliveredAt).toLocaleDateString()}</span>
                </button>
              </li>
            ))}
          </ul>

          <div className="msg-view card">
            {!open ? (
              <div className="full-center" style={{ minHeight: '300px' }}><p className="faint">Select a message to read it.</p></div>
            ) : (
              <>
                <div className="msg-view-head">
                  <h2>{open.subject}</h2>
                  <button className="btn btn-sm" onClick={() => report(open)} disabled={open.reported}>
                    <Icon name="flag" size={15} /> {open.reported ? 'Reported' : 'Report phishing'}
                  </button>
                </div>
                <div className="msg-meta mono">
                  <div><span className="faint">From:</span> {open.fromName} &lt;{open.fromAddress}&gt;</div>
                  {open.replyTo && <div><span className="faint">Reply-To:</span> {open.replyTo}</div>}
                </div>
                <div className="msg-body">
                  {open.parts.map((p) => {
                    if (p.kind === 'link') {
                      return (
                        <p key={p.id}>
                          <a
                            href={p.trackUrl || '#'}
                            onClick={(e) => { e.preventDefault(); clickLink(p); }}
                            onMouseEnter={() => setHoverHref(p.href)}
                            onMouseLeave={() => setHoverHref(null)}
                          >
                            <Icon name="link" size={14} /> {p.text}
                          </a>
                        </p>
                      );
                    }
                    if (p.kind === 'attachment') return <p key={p.id}><span className="msg-attach"><Icon name="download" size={14} /> {p.text}</span></p>;
                    return <p key={p.id}>{p.text}</p>;
                  })}
                </div>
                <div className="status-bar">
                  {hoverHref ? <><Icon name="link" size={13} /> <span className="mono">{hoverHref}</span></> : <span className="faint">Hover a link before clicking to see where it really goes.</span>}
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
