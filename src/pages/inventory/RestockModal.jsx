// ============================================================
//  Restock: add more units of an existing product to a branch.
//  The quantity ADDS to what's already there.
// ============================================================
import { useState } from 'react';
import Modal from '../../components/Modal';
import Tooltip from '../../components/Tooltip';
import { api } from '../../api/client';

export default function RestockModal({ products, branches, preselect, onClose, onSaved }) {
  const [productId, setProductId] = useState(preselect || '');
  const [branchId, setBranchId] = useState('');
  const [qty, setQty] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function save() {
    setError('');
    setBusy(true);
    try {
      await api('/stock/restock', {
        method: 'POST',
        body: { product_id: productId, branch_id: branchId, quantity: Number(qty) },
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
      title="Restock a product"
      onClose={onClose}
      footer={
        <>
          <button className="btn btn-ghost" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" onClick={save} disabled={busy}>
            {busy ? 'Adding…' : 'Add stock'}
          </button>
        </>
      }
    >
      {error && <div className="banner-error">{error}</div>}

      <div className="field">
        <label>Product <Tooltip text="Pick the product to add more of. The amount adds to the current stock — it never creates a duplicate." /></label>
        <select className="input" value={productId} onChange={(e) => setProductId(e.target.value)}>
          <option value="">— choose —</option>
          {products.map((p) => (
            <option key={p.id} value={p.id}>{p.name} ({p.product_code})</option>
          ))}
        </select>
      </div>

      <div className="row2">
        <div className="field">
          <label>Add to <Tooltip text="Which branch or the warehouse the new stock arrives at." /></label>
          <select className="input" value={branchId} onChange={(e) => setBranchId(e.target.value)}>
            <option value="">— choose —</option>
            {branches.map((b) => (
              <option key={b.id} value={b.id}>{b.name}{b.is_warehouse ? ' (Warehouse)' : ''}</option>
            ))}
          </select>
        </div>
        <div className="field">
          <label>Quantity</label>
          <input className="input" type="number" value={qty} onChange={(e) => setQty(e.target.value)} placeholder="0" />
        </div>
      </div>
    </Modal>
  );
}
