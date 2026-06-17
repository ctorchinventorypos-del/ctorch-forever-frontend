// ============================================================
//  Transfer: move stock between two locations (warehouse → store
//  or store → store). It can't move more than the source holds.
// ============================================================
import { useState } from 'react';
import Modal from '../../components/Modal';
import Tooltip from '../../components/Tooltip';
import { api } from '../../api/client';

export default function TransferModal({ products, branches, preselect, onClose, onSaved }) {
  const [productId, setProductId] = useState(preselect || '');
  const [fromId, setFromId] = useState('');
  const [toId, setToId] = useState('');
  const [qty, setQty] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function save() {
    setError('');
    setBusy(true);
    try {
      await api('/stock/transfer', {
        method: 'POST',
        body: {
          product_id: productId,
          from_branch_id: fromId,
          to_branch_id: toId,
          quantity: Number(qty),
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
      title="Transfer stock"
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

      <div className="field">
        <label>Product</label>
        <select className="input" value={productId} onChange={(e) => setProductId(e.target.value)}>
          <option value="">— choose —</option>
          {products.map((p) => (
            <option key={p.id} value={p.id}>{p.name} ({p.product_code})</option>
          ))}
        </select>
      </div>

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

      <div className="field">
        <label>Quantity</label>
        <input className="input" type="number" value={qty} onChange={(e) => setQty(e.target.value)} placeholder="0" />
      </div>
    </Modal>
  );
}
