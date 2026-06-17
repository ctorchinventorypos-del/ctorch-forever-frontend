// ============================================================
//  Add or edit a branch. A warehouse is just a branch with the
//  warehouse box ticked (only set when creating).
// ============================================================
import { useState } from 'react';
import Modal from '../../components/Modal';
import Tooltip from '../../components/Tooltip';
import { api } from '../../api/client';

export default function BranchModal({ branch, onClose, onSaved }) {
  const editing = !!branch;
  const [form, setForm] = useState({
    name: branch?.name || '',
    is_warehouse: branch?.is_warehouse || false,
    address: branch?.address || '',
    phone: branch?.phone || '',
  });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  async function save() {
    setError('');
    if (!form.name.trim()) return setError('Enter a branch name.');
    setBusy(true);
    try {
      if (editing) {
        await api(`/branches/${branch.id}`, {
          method: 'PUT',
          body: { name: form.name.trim(), address: form.address || null, phone: form.phone || null },
        });
      } else {
        await api('/branches', {
          method: 'POST',
          body: {
            name: form.name.trim(),
            is_warehouse: form.is_warehouse,
            address: form.address || null,
            phone: form.phone || null,
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
      title={editing ? 'Edit branch' : 'Add branch'}
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
        <label>Branch name</label>
        <input className="input" value={form.name} onChange={set('name')} autoFocus placeholder="e.g. Ikeja Branch" />
      </div>
      {!editing && (
        <div className="field">
          <label style={{ cursor: 'pointer' }}>
            <input type="checkbox" checked={form.is_warehouse}
              onChange={(e) => setForm({ ...form, is_warehouse: e.target.checked })} />
            {' '}This is a warehouse
            <Tooltip text="Tick this for a storage warehouse you transfer stock FROM. Leave it off for a normal selling branch." />
          </label>
        </div>
      )}
      <div className="field">
        <label>Address (optional)</label>
        <input className="input" value={form.address} onChange={set('address')} />
      </div>
      <div className="field">
        <label>Phone (optional)</label>
        <input className="input" value={form.phone} onChange={set('phone')} />
      </div>
    </Modal>
  );
}
