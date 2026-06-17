// ============================================================
//  Record a payment from a customer. Lowers their balance,
//  never below zero.
// ============================================================
import { useState } from 'react';
import Modal from '../../components/Modal';
import { api } from '../../api/client';
import { naira } from '../../utils/format';

export default function RecordPaymentModal({ customer, onClose, onSaved }) {
  const [amount, setAmount] = useState('');
  const [note, setNote] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function save() {
    setError('');
    const amt = Number(amount);
    if (!amt || amt <= 0) return setError('Enter an amount greater than 0.');
    setBusy(true);
    try {
      await api('/payments', {
        method: 'POST',
        body: { customer_id: customer.id, amount: amt, note: note.trim() || null },
      });
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
      title={`Record payment — ${customer.name}`}
      onClose={onClose}
      footer={
        <>
          <button className="btn btn-ghost" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" onClick={save} disabled={busy}>
            {busy ? 'Saving…' : 'Record payment'}
          </button>
        </>
      }
    >
      {error && <div className="banner-error">{error}</div>}
      <p className="subtle" style={{ marginTop: 0 }}>
        Currently owes <b className="owed">{naira(customer.balance_owed)}</b>
      </p>
      <div className="field">
        <label>Amount paid</label>
        <input className="input" type="number" value={amount} autoFocus
          onChange={(e) => setAmount(e.target.value)} placeholder="0" />
      </div>
      <div className="field">
        <label>Note (optional)</label>
        <input className="input" value={note} onChange={(e) => setNote(e.target.value)} placeholder="e.g. part payment" />
      </div>
    </Modal>
  );
}
