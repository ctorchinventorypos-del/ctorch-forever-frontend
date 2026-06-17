// ============================================================
//  Add a brand-new product, optionally with starting stock.
// ============================================================
import { useState } from 'react';
import Modal from '../../components/Modal';
import Tooltip from '../../components/Tooltip';
import { api } from '../../api/client';

export default function AddProductModal({ categories, branches, onClose, onSaved }) {
  const [form, setForm] = useState({
    product_code: '', name: '', category_id: '', unit: 'pcs',
    cost_price: '', recommended_price: '',
    initial_branch_id: '', initial_quantity: '',
  });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  async function save() {
    setError('');
    setBusy(true);
    try {
      await api('/products', {
        method: 'POST',
        body: {
          product_code: form.product_code.trim(),
          name: form.name.trim(),
          category_id: form.category_id || null,
          unit: form.unit || 'pcs',
          cost_price: Number(form.cost_price) || 0,
          recommended_price: Number(form.recommended_price) || 0,
          initial_branch_id: form.initial_branch_id || null,
          initial_quantity: Number(form.initial_quantity) || 0,
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
      title="Add product"
      onClose={onClose}
      footer={
        <>
          <button className="btn btn-ghost" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" onClick={save} disabled={busy}>
            {busy ? 'Saving…' : 'Save product'}
          </button>
        </>
      }
    >
      {error && <div className="banner-error">{error}</div>}

      <div className="field">
        <label>Product code <Tooltip text="A short unique code for this product, e.g. LED-001. You'll type this when restocking so the quantity adds up instead of creating a duplicate." /></label>
        <input className="input" value={form.product_code} onChange={set('product_code')} placeholder="e.g. LED-001" />
      </div>

      <div className="field">
        <label>Product name</label>
        <input className="input" value={form.name} onChange={set('name')} placeholder="e.g. 9W LED Bulb" />
      </div>

      <div className="row2">
        <div className="field">
          <label>Category</label>
          <select className="input" value={form.category_id} onChange={set('category_id')}>
            <option value="">— none —</option>
            {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>
        <div className="field">
          <label>Unit <Tooltip text="How it's counted: pieces, rolls, cartons, etc." /></label>
          <input className="input" value={form.unit} onChange={set('unit')} placeholder="pcs" />
        </div>
      </div>

      <div className="row2">
        <div className="field">
          <label>Cost price <Tooltip text="What you buy one unit for." /></label>
          <input className="input" type="number" value={form.cost_price} onChange={set('cost_price')} placeholder="0" />
        </div>
        <div className="field">
          <label>Selling price <Tooltip text="The recommended price to sell one unit. You can still sell at a different price on each sale." /></label>
          <input className="input" type="number" value={form.recommended_price} onChange={set('recommended_price')} placeholder="0" />
        </div>
      </div>

      <div className="row2">
        <div className="field">
          <label>Starting stock at <Tooltip text="Optional: drop some opening stock straight into a branch or the warehouse now." /></label>
          <select className="input" value={form.initial_branch_id} onChange={set('initial_branch_id')}>
            <option value="">— skip —</option>
            {branches.map((b) => (
              <option key={b.id} value={b.id}>{b.name}{b.is_warehouse ? ' (Warehouse)' : ''}</option>
            ))}
          </select>
        </div>
        <div className="field">
          <label>Quantity</label>
          <input className="input" type="number" value={form.initial_quantity} onChange={set('initial_quantity')} placeholder="0" />
        </div>
      </div>
    </Modal>
  );
}
