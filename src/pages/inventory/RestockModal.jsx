// ============================================================
//  Restock: add more units of an existing product to a branch.
//  The quantity ADDS to what's already there.
// ============================================================
import { useState } from 'react';
import Modal from '../../components/Modal';
import Tooltip from '../../components/Tooltip';
import { api } from '../../api/client';
import SearchableSelect from '../../components/SearchableSelect';
import NumberField from '../../components/NumberField';
import { useAuth } from '../../context/AuthContext';

export default function RestockModal({ products, branches, preselect, onClose, onSaved }) {
  const { isAdmin } = useAuth();
  const [productId, setProductId] = useState(preselect || '');
  const [qty, setQty] = useState('');
  const [cost, setCost] = useState('');
  const [carton, setCarton] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  // All restocks go into the warehouse. Move to a branch afterwards via Transfer.
  const warehouse = branches.find((b) => b.is_warehouse);

  async function save() {
    setError('');
    if (!warehouse) return setError('No warehouse found for this company.');
    setBusy(true);
    try {
      await api('/stock/restock', {
        method: 'POST',
        body: {
          product_id: productId,
          branch_id: warehouse.id,
          quantity: Number(qty),
          // Admins can set a new cost price for this batch; others can't.
          ...(isAdmin && cost !== '' ? { cost_price: Number(cost) } : {}),
          ...(isAdmin && carton !== '' ? { qty_per_carton: Number(carton) } : {}),
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
        <SearchableSelect value={productId} onChange={setProductId} placeholder="— choose product —"
          options={products.map((p) => ({ value: p.id, label: `${p.name} (${p.product_code})` }))} />
      </div>

      <div className="row2">
        <div className="field">
          <label>Adds to <Tooltip text="New stock always arrives in the warehouse. Use Transfer to move it to a branch." /></label>
          <input className="input" value={warehouse ? warehouse.name : 'Warehouse'} disabled />
        </div>
        <div className="field">
          <label>Quantity</label>
          <NumberField className="input" allowDecimal={false} value={qty} onChange={setQty} placeholder="0" />
        </div>
      </div>

      {isAdmin && (
        <div className="field">
          <label>New cost price for this batch <Tooltip text="Optional. If you bought this batch at a different cost, enter it here — it updates the product's cost price. Leave blank to keep the current cost. Admins only." /></label>
          <NumberField className="input" value={cost} onChange={setCost} placeholder="leave blank to keep current" />
        </div>
      )}

      {isAdmin && (
        <div className="field">
          <label>Quantity per carton <Tooltip text="Optional. Set or update how many pieces are in a carton. Leave blank to keep current. Admins only." /></label>
          <NumberField className="input" allowDecimal={false} value={carton} onChange={setCarton} placeholder="leave blank to keep current" />
        </div>
      )}
    </Modal>
  );
}
