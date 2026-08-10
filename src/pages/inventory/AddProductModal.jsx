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
import SearchableSelect from '../../components/SearchableSelect';
import NumberField from '../../components/NumberField';

export default function AddProductModal({ categories, branches, onClose, onSaved }) {
  const [form, setForm] = useState({
    product_code: '', name: '', category_id: '', unit: 'pcs',
    cost_price: '', recommended_price: '', reorder_level: '5', qty_per_carton: '',
    initial_quantity: '',
  });
  const [hasVariations, setHasVariations] = useState(false);
  const [variations, setVariations] = useState([{ label: '', product_code: '', cost_price: '', recommended_price: '', initial_quantity: '' }]);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  // New stock always goes into the company's warehouse.
  const warehouse = branches.find((b) => b.is_warehouse);

  const setVar = (i, k) => (e) => {
    const next = variations.slice();
    next[i] = { ...next[i], [k]: e.target.value };
    setVariations(next);
  };
  const addVar = () => setVariations([...variations, { label: '', product_code: '', cost_price: '', recommended_price: '', initial_quantity: '' }]);
  const removeVar = (i) => setVariations(variations.filter((_, idx) => idx !== i));

  const baseShared = () => ({
    category_id: form.category_id || null,
    unit: form.unit || 'pcs',
    cost_price: Number(form.cost_price) || 0,
    recommended_price: Number(form.recommended_price) || 0,
    reorder_level: form.reorder_level === '' ? 5 : Number(form.reorder_level) || 0,
    qty_per_carton: form.qty_per_carton === '' ? null : Number(form.qty_per_carton) || null,
    initial_branch_id: warehouse ? warehouse.id : '',
  });

  async function save() {
    setError('');
    if (!form.name.trim()) return setError('Enter a product name.');
    if (!warehouse) return setError('No warehouse found for this company.');

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
            initial_quantity: form.initial_quantity === '' ? 0 : Number(form.initial_quantity) || 0,
          },
        });
      } else {
        const rows = variations
          .filter((v) => v.label.trim() || v.product_code.trim())
          .map((v) => ({
            ...baseShared(),
            // Per-variation price overrides the base when filled in.
            cost_price: v.cost_price !== '' ? Number(v.cost_price) || 0 : Number(form.cost_price) || 0,
            recommended_price: v.recommended_price !== '' ? Number(v.recommended_price) || 0 : Number(form.recommended_price) || 0,
            initial_quantity: v.initial_quantity === '' ? 0 : Number(v.initial_quantity) || 0,
            product_code: v.product_code.trim(),
            name: `${form.name.trim()} ${v.label.trim()}`.trim(),
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
          <SearchableSelect value={form.category_id} onChange={(v) => setForm({ ...form, category_id: v })}
            placeholder="— none —"
            options={[{ value: '', label: '— none —' }].concat(categories.map((c) => ({ value: c.id, label: c.name })))} />
        </div>
        <div className="field">
          <label>Unit <Tooltip text="How it's counted: pieces, rolls, cartons, etc." /></label>
          <input className="input" value={form.unit} onChange={set('unit')} placeholder="pcs" />
        </div>
      </div>

      <div className="row2">
        <div className="field">
          <label>Cost price <span className="subtle">(optional)</span> <Tooltip text="What you buy one unit for. Can be left blank (0) and set later by an admin." /></label>
          <NumberField className="input" value={form.cost_price} onChange={(v) => setForm({ ...form, cost_price: v })} placeholder="0" />
        </div>
        <div className="field">
          <label>Selling price <span className="subtle">(optional)</span> <Tooltip text="The recommended price to sell one unit. Can be left blank (0); only an admin can change it later." /></label>
          <NumberField className="input" value={form.recommended_price} onChange={(v) => setForm({ ...form, recommended_price: v })} placeholder="0" />
        </div>
      </div>

      <div className="row2">
        <div className="field">
          <label>Low-stock level <Tooltip text="When total stock falls to this number or below, the product is flagged as low." /></label>
          <NumberField className="input" allowDecimal={false} value={form.reorder_level} onChange={(v) => setForm({ ...form, reorder_level: v })} placeholder="5" />
        </div>
        {!hasVariations && (
          <div className="field">
            <label>Starting quantity <span className="subtle">(optional)</span> <Tooltip text={`Opening stock, placed in ${warehouse ? warehouse.name : 'the warehouse'}. Leave blank to start at 0. Move to a branch later with Transfer.`} /></label>
            <NumberField className="input" allowDecimal={false} value={form.initial_quantity} onChange={(v) => setForm({ ...form, initial_quantity: v })} placeholder="0" />
          </div>
        )}
      </div>
      <p className="subtle" style={{ marginTop: -2 }}>New stock is placed in <b>{warehouse ? warehouse.name : 'the warehouse'}</b>. Use Transfer to move it to a branch.</p>

      <div className="field" style={{ marginTop: 12 }}>
        <label>Quantity per carton <span className="subtle">(optional)</span> <Tooltip text="How many pieces are in one carton. Lets you sell by the carton later. Can be set or changed by an admin any time." /></label>
        <NumberField className="input" allowDecimal={false} value={form.qty_per_carton} onChange={(v) => setForm({ ...form, qty_per_carton: v })} placeholder="e.g. 100" style={{ maxWidth: 200 }} />
      </div>

      <label style={{ display: 'flex', alignItems: 'center', gap: 8, margin: '6px 0 10px', fontWeight: 600, cursor: 'pointer' }}>
        <input type="checkbox" checked={hasVariations} onChange={(e) => setHasVariations(e.target.checked)} />
        This product has variations (each with its own code)
        <Tooltip text="Turn on for items like colours or wattages. Each variation is saved as its own product with its own code and starting quantity, sharing the details above." />
      </label>

      {!hasVariations ? (
        <div className="field">
          <label>Product code <Tooltip text="A short unique code, e.g. LED-001. You type this when restocking so quantities add up." /></label>
          <input className="input" value={form.product_code} onChange={set('product_code')} placeholder="e.g. LED-001" />
          <small className="subtle">New products start at 0 in stock. An admin sets the real quantity afterwards with “Edit stock”.</small>
        </div>
      ) : (
        <div>
          <div className="sectionhead" style={{ marginTop: 4 }}>Variations</div>
          {variations.map((v, i) => (
            <div key={i} style={{ borderTop: i > 0 ? '1px solid var(--line)' : 'none', paddingTop: i > 0 ? 10 : 0 }}>
              <div className="row2" style={{ alignItems: 'end' }}>
                <div className="field">
                  <label>Variation {i + 1} label</label>
                  <input className="input" value={v.label} onChange={setVar(i, 'label')} placeholder="e.g. Warm White" />
                </div>
                <div className="field">
                  <label>Code {variations.length > 1 && <button className="linkbtn" style={{ color: 'var(--clay)', float: 'right' }} onClick={() => removeVar(i)}>Remove</button>}</label>
                  <input className="input" value={v.product_code} onChange={setVar(i, 'product_code')} placeholder="e.g. LED-001-WW" />
                </div>
              </div>
              <div className="row2">
                <div className="field">
                  <label>Cost price <span className="subtle">(optional)</span></label>
                  <NumberField className="input" value={v.cost_price} onChange={(val) => setVar(i, 'cost_price')({ target: { value: val } })} placeholder={form.cost_price || '0'} />
                </div>
                <div className="field">
                  <label>Selling price <span className="subtle">(optional)</span></label>
                  <NumberField className="input" value={v.recommended_price} onChange={(val) => setVar(i, 'recommended_price')({ target: { value: val } })} placeholder={form.recommended_price || '0'} />
                </div>
              </div>
              <div className="field">
                <label>Starting quantity <span className="subtle">(optional)</span></label>
                <NumberField className="input" allowDecimal={false} value={v.initial_quantity} onChange={(val) => setVar(i, 'initial_quantity')({ target: { value: val } })} placeholder="0" style={{ maxWidth: 200 }} />
              </div>
            </div>
          ))}
          <button className="btn btn-ghost" onClick={addVar}>+ Add variation</button>
          <p className="subtle" style={{ marginTop: 6 }}>Each variation is saved as "{form.name || 'Product'} [label]" with its own code and its own starting quantity, placed in {warehouse ? warehouse.name : 'the warehouse'}. Leave a price blank to use the base price above.</p>
        </div>
      )}
    </Modal>
  );
}
