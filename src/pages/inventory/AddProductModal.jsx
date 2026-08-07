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
    cost_price: '', recommended_price: '', reorder_level: '5', qty_per_carton: '',
    initial_branch_id: '',
  });
  const [hasVariations, setHasVariations] = useState(false);
  const [variations, setVariations] = useState([{ label: '', product_code: '', cost_price: '', recommended_price: '' }]);
  const [stockRows, setStockRows] = useState([{ branch_id: '', quantity: '' }]);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  const setStock = (i, k) => (e) => {
    const next = stockRows.slice();
    next[i] = { ...next[i], [k]: e.target.value };
    setStockRows(next);
  };
  const addStockRow = () => setStockRows([...stockRows, { branch_id: '', quantity: '' }]);
  const removeStockRow = (i) => setStockRows(stockRows.filter((_, idx) => idx !== i));

  const setVar = (i, k) => (e) => {
    const next = variations.slice();
    next[i] = { ...next[i], [k]: e.target.value };
    setVariations(next);
  };
  const addVar = () => setVariations([...variations, { label: '', product_code: '', cost_price: '', recommended_price: '' }]);
  const removeVar = (i) => setVariations(variations.filter((_, idx) => idx !== i));

  // Rows where a branch was chosen. The first is the required primary location.
  const chosenStock = () => stockRows.filter((r) => r.branch_id);

  const baseShared = () => ({
    category_id: form.category_id || null,
    unit: form.unit || 'pcs',
    cost_price: Number(form.cost_price) || 0,
    recommended_price: Number(form.recommended_price) || 0,
    reorder_level: form.reorder_level === '' ? 5 : Number(form.reorder_level) || 0,
    qty_per_carton: form.qty_per_carton === '' ? null : Number(form.qty_per_carton) || null,
    initial_branch_id: chosenStock()[0] ? chosenStock()[0].branch_id : '',
  });

  async function save() {
    setError('');
    if (!form.name.trim()) return setError('Enter a product name.');
    const stock = chosenStock();
    if (stock.length === 0) return setError('Choose at least one starting stock location.');
    // Guard against the same branch twice.
    const ids = stock.map((s) => String(s.branch_id));
    if (new Set(ids).size !== ids.length) return setError('You picked the same location twice.');

    // primary = first chosen row; extras seed additional branches.
    const primaryQty = stock[0].quantity === '' ? 0 : Number(stock[0].quantity) || 0;
    const extraStock = stock.slice(1).map((s) => ({ branch_id: s.branch_id, quantity: s.quantity === '' ? 0 : Number(s.quantity) || 0 }));

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
            initial_quantity: primaryQty,
            initial_stock: extraStock,
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
            product_code: v.product_code.trim(),
            name: `${form.name.trim()} ${v.label.trim()}`.trim(),
            initial_quantity: 0,
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
          <label>Cost price <span className="subtle">(optional)</span> <Tooltip text="What you buy one unit for. Can be left blank (0) and set later by an admin." /></label>
          <input className="input" type="number" value={form.cost_price} onChange={set('cost_price')} placeholder="0" />
        </div>
        <div className="field">
          <label>Selling price <span className="subtle">(optional)</span> <Tooltip text="The recommended price to sell one unit. Can be left blank (0); only an admin can change it later." /></label>
          <input className="input" type="number" value={form.recommended_price} onChange={set('recommended_price')} placeholder="0" />
        </div>
      </div>

      <div className="field">
        <label>Low-stock level <Tooltip text="When total stock falls to this number or below, the product is flagged as low." /></label>
        <input className="input" type="number" value={form.reorder_level} onChange={set('reorder_level')} placeholder="5" style={{ maxWidth: 200 }} />
      </div>

      <div className="sectionhead" style={{ marginTop: 4 }}>
        Starting stock <Tooltip text="Choose at least one location. The quantity is optional — leave it blank to start at 0. Add more locations to stock several branches at once." />
      </div>
      {stockRows.map((r, i) => (
        <div className="row2" key={i} style={{ alignItems: 'end' }}>
          <div className="field">
            <label>{i === 0 ? 'Location' : `Location ${i + 1}`}</label>
            <select className="input" value={r.branch_id} onChange={setStock(i, 'branch_id')}>
              <option value="">— choose —</option>
              {branches.map((b) => (
                <option key={b.id} value={b.id}>{b.name}{b.is_warehouse ? ' (Warehouse)' : ''}</option>
              ))}
            </select>
          </div>
          <div className="field">
            <label>Quantity <span className="subtle">(optional)</span>
              {stockRows.length > 1 && <button className="linkbtn" style={{ color: 'var(--clay)', float: 'right' }} onClick={() => removeStockRow(i)}>Remove</button>}
            </label>
            <input className="input" type="number" value={r.quantity} onChange={setStock(i, 'quantity')} placeholder="0" />
          </div>
        </div>
      ))}
      <button className="btn btn-ghost" onClick={addStockRow}>+ Add another location</button>

      <div className="field" style={{ marginTop: 12 }}>
        <label>Quantity per carton <span className="subtle">(optional)</span> <Tooltip text="How many pieces are in one carton. Lets you sell by the carton later. Can be set or changed by an admin any time." /></label>
        <input className="input" type="number" value={form.qty_per_carton} onChange={set('qty_per_carton')} placeholder="e.g. 100" style={{ maxWidth: 200 }} />
      </div>

      {hasVariations && <p className="subtle" style={{ marginTop: 2 }}>Note: with variations, the starting quantity applies per variation as 0 — set each variation's stock afterward. The first location above is used as their location.</p>}

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
                  <input className="input" type="number" value={v.cost_price} onChange={setVar(i, 'cost_price')} placeholder={form.cost_price || '0'} />
                </div>
                <div className="field">
                  <label>Selling price <span className="subtle">(optional)</span></label>
                  <input className="input" type="number" value={v.recommended_price} onChange={setVar(i, 'recommended_price')} placeholder={form.recommended_price || '0'} />
                </div>
              </div>
            </div>
          ))}
          <button className="btn btn-ghost" onClick={addVar}>+ Add variation</button>
          <p className="subtle" style={{ marginTop: 6 }}>Each variation is saved as "{form.name || 'Product'} [label]" with its own code, starting at 0 in stock. Leave a variation's price blank to use the base price above.</p>
        </div>
      )}
    </Modal>
  );
}
