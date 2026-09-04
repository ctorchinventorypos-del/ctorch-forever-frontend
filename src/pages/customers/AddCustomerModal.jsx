// ============================================================
//  Add a customer — either a credit customer or a bulk reseller,
//  set by the `type` prop. Reused by Sales and the Customers page.
// ============================================================
import { useState } from 'react';
import Modal from '../../components/Modal';
import { api } from '../../api/client';
import NumberField from '../../components/NumberField';

export default function AddCustomerModal({ type, onClose, onSaved }) {
  const [form, setForm] = useState({ name: '', phone: '', address: '', opening_balance: '' });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });
  const label = type === 'reseller' ? 'distributor' : type === 'general' ? 'general customer' : 'credit customer';

  async function save() {
    setError('');
    if ((form.name.trim().match(/[A-Za-z]/g) || []).length < 4) {
      return setError('Enter a proper name with at least 4 letters.');
    }
    setBusy(true);
    try {
      const created = await api('/customers', {
        method: 'POST',
        body: {
          customer_type: type,
          name: form.name.trim(),
          phone: form.phone.trim() || null,
          address: form.address.trim() || null,
          opening_balance: form.opening_balance === '' ? 0 : Number(form.opening_balance) || 0,
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
      {type !== 'general' && (
        <div className="field">
          <label>Amount already owed (optional)</label>
          <NumberField className="input" value={form.opening_balance} onChange={(v)=>setForm({...form,opening_balance:v})} placeholder="0" />
          <small className="subtle">If this {label} already owes money, enter it here. Leave 0 if not.</small>
        </div>
      )}
    </Modal>
  );
}
