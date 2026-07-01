// ============================================================
//  Return products using the sale's invoice number.
//  Look the sale up, choose how many of each item to return, and submit.
//  Stock goes back; for credit/reseller sales the customer's balance drops.
// ============================================================
import { useState, useRef } from 'react';
import Modal from '../../components/Modal';
import { api } from '../../api/client';
import { naira } from '../../utils/format';

function newKey() {
  try { return crypto.randomUUID(); }
  catch (e) { return 'k-' + Date.now() + '-' + Math.random().toString(16).slice(2); }
}

export default function ReturnBySaleModal({ onClose, onSaved }) {
  const keyRef = useRef(newKey());
  const [invoice, setInvoice] = useState('');
  const [sale, setSale] = useState(null);
  const [qtys, setQtys] = useState({});     // product_id -> qty to return
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(null);

  async function lookup() {
    setError(''); setSale(null); setDone(null);
    if (!invoice.trim()) return setError('Enter an invoice number.');
    setBusy(true);
    try {
      const s = await api(`/sales/by-invoice/${encodeURIComponent(invoice.trim())}`);
      setSale(s);
      setQtys({});
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  async function submit() {
    setError('');
    const toReturn = (sale.items || [])
      .map((it) => ({ ...it, ret: parseInt(qtys[it.product_id], 10) || 0 }))
      .filter((it) => it.ret > 0);
    if (toReturn.length === 0) return setError('Enter a quantity to return for at least one item.');
    for (const it of toReturn) {
      if (it.ret > it.remaining) return setError(`Cannot return ${it.ret} of ${it.name}. Only ${it.remaining} left to return.`);
    }
    setBusy(true);
    try {
      let refund = 0;
      for (const it of toReturn) {
        const res = await api('/returns', {
          method: 'POST',
          headers: { 'Idempotency-Key': `${keyRef.current}-${sale.id}-${it.product_id}` },
          body: { sale_id: sale.id, product_id: it.product_id, quantity: it.ret },
        });
        refund += Number(res.refund_amount) || 0;
      }
      setDone({ refund });
      onSaved && onSaved();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  if (done) {
    return (
      <Modal title="Return recorded" onClose={onClose} footer={<button className="btn btn-primary" onClick={onClose}>Done</button>}>
        <div className="success-card" style={{ padding: '14px 4px' }}>
          <div className="big">✅</div>
          <p style={{ margin: '6px 0' }}>Return recorded and stock added back.</p>
          <p className="subtle">Value returned: <b>{naira(done.refund)}</b></p>
        </div>
      </Modal>
    );
  }

  return (
    <Modal
      title="Return by invoice"
      wide
      onClose={onClose}
      footer={
        <>
          <button className="btn btn-ghost" onClick={onClose}>Cancel</button>
          {sale && <button className="btn btn-primary" onClick={submit} disabled={busy}>{busy ? 'Recording…' : 'Record return'}</button>}
        </>
      }
    >
      {error && <div className="banner-error">{error}</div>}

      <div className="row2" style={{ alignItems: 'end' }}>
        <div className="field">
          <label>Invoice number</label>
          <input className="input" value={invoice} onChange={(e) => setInvoice(e.target.value)} placeholder="e.g. CTORCH-000001" onKeyDown={(e) => e.key === 'Enter' && lookup()} />
        </div>
        <div className="field">
          <label>&nbsp;</label>
          <button className="btn btn-ghost" onClick={lookup} disabled={busy}>{busy ? 'Searching…' : 'Find sale'}</button>
        </div>
      </div>

      {sale && (
        <>
          <p className="subtle" style={{ marginTop: 4 }}>
            <span className="code">{sale.invoice_number}</span> · {sale.sale_type} · {sale.customer_name || 'Walk-in'} · sold by {sale.sold_by}
          </p>
          <div className="table-wrap">
            <table className="t">
              <thead>
                <tr><th>Product</th><th className="num">Sold</th><th className="num">Returnable</th><th className="num">Price</th><th className="num">Return qty</th></tr>
              </thead>
              <tbody>
                {sale.items.map((it) => (
                  <tr key={it.product_id}>
                    <td>{it.name}</td>
                    <td className="num">{it.quantity}</td>
                    <td className="num">{it.remaining}</td>
                    <td className="num">{naira(it.unit_price)}</td>
                    <td className="num">
                      <input
                        className="input" type="number" style={{ maxWidth: 90, marginLeft: 'auto' }}
                        value={qtys[it.product_id] || ''}
                        disabled={it.remaining <= 0}
                        onChange={(e) => setQtys({ ...qtys, [it.product_id]: e.target.value })}
                        placeholder="0"
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </Modal>
  );
}
