import { useEffect, useState } from 'react';
import api, { apiMessage } from '../../api/client';
import { useToast } from '../../context/ToastContext';
import { PageHeader, Spinner } from '../../components/ui/common';
import Icon from '../../components/ui/Icon';
import AdminTabs from './AdminTabs';
import './Admin.css';

const TYPES = [
  { key: 'phishing', label: 'Phishing emails' },
  { key: 'social', label: 'Social engineering' },
  { key: 'quiz', label: 'Quiz' },
  { key: 'password', label: 'Password' },
];

export default function AdminContent() {
  const toast = useToast();
  const [type, setType] = useState('phishing');
  const [items, setItems] = useState(null);

  const load = (t) => { setItems(null); api.get(`/admin/content/${t}`).then((r) => setItems(r.data)); };
  useEffect(() => { load(type); }, [type]);

  const toggle = async (item) => {
    try { await api.patch(`/admin/content/${type}/${item._id}`, { active: !item.active }); load(type); }
    catch (err) { toast.error(apiMessage(err)); }
  };
  const remove = async (item) => {
    if (!window.confirm('Delete this item? Only possible if no one has answered it.')) return;
    try { await api.delete(`/admin/content/${type}/${item._id}`); toast.success('Deleted.'); load(type); }
    catch (err) { toast.error(apiMessage(err)); }
  };

  return (
    <div className="stack" style={{ gap: '1.2rem' }}>
      <PageHeader title="Content & item analysis" subtitle="Review items and how they perform. Items with responses are retired, not deleted, to protect study data." />
      <AdminTabs />

      <div className="content-tabs">
        {TYPES.map((t) => (
          <button key={t.key} className={`content-chip ${type === t.key ? 'active' : ''}`} onClick={() => setType(t.key)}>{t.label}</button>
        ))}
      </div>

      {!items ? <Spinner /> : (
        <div className="card">
          {items.length === 0 ? <p className="muted" style={{ padding: '1rem' }}>No items.</p> : items.map((item) => (
            <div key={item._id} className="item-row">
              <div className="item-main">
                <div className="item-title">{item.title || item.prompt}</div>
                <div className="item-meta">
                  <span className="pill">{item.difficulty}</span>
                  {type === 'phishing' && <span className={`pill ${item.isPhishing ? 'pill-danger' : 'pill-success'}`}>{item.isPhishing ? 'phishing' : 'legit'}</span>}
                  {type === 'phishing' && <span className="pill">{item.pool}</span>}
                  {!item.active && <span className="pill pill-amber">retired</span>}
                  <span className="faint">rating {Math.round(item.rating)}</span>
                </div>
              </div>
              <div className="row" style={{ gap: '0.8rem', alignItems: 'flex-start' }}>
                <div className="item-stats">
                  {item.stats?.n > 0 ? (
                    <>
                      <div>{item.stats.n} answers</div>
                      <div>{Math.round((item.stats.accuracy ?? 0) * 100)}% correct</div>
                      {item.stats.meanDecisionSec && <div className="faint">{item.stats.meanDecisionSec}s avg</div>}
                    </>
                  ) : <span className="faint">no data</span>}
                </div>
                <div className="stack" style={{ gap: '0.3rem' }}>
                  <button className="btn btn-sm" onClick={() => toggle(item)}>{item.active ? 'Retire' : 'Restore'}</button>
                  {item.stats?.n === 0 && <button className="btn btn-sm btn-danger" onClick={() => remove(item)}>Delete</button>}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
