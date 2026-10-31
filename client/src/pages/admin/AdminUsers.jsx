import { useEffect, useState } from 'react';
import api, { apiMessage } from '../../api/client';
import { useToast } from '../../context/ToastContext';
import { PageHeader, Spinner } from '../../components/ui/common';
import Icon from '../../components/ui/Icon';
import AdminTabs from './AdminTabs';
import './Admin.css';

export default function AdminUsers() {
  const toast = useToast();
  const [users, setUsers] = useState(null);

  const load = () => api.get('/admin/users').then((r) => setUsers(r.data));
  useEffect(() => { load(); }, []);

  const update = async (id, body) => {
    try { await api.patch(`/admin/users/${id}`, body); toast.success('Updated.'); load(); }
    catch (err) { toast.error(apiMessage(err)); }
  };

  if (!users) return <Spinner />;

  return (
    <div className="stack" style={{ gap: '1.2rem' }}>
      <PageHeader title="Participants" subtitle={`${users.length} accounts`} />
      <AdminTabs />
      <div className="card admin-table-wrap">
        <table className="admin-table">
          <thead>
            <tr><th>Code</th><th>Name</th><th>Role</th><th>Group</th><th>Consent</th><th>Training</th><th>2FA</th><th>Actions</th></tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.id}>
                <td className="mono">{u.participantCode}</td>
                <td><div>{u.name}</div><div className="faint" style={{ fontSize: '0.78rem' }}>{u.email}</div></td>
                <td>
                  <select className="admin-select" value={u.role} onChange={(e) => update(u.id, { role: e.target.value })}>
                    <option value="student">student</option>
                    <option value="admin">admin</option>
                  </select>
                </td>
                <td>{u.studyGroup ? <span className={`pill ${u.studyGroup === 'adaptive' ? 'pill-teal' : 'pill-amber'}`}>{u.studyGroup}</span> : <span className="faint">—</span>}</td>
                <td>
                  <div className="row" style={{ gap: '0.3rem' }}>
                    {u.consent.study && <span className="pill pill-success" title="Study"><Icon name="check" size={11} /> S</span>}
                    {u.consent.campaigns && <span className="pill pill-teal" title="Campaigns"><Icon name="mail" size={11} /> C</span>}
                    {!u.consent.study && !u.consent.campaigns && <span className="faint">—</span>}
                  </div>
                </td>
                <td className="mono">{u.trainingScore}%</td>
                <td>{u.mfaEnabled ? <Icon name="check" size={15} /> : <span className="faint">—</span>}</td>
                <td>
                  {u.locked
                    ? <button className="btn btn-sm" onClick={() => update(u.id, { unlock: true })}>Unlock</button>
                    : <span className="faint" style={{ fontSize: '0.8rem' }}>active</span>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
