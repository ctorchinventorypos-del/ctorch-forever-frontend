// ============================================================
//  Transfer stock between two locations (warehouse → store or
//  store → store). Add one or MANY products to move in a single
//  transfer — it's all-or-nothing, so nothing moves unless every
//  line has enough stock at the source.
// ============================================================
import { useState } from 'react';
import Modal from '../../components/Modal';
import Tooltip from '../../components/Tooltip';
import { api } from '../../api/client';

export default function TransferModal({ products, branches, preselect, onClose, onSaved }) {
  const [fromId, setFromId] = useState('');
  const [toId, setToId] = useState('');
  const [lines, setLines] = useState(
    preselect ? [{ product_id: String(preselect), quantity: '' }] : [{ product_id: '', quantity: '' }]
  );
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const setLine = (i, k) => (e) => {
    const next = lines.slice();
    next[i] = { ...next[i], [k]: e.target.value };
    setLines(next);
  };
  const addLine = () => setLines([...lines, { product_id: '', quantity: '' }]);
  const removeLine = (i) => setLines(lines.filter((_, idx) => idx !== i));

  async function save() {
    setError('');
    if (!fromId || !toId) return setError('Choose a source and a destination.');
    if (fromId === toId) return setError('Source and destination must be different.');
    const items = lines
      .filter((l) => l.product_id && Number(l.quantity) > 0)
      .map((l) => ({ product_id: l.product_id, quantity: Number(l.quantity) }));
    if (items.length === 0) return setError('Add at least one product with a quantity.');

    setBusy(true);
    try {
      await api('/stock/transfer-batch', {
        method: 'POST',
        body: { from_branch_id: fromId, to_branch_id: toId, items },
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
      title="Transfer stock"
      wide
      onClose={onClose}
      footer={
        <>
          <button className="btn btn-ghost" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" onClick={save} disabled={busy}>
            {busy ? 'Transferring…' : 'Transfer'}
          </button>
        </>
      }
    >
      {error && <div className="banner-error">{error}</div>}

      <div className="row2">
        <div className="field">
          <label>From <Tooltip text="Where the stock leaves from." /></label>
          <select className="input" value={fromId} onChange={(e) => setFromId(e.target.value)}>
            <option value="">— choose —</option>
            {branches.map((b) => (
              <option key={b.id} value={b.id}>{b.name}{b.is_warehouse ? ' (Warehouse)' : ''}</option>
            ))}
          </select>
        </div>
        <div className="field">
          <label>To <Tooltip text="Where the stock arrives." /></label>
          <select className="input" value={toId} onChange={(e) => setToId(e.target.value)}>
            <option value="">— choose —</option>
            {branches.map((b) => (
              <option key={b.id} value={b.id}>{b.name}{b.is_warehouse ? ' (Warehouse)' : ''}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="sectionhead" style={{ marginTop: 4 }}>Products to move</div>
      {lines.map((l, i) => (
        <div className="row2" key={i} style={{ alignItems: 'end' }}>
          <div className="field">
            <label>Product</label>
            <select className="input" value={l.product_id} onChange={setLine(i, 'product_id')}>
              <option value="">— choose —</option>
              {products.map((p) => (
                <option key={p.id} value={p.id}>{p.name} ({p.product_code})</option>
              ))}
            </select>
          </div>
          <div className="field">
            <label>Quantity {lines.length > 1 && <button className="linkbtn" style={{ color: 'var(--clay)', float: 'right' }} onClick={() => removeLine(i)}>Remove</button>}</label>
            <input className="input" type="number" value={l.quantity} onChange={setLine(i, 'quantity')} placeholder="0" />
          </div>
        </div>
      ))}
      <button className="btn btn-ghost" onClick={addLine}>+ Add another product</button>
    </Modal>
  );
}
