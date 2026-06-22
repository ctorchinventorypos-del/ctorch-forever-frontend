// ============================================================
//  Edit a product's details. The selling price sits in its own
//  box that ONLY admins can change (it calls a separate, admin-
//  only endpoint). Sales users see it but can't edit it.
// ============================================================
import { useState } from 'react';
import Modal from '../../components/Modal';
import Tooltip from '../../components/Tooltip';
import { api } from '../../api/client';
import { useAuth } from '../../context/AuthContext';

export default function EditProductModal({ product, categories, onClose, onSaved }) {
  const { isAdmin } = useAuth();
  const [form, setForm] = useState({
    name: product.name,
    category_id: product.category_id || '',
    unit: product.unit,
    cost_price: product.cost_price,
    reorder_level: product.reorder_level ?? 5,
    description: product.description || '',
  });
  const [price, setPrice] = useState(product.recommended_price);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  async function toggleActive() {
    const turningOff = product.is_active;
    const msg = turningOff
      ? `Deactivate "${product.name}"? It will be hidden from sales and lists, but all its past records are kept. You can reactivate it any time.`
      : `Reactivate "${product.name}" so it can be sold again?`;
    if (!window.confirm(msg)) return;
    setError('');
    setBusy(true);
    try {
      await api(`/products/${product.id}/active`, {
        method: 'PATCH',
        body: { is_active: !product.is_active },
      });
      onSaved();
      onClose();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  async function save() {
    setError('');
    setBusy(true);
    try {
      await api(`/products/${product.id}`, {
        method: 'PUT',
        body: {
          name: form.name.trim(),
          category_id: form.category_id || null,
          unit: form.unit || 'pcs',
          cost_price: Number(form.cost_price) || 0,
          reorder_level: form.reorder_level === '' ? null : Number(form.reorder_level),
          description: form.description || null,
        },
      });
      // Only admins update the selling price, and only if it changed.
      if (isAdmin && Number(price) !== Number(product.recommended_price)) {
        await api(`/products/${product.id}/price`, {
          method: 'PATCH',
          body: { recommended_price: Number(price) || 0 },
        });
      }
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
      title="Edit product"
      onClose={onClose}
      footer={
        <>
          <button className="btn btn-ghost" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" onClick={save} disabled={busy}>
            {busy ? 'Saving…' : 'Save changes'}
          </button>
        </>
      }
    >
      {error && <div className="banner-error">{error}</div>}

      <div className="field">
        <label>Product name</label>
        <input className="input" value={form.name} onChange={set('name')} />
      </div>

      <div className="field">
        <label>Code</label>
        <input className="input" value={product.product_code} disabled />
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
          <label>Unit</label>
          <input className="input" value={form.unit} onChange={set('unit')} />
        </div>
      </div>

      <div className="field">
        <label>Cost price</label>
        <input className="input" type="number" value={form.cost_price} onChange={set('cost_price')} />
      </div>

      <div className="field">
        <label>Low-stock level <Tooltip text="When total stock falls to this number or below, the product is flagged as low on the dashboard and inventory report." /></label>
        <input className="input" type="number" value={form.reorder_level} onChange={set('reorder_level')} />
      </div>

      <div className="field">
        <label>
          Selling price
          <Tooltip text={isAdmin
            ? 'Only admins can change the selling price.'
            : 'Only an admin can change the selling price.'} />
        </label>
        <input
          className="input" type="number" value={price}
          onChange={(e) => setPrice(e.target.value)} disabled={!isAdmin}
        />
        {!isAdmin && <small className="subtle">Ask an admin to change this.</small>}
      </div>

      <div className="field">
        <label>Description (optional)</label>
        <textarea className="input" rows="2" value={form.description} onChange={set('description')} />
      </div>

      {isAdmin && (
        <div className="field" style={{ borderTop: '1px solid var(--line)', paddingTop: 14, marginTop: 4 }}>
          <label>
            {product.is_active ? 'Remove this product' : 'This product is deactivated'}
            <Tooltip text="Deactivating is a safe remove: it hides the product from sales and lists but keeps all of its history. You can reactivate it any time." />
          </label>
          {product.is_active ? (
            <button className="btn btn-danger" onClick={toggleActive} disabled={busy}>Deactivate product</button>
          ) : (
            <button className="btn btn-ghost" onClick={toggleActive} disabled={busy}>Reactivate product</button>
          )}
        </div>
      )}
    </Modal>
  );
}
