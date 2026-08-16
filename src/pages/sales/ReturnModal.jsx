// ============================================================
//  Customer return: pick the customer, where the goods come back to,
//  and the products + quantities (partial allowed). Stock is added back
//  automatically; for credit/distributor customers their balance drops.
//  Afterwards you can print the customer / plaza / warehouse return invoice.
// ============================================================
import { useEffect, useMemo, useRef, useState } from 'react';
import Modal from '../../components/Modal';
import SearchableSelect from '../../components/SearchableSelect';
import NumberField from '../../components/NumberField';
import { api } from '../../api/client';
import { naira } from '../../utils/format';

function newKey() {
  try { return crypto.randomUUID(); } catch (e) { return 'k-' + Date.now() + '-' + Math.random().toString(16).slice(2); }
}

export default function ReturnModal({ onClose, onSaved }) {
  const [customers, setCustomers] = useState([]);
  const [branches, setBranches] = useState([]);
  const [products, setProducts] = useState([]);
  const [customerId, setCustomerId] = useState('');
  const [branchId, setBranchId] = useState('');
  const [note, setNote] = useState('');
  const [retDate, setRetDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [lines, setLines] = useState([{ product_id: '', quantity: '', unit_price: '' }]);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(null);
  const keyRef = useRef(newKey());

  useEffect(() => {
    Promise.all([api('/customers'), api('/branches'), api('/products')])
      .then(([c, b, p]) => { setCustomers(c); setBranches(b); setProducts(p); })
      .catch(() => {});
  }, []);

  const productById = (id) => products.find((p) => String(p.id) === String(id));

  const setLine = (i, k, v) => {
    const next = lines.slice();
    next[i] = { ...next[i], [k]: v };
    // default the price to the product's selling price when the product changes
    if (k === 'product_id') {
      const p = productById(v);
      if (p && (next[i].unit_price === '' || next[i].unit_price === undefined)) next[i].unit_price = String(p.recommended_price || '');
    }
    setLines(next);
  };
  const addLine = () => setLines([...lines, { product_id: '', quantity: '', unit_price: '' }]);
  const removeLine = (i) => setLines(lines.filter((_, idx) => idx !== i));

  const total = useMemo(
    () => lines.reduce((s, l) => s + (Number(l.quantity) || 0) * (Number(l.unit_price) || 0), 0),
    [lines]
  );

  async function submit() {
    setError('');
    if (!customerId) return setError('Choose the customer returning the goods.');
    if (!branchId) return setError('Choose where the goods are returned to.');
    const items = lines
      .filter((l) => l.product_id && Number(l.quantity) > 0)
      .map((l) => ({ product_id: l.product_id, quantity: Number(l.quantity), unit_price: Number(l.unit_price) || 0 }));
    if (items.length === 0) return setError('Add at least one product with a quantity.');

    setBusy(true);
    try {
      const res = await api('/returns/customer', {
        method: 'POST',
        headers: { 'Idempotency-Key': keyRef.current },
        body: { customer_id: customerId, branch_id: branchId, note: note.trim() || null, items, created_at: retDate },
      });
      setDone(res);
      onSaved && onSaved();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  if (done) {
    const openCopy = (copy) => window.open(`/return-invoice.html?id=${done.id}&copy=${copy}`, '_blank');
    return (
      <Modal title="Return recorded" onClose={onClose} footer={<button className="btn btn-primary" onClick={onClose}>Done</button>}>
        <div className="success-card" style={{ padding: '14px 4px', textAlign: 'center' }}>
          <div className="big">✅</div>
          <p style={{ margin: '6px 0' }}>Return <b>{done.return_number}</b> recorded. Stock added back.</p>
          <p className="subtle">Value returned: <b>{naira(done.total_amount)}</b></p>
          <div style={{ display: 'flex', gap: 8, justifyContent: 'center', marginTop: 12, flexWrap: 'wrap' }}>
            <button className="btn btn-ghost" onClick={() => openCopy('customer')}>🖨️ Customer copy</button>
            <button className="btn btn-ghost" onClick={() => openCopy('plaza')}>🖨️ Plaza copy</button>
            <button className="btn btn-ghost" onClick={() => openCopy('warehouse')}>🖨️ Warehouse copy</button>
          </div>
        </div>
      </Modal>
    );
  }

  return (
    <Modal
      title="Record a return"
      wide
      onClose={onClose}
      footer={
        <>
          <button className="btn btn-ghost" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" onClick={submit} disabled={busy}>{busy ? 'Recording…' : `Record return · ${naira(total)}`}</button>
        </>
      }
    >
      {error && <div className="banner-error">{error}</div>}

      <div className="row2">
        <div className="field">
          <label>Customer</label>
          <SearchableSelect value={customerId} onChange={setCustomerId} placeholder="— choose customer —"
            options={customers.map((c) => ({ value: c.id, label: `${c.name}${c.phone ? ` · ${c.phone}` : ''}` }))} />
        </div>
        <div className="field">
          <label>Returned to</label>
          <SearchableSelect value={branchId} onChange={setBranchId} placeholder="— choose location —"
            options={branches.map((b) => ({ value: b.id, label: `${b.name}${b.is_warehouse ? ' (Warehouse)' : ''}` }))} />
        </div>
      </div>

      <div className="sectionhead" style={{ marginTop: 4 }}>Products returned</div>
      {lines.map((l, i) => (
        <div className="row2" key={i} style={{ alignItems: 'end' }}>
          <div className="field">
            <label>Product</label>
            <SearchableSelect value={l.product_id} onChange={(v) => setLine(i, 'product_id', v)} placeholder="— choose product —"
              options={products.map((p) => ({ value: p.id, label: `${p.name} (${p.product_code})` }))} />
          </div>
          <div className="row2">
            <div className="field">
              <label>Qty {lines.length > 1 && <button className="linkbtn" style={{ color: 'var(--clay)', float: 'right' }} onClick={() => removeLine(i)}>Remove</button>}</label>
              <NumberField className="input" allowDecimal={false} value={l.quantity} onChange={(v) => setLine(i, 'quantity', v)} placeholder="0" />
            </div>
            <div className="field">
              <label>Unit price</label>
              <NumberField className="input" value={l.unit_price} onChange={(v) => setLine(i, 'unit_price', v)} placeholder="0" />
            </div>
          </div>
        </div>
      ))}
      <button className="btn btn-ghost" onClick={addLine}>+ Add another product</button>

      <div className="field" style={{ marginTop: 10 }}>
        <label>Note (optional)</label>
        <input className="input" value={note} onChange={(e) => setNote(e.target.value)} placeholder="e.g. wrong size, faulty" />
      </div>
      <div className="field">
        <label>Return date</label>
        <input type="date" className="input" value={retDate} max={new Date().toISOString().slice(0,10)} onChange={(e) => setRetDate(e.target.value)} />
      </div>
    </Modal>
  );
}
