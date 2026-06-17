// ============================================================
//  Users (admin only): create users, set their role, disable
//  access, and reset passwords.
// ============================================================
import { useEffect, useState, useCallback } from 'react';
import { api } from '../api/client';
import Tooltip from '../components/Tooltip';
import Spinner from '../components/Spinner';
import UserModal from './users/UserModal';

export default function Users() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(null); // user object or 'new'

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
                  <td className="num"><button className="linkbtn" onClick={() => setEditing(u)}>Manage</button></td>
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
    </div>
  );
}
