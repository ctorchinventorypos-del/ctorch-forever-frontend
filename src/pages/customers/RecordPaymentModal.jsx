// ============================================================
//  Record a payment from a customer. Lowers their balance,
//  never below zero. After saving, you can print a receipt that
//  shows the amount paid and the balance remaining.
// ============================================================
import { useState } from 'react';
import Modal from '../../components/Modal';
import { api } from '../../api/client';
import { naira } from '../../utils/format';
import { useCompany } from '../../context/CompanyContext';

export default function RecordPaymentModal({ customer, onClose, onSaved }) {
  const { active } = useCompany();
  const [amount, setAmount] = useState('');
  const [method, setMethod] = useState('cash');
  const [note, setNote] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(null); // { payment_id, amount, new_balance }

  async function save() {
    setError('');
    const amt = Number(amount);
    if (!amt || amt <= 0) return setError('Enter an amount greater than 0.');

    // Extra care for bulk resellers: confirm before recording.
    if (customer.customer_type === 'reseller') {
      const ok = window.confirm(
        `This is a payment for a BULK RESELLER (${customer.name}).\n\n` +
        `Amount: ${naira(amt)} (${method}).\n\nPlease confirm this is correct before recording.`
      );
      if (!ok) return;
    }

    setBusy(true);
    try {
      // Duplicate guard: warn if the same amount was already recorded today.
      try {
        const detail = await api(`/customers/${customer.id}`);
        const today = new Date().toDateString();
        const dup = (detail.payments || []).some(
          (p) => Number(p.amount) === amt && new Date(p.created_at).toDateString() === today
        );
        if (dup) {
          const ok = window.confirm(
            `A payment of ${naira(amt)} was already recorded for ${customer.name} today.\n\n` +
            `This may be a duplicate. Record it anyway?`
          );
          if (!ok) { setBusy(false); return; }
        }
      } catch (_) { /* if the check fails, don't block the payment */ }

      const res = await api('/payments', {
        method: 'POST',
        body: { customer_id: customer.id, amount: amt, payment_method: method, note: note.trim() || null },
      });
      setDone(res);
      onSaved(); // refresh the balance behind the modal
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  function printReceipt() {
    window.open(`/payment-receipt.html?id=${done.payment_id}`, '_blank');
  }

  // success state
  if (done) {
    return (
      <Modal
        title="Payment recorded"
        onClose={onClose}
        footer={
          <>
            <button className="btn btn-ghost" onClick={onClose}>Done</button>
            <button className="btn btn-primary" onClick={printReceipt}>🖨️ Print receipt</button>
          </>
        }
      >
        <div className="success-card" style={{ padding: '14px 4px' }}>
          <div className="big">✅</div>
          <p style={{ margin: '6px 0' }}>
            <b>{naira(done.amount)}</b> received from {customer.name}.
          </p>
          <p className="subtle">Balance remaining: <b className="owed">{naira(done.new_balance)}</b></p>
        </div>
      </Modal>
    );
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
        <label>Payment method</label>
        <div className="seg">
          {[['cash', 'Cash'], ['transfer', 'Transfer'], ['pos', 'POS card'], ['cheque', 'Cheque']].map(([k, lbl]) => (
            <button key={k} className={method === k ? 'on' : ''} onClick={() => setMethod(k)}>{lbl}</button>
          ))}
        </div>
      </div>
      <div className="field">
        <label>Note (optional)</label>
        <input className="input" value={note} onChange={(e) => setNote(e.target.value)} placeholder="e.g. part payment" />
      </div>
    </Modal>
  );
}
