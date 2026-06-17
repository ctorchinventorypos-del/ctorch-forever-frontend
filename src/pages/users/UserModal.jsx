// ============================================================
//  Add or edit a user. When editing, you can also reset their
//  password. An admin can't disable or demote their own account.
// ============================================================
import { useState } from 'react';
import Modal from '../../components/Modal';
import Tooltip from '../../components/Tooltip';
import { api } from '../../api/client';
import { useAuth } from '../../context/AuthContext';

export default function UserModal({ user, onClose, onSaved }) {
  const editing = !!user;
  const { user: me } = useAuth();
  const isSelf = editing && me?.id === user.id;

  const [form, setForm] = useState({
    username: user?.username || '',
    full_name: user?.full_name || '',
    role: user?.role || 'sales',
    is_active: user?.is_active ?? true,
    password: '',
  });
  const [newPass, setNewPass] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  async function save() {
    setError('');
    if (!editing) {
      if (!form.username.trim()) return setError('Enter a username.');
      if (!form.full_name.trim()) return setError('Enter a full name.');
      if (form.password.length < 6) return setError('Password must be at least 6 characters.');
    }
    setBusy(true);
    try {
      if (editing) {
        await api(`/users/${user.id}`, {
          method: 'PATCH',
          body: { full_name: form.full_name.trim(), role: form.role, is_active: form.is_active },
        });
        if (newPass) {
          if (newPass.length < 6) throw new Error('New password must be at least 6 characters.');
          await api(`/users/${user.id}/password`, { method: 'POST', body: { password: newPass } });
        }
      } else {
        await api('/users', {
          method: 'POST',
          body: {
            username: form.username.trim(),
            full_name: form.full_name.trim(),
            role: form.role,
            password: form.password,
          },
        });
      }
      onSaved();
      onClose();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal
      title={editing ? `Edit ${user.username}` : 'Add user'}
      onClose={onClose}
      footer={
        <>
          <button className="btn btn-ghost" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" onClick={save} disabled={busy}>{busy ? 'Saving…' : 'Save'}</button>
        </>
      }
    >
      {error && <div className="banner-error">{error}</div>}

      <div className="field">
        <label>Username</label>
        <input className="input" value={form.username} onChange={set('username')} disabled={editing} autoFocus={!editing} />
      </div>
      <div className="field">
        <label>Full name</label>
        <input className="input" value={form.full_name} onChange={set('full_name')} />
      </div>

      <div className="field">
        <label>Role <Tooltip text="Admins can manage users and prices. Sales users record sales, payments and stock but can't change prices or users." /></label>
        <select className="input" value={form.role} onChange={set('role')} disabled={isSelf}>
          <option value="sales">Sales</option>
          <option value="admin">Admin</option>
        </select>
        {isSelf && <small className="subtle">You can't change your own role.</small>}
      </div>

      {!editing && (
        <div className="field">
          <label>Password</label>
          <input className="input" type="password" value={form.password} onChange={set('password')} placeholder="at least 6 characters" />
        </div>
      )}

      {editing && (
        <>
          <div className="field">
            <label style={{ cursor: isSelf ? 'not-allowed' : 'pointer' }}>
              <input type="checkbox" checked={form.is_active} disabled={isSelf}
                onChange={(e) => setForm({ ...form, is_active: e.target.checked })} />
              {' '}Account active <Tooltip text="Turn this off to block this person from logging in, without deleting their account." />
            </label>
            {isSelf && <small className="subtle"> You can't disable your own account.</small>}
          </div>
          <div className="field">
            <label>Reset password (optional)</label>
            <input className="input" type="password" value={newPass} onChange={(e) => setNewPass(e.target.value)} placeholder="leave blank to keep current" />
          </div>
        </>
      )}
    </Modal>
  );
}
