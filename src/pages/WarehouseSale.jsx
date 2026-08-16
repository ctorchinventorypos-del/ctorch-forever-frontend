// ============================================================
//  Warehouse Sale: one sale across BOTH companies, sold from
//  each company's warehouse. Combined searchable product list;
//  prints one Nature's Breeze invoice. For sales, warehouse & admin.
// ============================================================
import { useEffect, useMemo, useRef, useState } from 'react';
import { api } from '../api/client';
import { naira } from '../utils/format';
import Modal from '../components/Modal';
import SearchableSelect from '../components/SearchableSelect';
import NumberField from '../components/NumberField';
import Tooltip from '../components/Tooltip';
import AddCustomerModal from './customers/AddCustomerModal';

const PAY_METHODS = [
  { key: 'cash', label: 'Cash' },
  { key: 'pos', label: 'POS Card (Moniepoint)' },
  { key: 'transfer_moniepoint', label: 'Transfer - Moniepoint' },
  { key: 'transfer_zenith', label: 'Transfer - Zenith Bank' },
  { key: 'cheque', label: 'Cheque' },
];
const SALE_TYPES = [
  { key: 'cash', label: 'Cash' },
  { key: 'credit', label: 'Credit' },
  { key: 'reseller', label: 'Distributor' },
];

function newKey() {
  try { return crypto.randomUUID(); } catch (e) { return 'k-' + Date.now() + '-' + Math.random().toString(16).slice(2); }
}

export default function WarehouseSale() {
  const [products, setProducts] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [saleType, setSaleType] = useState('cash');
  const [payMethod, setPayMethod] = useState('cash');
  const [customerId, setCustomerId] = useState('');
  const [actionDate, setActionDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [addCust, setAddCust] = useState(false);
  const [cart, setCart] = useState([]);
  const [item, setItem] = useState({ product_id: '', quantity: '', unit_price: '' });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(null);
  const keyRef = useRef(newKey());

  useEffect(() => { api('/warehouse-sale/inventory').then(setProducts).catch(() => {}); }, []);
  useEffect(() => {
    setCustomerId('');
    const type = saleType === 'cash' ? 'general' : saleType;
    api(`/customers?type=${type}`).then(setCustomers).catch(() => {});
  }, [saleType]);

  const productById = (id) => products.find((p) => String(p.id) === String(id));

  function pickProduct(id) {
    const p = productById(id);
    setItem({ product_id: id, quantity: item.quantity || '1', unit_price: p ? String(p.recommended_price || '') : '' });
  }
  function addItem() {
    setError('');
    const p = productById(item.product_id);
    if (!p) return setError('Choose a product.');
    const qty = Number(item.quantity);
    if (!qty || qty <= 0) return setError('Enter a quantity.');
    if (qty > p.warehouse_stock) return setError(`Only ${p.warehouse_stock} in the ${p.company_code} warehouse.`);
    const price = Number(item.unit_price) || 0;
    setCart([...cart, { product_id: p.id, name: p.name, company_code: p.company_code, quantity: qty, unit_price: price }]);
    setItem({ product_id: '', quantity: '', unit_price: '' });
  }
  const removeLine = (i) => setCart(cart.filter((_, idx) => idx !== i));

  const total = useMemo(() => cart.reduce((s, c) => s + c.quantity * c.unit_price, 0), [cart]);
  // per-company split (so the user can see how cash will divide)
  const split = useMemo(() => {
    const m = {};
    cart.forEach((c) => { m[c.company_code] = (m[c.company_code] || 0) + c.quantity * c.unit_price; });
    return m;
  }, [cart]);

  async function submit() {
    setError('');
    if (!customerId) return setError('Choose or add a customer.');
    if (cart.length === 0) return setError('Add at least one product.');
    setBusy(true);
    try {
      const res = await api('/warehouse-sale', {
        method: 'POST',
        headers: { 'Idempotency-Key': keyRef.current },
        body: {
          customer_id: customerId, sale_type: saleType, payment_method: payMethod, created_at: actionDate,
          items: cart.map((c) => ({ product_id: c.product_id, quantity: c.quantity, unit_price: c.unit_price })),
        },
      });
      setDone(res);
    } catch (err) { setError(err.message); }
    finally { setBusy(false); }
  }

  function reset() {
    setDone(null); setCart([]); setCustomerId(''); setSaleType('cash'); setPayMethod('cash');
    keyRef.current = newKey();
    api('/warehouse-sale/inventory').then(setProducts).catch(() => {});
  }

  if (done) {
    return (
      <div>
        <div className="page-head"><h1>Warehouse sale</h1></div>
        <div className="card card-pad" style={{ textAlign: 'center', maxWidth: 560, margin: '0 auto' }}>
          <div style={{ fontSize: 40 }}>✅</div>
          <p style={{ margin: '6px 0' }}>Warehouse sale recorded — <b>{naira(done.combined_total)}</b></p>
          <div className="subtle" style={{ marginBottom: 10 }}>
            {done.sales.map((s) => <div key={s.id}>{s.company_code}: {s.invoice_number} · {naira(s.total_amount)}</div>)}
          </div>
          <div style={{ display: 'flex', gap: 8, justifyContent: 'center', flexWrap: 'wrap' }}>
            <button className="btn btn-primary" onClick={() => window.open(`/warehouse-invoice.html?ref=${encodeURIComponent(done.warehouse_ref)}`, '_blank')}>
              🖨️ Print Nature's Breeze invoice
            </button>
            <button className="btn btn-ghost" onClick={reset}>New warehouse sale</button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="page-head">
        <h1>Warehouse sale</h1>
        <Tooltip text="Sell from both companies' warehouses on one order. Each company is billed and its stock reduced separately, but the customer gets one Nature's Breeze invoice." />
      </div>

      <div className="card card-pad" style={{ marginBottom: 16 }}>
        <div className="row2">
          <div className="field">
            <label>Type of sale <Tooltip text="Cash is paid in full now (split across the companies by price). Credit/Distributor is owed on the customer's shared balance." /></label>
            <div className="seg">
              {SALE_TYPES.map((t) => (
                <button key={t.key} className={saleType === t.key ? 'on' : ''} onClick={() => setSaleType(t.key)}>{t.label}</button>
              ))}
            </div>
          </div>
          <div className="field">
            <label>Payment method <Tooltip text="How the money is received. Recorded on every sale — cash, POS, transfer or cheque." /></label>
            <select className="input" value={payMethod} onChange={(e) => setPayMethod(e.target.value)}>
              {PAY_METHODS.map((m) => <option key={m.key} value={m.key}>{m.label}</option>)}
            </select>
          </div>
        </div>
        <div className="field">
          <label>Sale date <Tooltip text="The date this sale happened. Defaults to today; change it to back-date a sale." /></label>
          <input type="date" className="input" value={actionDate} max={new Date().toISOString().slice(0,10)} onChange={(e) => setActionDate(e.target.value)} style={{ maxWidth: 220 }} />
        </div>
        <div className="field">
          <label>{saleType === 'reseller' ? 'Distributor' : saleType === 'credit' ? 'Credit customer' : 'Customer'} <Tooltip text="Every sale is against a customer. For cash, pick a General customer or add one." /></label>
          <div className="toolbar-row" style={{ marginBottom: 0 }}>
            <div className="grow">
              <SearchableSelect value={customerId} onChange={setCustomerId} placeholder="— choose customer —"
                options={customers.map((c) => ({ value: c.id, label: `${c.name}${c.phone ? ` · ${c.phone}` : ''}` }))} />
            </div>
            <button className="btn btn-ghost" onClick={() => setAddCust(true)}>+ New</button>
          </div>
        </div>
      </div>

      <div className="card card-pad" style={{ marginBottom: 16 }}>
        <h2 style={{ marginBottom: 12 }}>Add products <Tooltip text="Search across both companies' warehouses. The company and warehouse stock are shown for each product." /></h2>
        <div className="row2">
          <div className="field">
            <label>Product</label>
            <SearchableSelect value={item.product_id} onChange={pickProduct} placeholder="— search both warehouses —"
              options={products.map((p) => ({ value: p.id, label: `[${p.company_code}] ${p.name} (${p.product_code}) · ${p.warehouse_stock} in stock` }))} />
            {item.product_id && (() => { const p = productById(item.product_id); return p ? (
              <div className="hint" style={{ marginTop: 6 }}>{p.company_name} warehouse: <b>{p.warehouse_stock}</b> {p.unit}</div>
            ) : null; })()}
          </div>
          <div className="row2">
            <div className="field">
              <label>Quantity</label>
              <NumberField className="input" allowDecimal={false} value={item.quantity} onChange={(v) => setItem({ ...item, quantity: v })} />
            </div>
            <div className="field">
              <label>Unit price</label>
              <NumberField className="input" value={item.unit_price} onChange={(v) => setItem({ ...item, unit_price: v })} />
            </div>
          </div>
        </div>
        <button className="btn btn-ghost" onClick={addItem}>+ Add to sale</button>
      </div>

      {error && <div className="banner-error" style={{ marginBottom: 12 }}>{error}</div>}

      <div className="card card-pad">
        <h2 style={{ marginBottom: 10 }}>Items ({cart.length})</h2>
        {cart.length === 0 ? <p className="subtle">No items yet.</p> : (
          <div className="table-wrap">
            <table className="t">
              <thead><tr><th>Company</th><th>Product</th><th className="num">Qty</th><th className="num">Unit</th><th className="num">Total</th><th></th></tr></thead>
              <tbody>
                {cart.map((c, i) => (
                  <tr key={i}>
                    <td><span className="code">{c.company_code}</span></td>
                    <td>{c.name}</td>
                    <td className="num">{c.quantity}</td>
                    <td className="num">{naira(c.unit_price)}</td>
                    <td className="num">{naira(c.quantity * c.unit_price)}</td>
                    <td className="num"><button className="linkbtn" style={{ color: 'var(--clay)' }} onClick={() => removeLine(i)}>Remove</button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {cart.length > 0 && (
          <div style={{ marginTop: 10 }}>
            <div className="subtle">Split: {Object.entries(split).map(([co, v]) => `${co} ${naira(v)}`).join('  ·  ')}</div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 8 }}>
              <b style={{ fontSize: 18 }}>Total: {naira(total)}</b>
              <button className="btn btn-primary" onClick={submit} disabled={busy}>{busy ? 'Recording…' : `Complete sale · ${naira(total)}`}</button>
            </div>
          </div>
        )}
      </div>

      {addCust && (
        <AddCustomerModal type={saleType === 'cash' ? 'general' : saleType}
          onClose={() => setAddCust(false)}
          onSaved={() => { const t = saleType === 'cash' ? 'general' : saleType; api(`/customers?type=${t}`).then(setCustomers); }} />
      )}
    </div>
  );
}
