// ============================================================
//  Record a return for a customer. Pick one of their sales, then
//  a product on it and a quantity. Stock goes back and the value
//  comes off their balance (clamped at zero).
// ============================================================
import { useState, useEffect } from 'react';
import Modal from '../../components/Modal';
import { api } from '../../api/client';
import { naira } from '../../utils/format';

export default function RecordReturnModal({ customer, sales, onClose, onSaved }) {
  const [saleId, setSaleId] = useState('');
  const [items, setItems] = useState([]);
  const [productId, setProductId] = useState('');
  const [qty, setQty] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  // When a sale is chosen, load its items.
  useEffect(() => {
    setProductId(''); setItems([]);
    if (!saleId) return;
    api(`/sales/${saleId}`).then((s) => setItems(s.items || [])).catch(() => {});
  }, [saleId]);

  async function save() {
    setError('');
    const q = parseInt(qty, 10);
    if (!saleId) return setError('Choose the sale being returned.');
    if (!productId) return setError('Choose the product.');
    if (!q || q <= 0) return setError('Enter a quantity.');
    setBusy(true);
    try {
      await api('/returns', {
        method: 'POST',
        body: { sale_id: saleId, product_id: productId, quantity: q },
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
      title={`Record return — ${customer.name}`}
      onClose={onClose}
      footer={
        <>
          <button className="btn btn-ghost" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" onClick={save} disabled={busy}>
            {busy ? 'Saving…' : 'Record return'}
          </button>
        </>
      }
    >
      {error && <div className="banner-error">{error}</div>}

      {sales.length === 0 ? (
        <p className="subtle">This customer has no sales to return against.</p>
      ) : (
        <>
          <div className="field">
            <label>Which sale?</label>
            <select className="input" value={saleId} onChange={(e) => setSaleId(e.target.value)}>
              <option value="">— choose —</option>
              {sales.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.invoice_number} · {naira(s.total_amount)} · {new Date(s.created_at).toLocaleDateString()}
                </option>
              ))}
            </select>
          </div>

          {saleId && (
            <div className="row2">
              <div className="field">
                <label>Product returned</label>
                <select className="input" value={productId} onChange={(e) => setProductId(e.target.value)}>
                  <option value="">— choose —</option>
                  {items.map((it, i) => (
                    <option key={i} value={it.product_id || it.id}>
                      {it.name} (sold {it.quantity})
                    </option>
                  ))}
                </select>
              </div>
              <div className="field">
                <label>Quantity</label>
                <input className="input" type="number" value={qty} onChange={(e) => setQty(e.target.value)} />
              </div>
            </div>
          )}
        </>
      )}
    </Modal>
  );
}
