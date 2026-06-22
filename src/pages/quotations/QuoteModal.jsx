// ============================================================
//  Build a quotation (proforma). Pick products and quantities at the
//  prices you'd offer. Saving does NOT touch stock — it's just a price
//  offer. When the customer agrees, "Convert to sale" loads these items
//  into the Sales screen to finish as a real sale.
// ============================================================
import { useEffect, useState } from 'react';
import Modal from '../../components/Modal';
import Tooltip from '../../components/Tooltip';
import { api } from '../../api/client';
import { naira } from '../../utils/format';

export default function QuoteModal({ onClose, onSaved }) {
  const [products, setProducts] = useState([]);
  const [customerName, setCustomerName] = useState('');
  const [note, setNote] = useState('');
  const [lines, setLines] = useState([]);
  const [pick, setPick] = useState({ product_id: '', quantity: '', unit_price: '' });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => { api('/products').then(setProducts).catch(() => {}); }, []);

  const productById = (id) => products.find((p) => String(p.id) === String(id));

  function choose(id) {
    const p = productById(id);
    setPick({ product_id: id, quantity: '', unit_price: p ? p.recommended_price : '' });
  }

  function addLine() {
    setError('');
    const p = productById(pick.product_id);
    const qty = parseInt(pick.quantity, 10);
    const price = Number(pick.unit_price);
    if (!p) return setError('Choose a product.');
    if (!qty || qty <= 0) return setError('Enter a quantity.');
    if (isNaN(price) || price < 0) return setError('Enter a price.');
    setLines([...lines, { product_id: p.id, name: p.name, quantity: qty, unit_price: price, subtotal: qty * price }]);
    setPick({ product_id: '', quantity: '', unit_price: '' });
  }

  const removeLine = (i) => setLines(lines.filter((_, idx) => idx !== i));
  const total = lines.reduce((s, l) => s + l.subtotal, 0);

  async function save() {
    setError('');
    if (lines.length === 0) return setError('Add at least one item.');
    setBusy(true);
    try {
      await api('/quotations', {
        method: 'POST',
        body: {
          customer_name: customerName.trim() || null,
          note: note.trim() || null,
          items: lines.map((l) => ({ product_id: l.product_id, name: l.name, quantity: l.quantity, unit_price: l.unit_price })),
        },
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
      title="New quotation"
      wide
      onClose={onClose}
      footer={
        <>
          <button className="btn btn-ghost" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" onClick={save} disabled={busy}>{busy ? 'Saving…' : 'Save quotation'}</button>
        </>
      }
    >
      {error && <div className="banner-error">{error}</div>}

      <div className="field">
        <label>Quote for <Tooltip text="The customer or contractor this quote is for. Free text — they don't need to be a registered customer." /></label>
        <input className="input" value={customerName} onChange={(e) => setCustomerName(e.target.value)} placeholder="e.g. Bright Electricals / walk-in" />
      </div>

      <div className="row2">
        <div className="field">
          <label>Product</label>
          <select className="input" value={pick.product_id} onChange={(e) => choose(e.target.value)}>
            <option value="">— choose —</option>
            {products.map((p) => <option key={p.id} value={p.id}>{p.name} ({p.product_code})</option>)}
          </select>
        </div>
        <div className="row2">
          <div className="field">
            <label>Quantity</label>
            <input className="input" type="number" value={pick.quantity} onChange={(e) => setPick({ ...pick, quantity: e.target.value })} />
          </div>
          <div className="field">
            <label>Price each</label>
            <input className="input" type="number" value={pick.unit_price} onChange={(e) => setPick({ ...pick, unit_price: e.target.value })} />
          </div>
        </div>
      </div>
      <button className="btn btn-ghost" onClick={addLine}>+ Add item</button>

      {lines.length > 0 && (
        <div style={{ marginTop: 14 }}>
          {lines.map((l, i) => (
            <div className="cart-line" key={i}>
              <div className="g">
                <div>{l.name}</div>
                <div className="qty">{l.quantity} × {naira(l.unit_price)}</div>
              </div>
              <b>{naira(l.subtotal)}</b>
              <button className="linkbtn" style={{ color: 'var(--clay)' }} onClick={() => removeLine(i)}>Remove</button>
            </div>
          ))}
          <div className="totalbar"><span>Total</span><span>{naira(total)}</span></div>
        </div>
      )}

      <div className="field" style={{ marginTop: 14 }}>
        <label>Note (optional)</label>
        <input className="input" value={note} onChange={(e) => setNote(e.target.value)} placeholder="e.g. valid for 7 days" />
      </div>
    </Modal>
  );
}
