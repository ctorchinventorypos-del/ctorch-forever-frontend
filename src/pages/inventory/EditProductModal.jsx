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
    description: product.description || '',
  });
  const [price, setPrice] = useState(product.recommended_price);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

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
    </Modal>
  );
}
