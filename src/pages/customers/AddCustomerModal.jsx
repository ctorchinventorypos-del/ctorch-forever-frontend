// ============================================================
//  Add a customer — either a credit customer or a bulk reseller,
//  set by the `type` prop. Reused by Sales and the Customers page.
// ============================================================
import { useState } from 'react';
import Modal from '../../components/Modal';
import { api } from '../../api/client';

export default function AddCustomerModal({ type, onClose, onSaved }) {
  const [form, setForm] = useState({ name: '', phone: '', address: '' });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });
  const label = type === 'reseller' ? 'bulk reseller' : 'credit customer';

  async function save() {
    setError('');
    setBusy(true);
    try {
      const created = await api('/customers', {
        method: 'POST',
        body: {
          customer_type: type,
          name: form.name.trim(),
          phone: form.phone.trim() || null,
          address: form.address.trim() || null,
        },
      });
      onSaved(created);
      onClose();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal
      title={`Add ${label}`}
      onClose={onClose}
      footer={
        <>
          <button className="btn btn-ghost" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" onClick={save} disabled={busy}>
            {busy ? 'Saving…' : 'Save'}
          </button>
        </>
      }
    >
      {error && <div className="banner-error">{error}</div>}
      <div className="field">
        <label>Name</label>
        <input className="input" value={form.name} onChange={set('name')} autoFocus />
      </div>
      <div className="field">
        <label>Phone number</label>
        <input className="input" value={form.phone} onChange={set('phone')} />
      </div>
      <div className="field">
        <label>Address (optional)</label>
        <input className="input" value={form.address} onChange={set('address')} />
      </div>
    </Modal>
  );
}
