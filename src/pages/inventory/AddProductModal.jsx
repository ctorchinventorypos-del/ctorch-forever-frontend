// ============================================================
//  Add a product. The starting stock LOCATION is required.
//  A product can optionally have VARIATIONS (e.g. colours, wattages),
//  each with its OWN product code and starting quantity — each variation
//  becomes its own product sharing the base cost/price/category.
// ============================================================
import { useState } from 'react';
import Modal from '../../components/Modal';
import Tooltip from '../../components/Tooltip';
import { api } from '../../api/client';

export default function AddProductModal({ categories, branches, onClose, onSaved }) {
  const [form, setForm] = useState({
    product_code: '', name: '', category_id: '', unit: 'pcs',
    cost_price: '', recommended_price: '', reorder_level: '5',
    initial_branch_id: '', initial_quantity: '',
  });
  const [hasVariations, setHasVariations] = useState(false);
  const [variations, setVariations] = useState([{ label: '', product_code: '', initial_quantity: '' }]);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  const setVar = (i, k) => (e) => {
    const next = variations.slice();
    next[i] = { ...next[i], [k]: e.target.value };
    setVariations(next);
  };
  const addVar = () => setVariations([...variations, { label: '', product_code: '', initial_quantity: '' }]);
  const removeVar = (i) => setVariations(variations.filter((_, idx) => idx !== i));

  const baseShared = () => ({
    category_id: form.category_id || null,
    unit: form.unit || 'pcs',
    cost_price: Number(form.cost_price) || 0,
    recommended_price: Number(form.recommended_price) || 0,
    reorder_level: form.reorder_level === '' ? 5 : Number(form.reorder_level) || 0,
    initial_branch_id: form.initial_branch_id,
  });

  async function save() {
    setError('');
    if (!form.name.trim()) return setError('Enter a product name.');
    if (!form.initial_branch_id) return setError('Choose the starting stock location.');

    setBusy(true);
    try {
      if (!hasVariations) {
        if (!form.product_code.trim()) { setBusy(false); return setError('Enter a product code.'); }
        await api('/products', {
          method: 'POST',
          body: {
            ...baseShared(),
            product_code: form.product_code.trim(),
            name: form.name.trim(),
            initial_quantity: Number(form.initial_quantity) || 0,
          },
        });
      } else {
        const rows = variations
          .filter((v) => v.label.trim() || v.product_code.trim() || v.initial_quantity)
          .map((v) => ({
            ...baseShared(),
            product_code: v.product_code.trim(),
            name: `${form.name.trim()} ${v.label.trim()}`.trim(),
            initial_quantity: Number(v.initial_quantity) || 0,
          }));
        if (rows.length === 0) { setBusy(false); return setError('Add at least one variation.'); }
        for (const r of rows) {
          if (!r.product_code) { setBusy(false); return setError('Every variation needs a product code.'); }
        }
        await api('/products/batch', { method: 'POST', body: { products: rows } });
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
      title="Add product"
      wide
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
          <label>Selling price <Tooltip text="The recommended price to sell one unit. Shared by all variations; you can edit each one later." /></label>
          <input className="input" type="number" value={form.recommended_price} onChange={set('recommended_price')} placeholder="0" />
        </div>
      </div>

      <div className="row2">
        <div className="field">
          <label>Low-stock level <Tooltip text="When total stock falls to this number or below, the product is flagged as low." /></label>
          <input className="input" type="number" value={form.reorder_level} onChange={set('reorder_level')} placeholder="5" />
        </div>
        <div className="field">
          <label>Starting stock location <Tooltip text="Which branch or warehouse the opening stock goes into. Required." /></label>
          <select className="input" value={form.initial_branch_id} onChange={set('initial_branch_id')}>
            <option value="">— choose —</option>
            {branches.map((b) => (
              <option key={b.id} value={b.id}>{b.name}{b.is_warehouse ? ' (Warehouse)' : ''}</option>
            ))}
          </select>
        </div>
      </div>

      <label style={{ display: 'flex', alignItems: 'center', gap: 8, margin: '6px 0 10px', fontWeight: 600, cursor: 'pointer' }}>
        <input type="checkbox" checked={hasVariations} onChange={(e) => setHasVariations(e.target.checked)} />
        This product has variations (each with its own code)
        <Tooltip text="Turn on for items like colours or wattages. Each variation is saved as its own product with its own code and starting quantity, sharing the details above." />
      </label>

      {!hasVariations ? (
        <div className="row2">
          <div className="field">
            <label>Product code <Tooltip text="A short unique code, e.g. LED-001. You type this when restocking so quantities add up." /></label>
            <input className="input" value={form.product_code} onChange={set('product_code')} placeholder="e.g. LED-001" />
          </div>
          <div className="field">
            <label>Starting quantity</label>
            <input className="input" type="number" value={form.initial_quantity} onChange={set('initial_quantity')} placeholder="0" />
          </div>
        </div>
      ) : (
        <div>
          <div className="sectionhead" style={{ marginTop: 4 }}>Variations</div>
          {variations.map((v, i) => (
            <div className="row2" key={i} style={{ alignItems: 'end' }}>
              <div className="field">
                <label>Variation {i + 1} label</label>
                <input className="input" value={v.label} onChange={setVar(i, 'label')} placeholder="e.g. Warm White" />
              </div>
              <div className="row2">
                <div className="field">
                  <label>Code</label>
                  <input className="input" value={v.product_code} onChange={setVar(i, 'product_code')} placeholder="e.g. LED-001-WW" />
                </div>
                <div className="field">
                  <label>Qty {variations.length > 1 && <button className="linkbtn" style={{ color: 'var(--clay)', float: 'right' }} onClick={() => removeVar(i)}>Remove</button>}</label>
                  <input className="input" type="number" value={v.initial_quantity} onChange={setVar(i, 'initial_quantity')} placeholder="0" />
                </div>
              </div>
            </div>
          ))}
          <button className="btn btn-ghost" onClick={addVar}>+ Add variation</button>
          <p className="subtle" style={{ marginTop: 6 }}>Each variation is saved as "{form.name || 'Product'} [label]" with its own code.</p>
        </div>
      )}
    </Modal>
  );
}
