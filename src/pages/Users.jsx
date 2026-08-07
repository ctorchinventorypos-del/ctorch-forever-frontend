// ============================================================
//  Users (admin only): create users, set their role, disable
//  access, and reset passwords.
// ============================================================
import { useEffect, useState, useCallback } from 'react';
import { api } from '../api/client';
import Tooltip from '../components/Tooltip';
import Spinner from '../components/Spinner';
import Modal from '../components/Modal';
import UserModal from './users/UserModal';

export default function Users() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(null); // user object or 'new'
  const [historyUser, setHistoryUser] = useState(null); // user whose logins we're viewing

  const load = useCallback(() => {
    setLoading(true);
    api('/users', { company: false }).then(setRows).catch(() => {}).finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);

  const fmt = (d) => (d ? new Date(d).toLocaleDateString('en-NG', { day: '2-digit', month: 'short', year: 'numeric' }) : 'never');

  return (
    <div>
      <div className="page-head">
        <h1>Users</h1>
        <Tooltip text="The people who can sign in. Give each person their own account, set them as admin or sales, and disable access when someone leaves." />
        <div className="spacer" />
        <button className="btn btn-primary" onClick={() => setEditing('new')}>+ Add user</button>
      </div>

      {loading ? (
        <Spinner full />
      ) : (
        <div className="table-wrap">
          <table className="t">
            <thead>
              <tr><th>Name</th><th>Username</th><th>Role</th><th>Status</th><th>Last login</th><th></th></tr>
            </thead>
            <tbody>
              {rows.map((u) => (
                <tr key={u.id}>
                  <td>{u.full_name}</td>
                  <td className="subtle">{u.username}</td>
                  <td><span className={`tag ${u.role === 'admin' ? 'tag-wh' : 'tag-store'}`}>{u.role}</span></td>
                  <td>
                    {u.is_active
                      ? <span style={{ color: 'var(--green-700)', fontWeight: 700 }}>Active</span>
                      : <span style={{ color: 'var(--clay)', fontWeight: 700 }}>Disabled</span>}
                  </td>
                  <td className="subtle">{fmt(u.last_login)}</td>
                  <td className="num">
                    <button className="linkbtn" onClick={() => setHistoryUser(u)}>History</button>
                    {' · '}
                    <button className="linkbtn" onClick={() => setEditing(u)}>Manage</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {editing && (
        <UserModal
          user={editing === 'new' ? null : editing}
          onClose={() => setEditing(null)}
          onSaved={load}
        />
      )}

      {historyUser && <LoginHistoryModal user={historyUser} onClose={() => setHistoryUser(null)} />}
    </div>
  );
}

// Parse a rough device/browser label out of a user-agent string.
function deviceLabel(ua) {
  if (!ua) return 'Unknown device';
  let os = 'Unknown';
  if (/Windows/i.test(ua)) os = 'Windows';
  else if (/Android/i.test(ua)) os = 'Android';
  else if (/iPhone|iPad|iOS/i.test(ua)) os = 'iOS';
  else if (/Mac OS X|Macintosh/i.test(ua)) os = 'Mac';
  else if (/Linux/i.test(ua)) os = 'Linux';
  let browser = '';
  if (/Edg\//i.test(ua)) browser = 'Edge';
  else if (/OPR\/|Opera/i.test(ua)) browser = 'Opera';
  else if (/Chrome\//i.test(ua)) browser = 'Chrome';
  else if (/Firefox\//i.test(ua)) browser = 'Firefox';
  else if (/Safari\//i.test(ua)) browser = 'Safari';
  return browser ? `${browser} on ${os}` : os;
}

function LoginHistoryModal({ user, onClose }) {
  const [rows, setRows] = useState(null);
  useEffect(() => {
    api(`/users/${user.id}/logins`).then(setRows).catch(() => setRows([]));
  }, [user.id]);
  const fmt = (d) => new Date(d).toLocaleString('en-NG', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  return (
    <Modal title={`Login history — ${user.full_name}`} wide onClose={onClose} footer={<button className="btn btn-ghost" onClick={onClose}>Close</button>}>
      {!rows ? <Spinner full /> : rows.length === 0 ? (
        <p className="subtle">No logins recorded yet.</p>
      ) : (
        <div className="table-wrap">
          <table className="t">
            <thead><tr><th>Date &amp; time</th><th>Device</th><th>IP address</th></tr></thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id}>
                  <td>{fmt(r.created_at)}</td>
                  <td>{deviceLabel(r.user_agent)}</td>
                  <td className="subtle">{r.ip || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="subtle" style={{ marginTop: 8 }}>Showing the most recent {rows.length} sign-in{rows.length === 1 ? '' : 's'}.</p>
        </div>
      )}
    </Modal>
  );
}
