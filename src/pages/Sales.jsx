// ============================================================
//  Sales: record a sale.
//   1. Choose the branch you're selling from.
//   2. Choose cash, credit, or reseller (credit/reseller need a customer).
//   3. Add items — price defaults to the selling price but you can change it.
//   4. Complete the sale, then print the invoice.
// ============================================================
import { useEffect, useState, useCallback, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { api } from '../api/client';
import { useCompany } from '../context/CompanyContext';
import { naira } from '../utils/format';
import Tooltip from '../components/Tooltip';
import Spinner from '../components/Spinner';
import AddCustomerModal from './customers/AddCustomerModal';
import ReturnBySaleModal from './sales/ReturnBySaleModal';

const TYPES = [
  { key: 'cash', label: 'Cash' },
  { key: 'credit', label: 'Credit' },
  { key: 'reseller', label: 'Reseller' },
];

const PAY_METHODS = [
  { key: 'cash', label: 'Cash' },
  { key: 'transfer', label: 'Transfer' },
  { key: 'pos', label: 'POS card' },
  { key: 'cheque', label: 'Cheque' },
];

function newKey() {
  try { return crypto.randomUUID(); }
  catch (e) { return 'k-' + Date.now() + '-' + Math.random().toString(16).slice(2); }
}

export default function Sales() {
  const { activeId, active } = useCompany();
  const location = useLocation();
  const saleKeyRef = useRef(newKey());

  const [loading, setLoading] = useState(true);
  const [branches, setBranches] = useState([]);
  const [products, setProducts] = useState([]);
  const [branchId, setBranchId] = useState('');
  const [saleType, setSaleType] = useState('cash');
  const [paymentMethod, setPaymentMethod] = useState('cash');
  const [customers, setCustomers] = useState([]);
  const [customerId, setCustomerId] = useState('');
  const [stockMap, setStockMap] = useState({});      // product_id -> qty at branch
  const [cart, setCart] = useState([]);
  const [amountPaid, setAmountPaid] = useState('');
  const [item, setItem] = useState({ product_id: '', quantity: '', unit_price: '' });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(null);
  const [addCust, setAddCust] = useState(false);
  const [returning, setReturning] = useState(false);
  const [fromQuote, setFromQuote] = useState(null);  // quote number we converted, if any

  // Base data
  useEffect(() => {
    if (!activeId) return;
    setLoading(true);
    Promise.all([api('/branches'), api('/products')])
      .then(([b, p]) => { setBranches(b); setProducts(p); })
      .finally(() => setLoading(false));
    // reset everything when the company changes
    setBranchId(''); setCart([]); setCustomerId(''); setStockMap({}); setDone(null); setSaleType('cash');
  }, [activeId]);

  // Customers for the chosen type
  useEffect(() => {
    setCustomerId('');
    if (saleType === 'cash') { setCustomers([]); return; }
    api(`/customers?type=${saleType}`).then(setCustomers).catch(() => {});
  }, [saleType, activeId]);

  // Stock available at the chosen branch
  const refreshStock = useCallback(() => {
    if (!branchId) { setStockMap({}); return; }
    api(`/stock?branch_id=${branchId}`).then((rows) => {
      const m = {};
      rows.forEach((r) => { m[r.product_id] = r.quantity; });
      setStockMap(m);
    }).catch(() => {});
  }, [branchId]);

  useEffect(() => { refreshStock(); }, [refreshStock, activeId]);

  const productById = useCallback((id) => products.find((p) => String(p.id) === String(id)), [products]);

  // If we arrived here from "Convert to sale" on a quotation, prefill the cart.
  useEffect(() => {
    const q = location.state && location.state.quote;
    if (!q || !products.length) return;
    const lines = [];
    (q.items || []).forEach((it) => {
      if (!it.product_id) return; // ad-hoc lines without a real product can't be sold
      const p = productById(it.product_id);
      if (!p) return;
      const qty = parseInt(it.quantity, 10) || 0;
      const price = Number(it.unit_price) || 0;
      if (qty > 0) lines.push({ product_id: p.id, name: p.name, unit: p.unit, quantity: qty, unit_price: price, subtotal: qty * price });
    });
    if (lines.length) setCart(lines);
    setFromQuote(q.quote_number || null);
    // clear the navigation state so a refresh doesn't re-add the items
    window.history.replaceState({}, '');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [products]);

  function pickProduct(id) {
    const p = productById(id);
    setItem({ product_id: id, quantity: '', unit_price: p ? p.recommended_price : '' });
  }

  function addItem() {
    setError('');
    const p = productById(item.product_id);
    const qty = parseInt(item.quantity, 10);
    const price = Number(item.unit_price);
    if (!p) return setError('Choose a product.');
    if (!qty || qty <= 0) return setError('Enter a quantity.');
    if (isNaN(price) || price < 0) return setError('Enter a price.');
    const available = stockMap[p.id] || 0;
    const already = cart.filter((c) => c.product_id === p.id).reduce((s, c) => s + c.quantity, 0);
    if (qty + already > available) {
      return setError(`Only ${available} of ${p.name} available at this branch.`);
    }
    setCart([...cart, { product_id: p.id, name: p.name, unit: p.unit, quantity: qty, unit_price: price, subtotal: qty * price }]);
    setItem({ product_id: '', quantity: '', unit_price: '' });
  }

  const removeItem = (i) => setCart(cart.filter((_, idx) => idx !== i));
  const total = cart.reduce((s, c) => s + c.subtotal, 0);

  async function complete() {
    setError('');
    if (!branchId) return setError('Choose the branch you are selling from.');
    if (cart.length === 0) return setError('Add at least one item.');
    if (saleType !== 'cash' && !customerId) return setError('Choose a customer.');
    setBusy(true);
    try {
      const res = await api('/sales', {
        method: 'POST',
        headers: { 'Idempotency-Key': saleKeyRef.current },
        body: {
          branch_id: branchId,
          sale_type: saleType,
          payment_method: paymentMethod,
          customer_id: saleType === 'cash' ? null : customerId,
          amount_paid: saleType === 'cash' ? undefined : Number(amountPaid) || 0,
          items: cart.map((c) => ({ product_id: c.product_id, quantity: c.quantity, unit_price: c.unit_price })),
        },
      });
      setDone(res);
      saleKeyRef.current = newKey(); // next sale = new action
      setCart([]); setCustomerId(''); setAmountPaid(''); setFromQuote(null); setPaymentMethod('cash');
      // refresh availability after the sale
      if (branchId) api(`/stock?branch_id=${branchId}`).then((rows) => {
        const m = {}; rows.forEach((r) => { m[r.product_id] = r.quantity; }); setStockMap(m);
      });
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  function printInvoice() {
    const prefix = active && active.code === 'FOREVER' ? 'forever' : 'ctorch';
    window.open(`/${prefix}-invoice.html?id=${done.id}`, '_blank');
  }

  if (loading) return <Spinner full />;

  // success screen after a completed sale
  if (done) {
    return (
      <div>
        <div className="page-head"><h1>Sales</h1></div>
        <div className="card success-card">
          <div className="big">✅</div>
          <h2 style={{ marginBottom: 6 }}>Sale recorded</h2>
          <p className="subtle">Invoice <b>{done.invoice_number}</b> · Total {naira(done.total_amount)}</p>
          <div style={{ display: 'flex', gap: 10, justifyContent: 'center', marginTop: 18, flexWrap: 'wrap' }}>
            <button className="btn btn-primary" onClick={printInvoice}>🖨️ Print invoice</button>
            <button className="btn btn-ghost" onClick={() => setDone(null)}>New sale</button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="page-head">
        <h1>New sale</h1>
        <Tooltip text="Record a sale here. Cash is paid in full now; credit and reseller sales are owed by a customer until they pay." />
        <div className="spacer" />
        <button className="btn btn-ghost" onClick={() => setReturning(true)}>↩️ Return by invoice</button>
      </div>

      {error && <div className="banner-error">{error}</div>}
      {fromQuote && (
        <div className="banner-error" style={{ background: '#e8f5ec', borderColor: '#bfe3cd', color: 'var(--green-800)' }}>
          Converting quotation <b>{fromQuote}</b>. Choose the branch and sale type, then complete it.
        </div>
      )}

      <div className="card card-pad" style={{ marginBottom: 16 }}>
        <div className="row2">
          <div className="field">
            <label>Selling from <Tooltip text="The branch or warehouse the goods leave from. Stock is taken from here." /></label>
            <select className="input" value={branchId} onChange={(e) => setBranchId(e.target.value)}>
              <option value="">— choose branch —</option>
              {branches.map((b) => (
                <option key={b.id} value={b.id}>{b.name}{b.is_warehouse ? ' (Warehouse)' : ''}</option>
              ))}
            </select>
          </div>
          <div className="field">
            <label>Type of sale</label>
            <div className="seg">
              {TYPES.map((t) => (
                <button key={t.key} className={saleType === t.key ? 'on' : ''} onClick={() => setSaleType(t.key)}>
                  {t.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {saleType !== 'cash' && (
          <div className="field">
            <label>
              {saleType === 'reseller' ? 'Reseller' : 'Credit customer'}
              <Tooltip text="The person who owes for this sale. The unpaid amount is added to their balance." />
            </label>
            <div className="toolbar-row" style={{ marginBottom: 0 }}>
              <select className="input grow" value={customerId} onChange={(e) => setCustomerId(e.target.value)}>
                <option value="">— choose —</option>
                {customers.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}{c.phone ? ` · ${c.phone}` : ''}</option>
                ))}
              </select>
              <button className="btn btn-ghost" onClick={() => setAddCust(true)}>+ New</button>
            </div>
          </div>
        )}
      </div>

      {/* Add item */}
      <div className="card card-pad" style={{ marginBottom: 16 }}>
        <h2 style={{ marginBottom: 12 }}>Add items</h2>
        <div className="row2">
          <div className="field">
            <label>Product</label>
            <select className="input" value={item.product_id} onChange={(e) => pickProduct(e.target.value)} disabled={!branchId}>
              <option value="">— choose —</option>
              {products.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} ({p.product_code}) · {stockMap[p.id] || 0} in stock
                </option>
              ))}
            </select>
            {!branchId && <div className="hint">Choose a branch first to see available stock.</div>}
          </div>
          <div className="row2">
            <div className="field">
              <label>Quantity</label>
              <input className="input" type="number" value={item.quantity}
                onChange={(e) => setItem({ ...item, quantity: e.target.value })} />
            </div>
            <div className="field">
              <label>Price each <Tooltip text="Defaults to the selling price, but you can charge a different price here." /></label>
              <input className="input" type="number" value={item.unit_price}
                onChange={(e) => setItem({ ...item, unit_price: e.target.value })} />
            </div>
          </div>
        </div>
        <button className="btn btn-ghost" onClick={addItem}>+ Add to sale</button>
      </div>

      {/* Cart */}
      {cart.length > 0 && (
        <div className="card card-pad" style={{ marginBottom: 16 }}>
          {cart.map((c, i) => (
            <div className="cart-line" key={i}>
              <div className="g">
                <div>{c.name}</div>
                <div className="qty">{c.quantity} {c.unit} × {naira(c.unit_price)}</div>
              </div>
              <b>{naira(c.subtotal)}</b>
              <button className="linkbtn" style={{ color: 'var(--clay)' }} onClick={() => removeItem(i)}>Remove</button>
            </div>
          ))}
          <div className="totalbar"><span>Total</span><span>{naira(total)}</span></div>

          {saleType !== 'cash' && (
            <div className="field" style={{ marginTop: 14 }}>
              <label>Amount paid now <Tooltip text="How much the customer is paying today. The rest is added to what they owe. Leave at 0 for full credit." /></label>
              <input className="input" type="number" value={amountPaid}
                onChange={(e) => setAmountPaid(e.target.value)} placeholder="0" />
            </div>
          )}

          <div className="field" style={{ marginTop: 14 }}>
            <label>
              Payment method
              <Tooltip text="How the money came in. Recorded on the sale so you can reconcile cash, transfers and POS separately." />
            </label>
            <div className="seg">
              {PAY_METHODS.map((m) => (
                <button key={m.key} className={paymentMethod === m.key ? 'on' : ''} onClick={() => setPaymentMethod(m.key)}>
                  {m.label}
                </button>
              ))}
            </div>
          </div>

          <button className="btn btn-primary btn-block btn-lg" style={{ marginTop: 14 }} onClick={complete} disabled={busy}>
            {busy ? 'Recording…' : `Complete sale · ${naira(total)}`}
          </button>
        </div>
      )}

      {returning && <ReturnBySaleModal onClose={() => setReturning(false)} onSaved={refreshStock} />}

      {addCust && (
        <AddCustomerModal
          type={saleType}
          onClose={() => setAddCust(false)}
          onSaved={(c) => { setCustomers((list) => [...list, c]); setCustomerId(String(c.id)); }}
        />
      )}
    </div>
  );
}
