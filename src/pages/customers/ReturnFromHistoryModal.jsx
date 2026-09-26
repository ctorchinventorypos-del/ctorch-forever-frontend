// ============================================================
//  Return from a customer's history: pick the product(s) they
//  bought, choose which purchase (date), set quantity, then either
//  refund cash (recorded as an expense) or add it as store credit.
//  A note is REQUIRED.
// ============================================================
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Modal from '../../components/Modal';
import { api } from '../../api/client';
import { naira } from '../../utils/format';
import { usePerms } from '../../context/PermissionsContext';
import { useAuth } from '../../context/AuthContext';

function newKey() { try { return crypto.randomUUID(); } catch (e) { return 'k-' + Date.now() + '-' + Math.random(); } }

export default function ReturnFromHistoryModal({ customer, onClose, onSaved }) {
  const { can } = usePerms();
  const { isAdmin } = useAuth();
  const navigate = useNavigate();
  const [choosing, setChoosing] = useState(false); // the "how to complete" popup
  const [purchases, setPurchases] = useState([]);   // [{product_id, name, purchases:[{sale_id,date,qty,price,branch_id,company_code,invoice_number}]}]
  const [branches, setBranches] = useState([]);
  const [productId, setProductId] = useState('');
  const [purchaseIdx, setPurchaseIdx] = useState('');
  const [qty, setQty] = useState('1');
  const [lines, setLines] = useState([]);
  const [branchId, setBranchId] = useState('');
  const [note, setNote] = useState('');
  const [refundMethod, setRefundMethod] = useState('cash');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const keyRef = useState(newKey())[0];

  useEffect(() => {
    api(`/customers/${customer.id}/purchases`).then(setPurchases).catch(() => setPurchases([]));
    api('/branches').then((b) => { setBranches(b); if (b[0]) setBranchId(String(b[0].id)); }).catch(() => {});
  }, [customer.id]);

  const product = purchases.find((p) => String(p.product_id) === String(productId));
  const purchase = product && purchaseIdx !== '' ? product.purchases[Number(purchaseIdx)] : null;
  const fmtDate = (d) => new Date(d).toLocaleDateString('en-NG', { day: '2-digit', month: 'short', year: 'numeric' });

  function addLine() {
    setError('');
    if (!product || !purchase) return setError('Choose a product and the purchase date.');
    const q = parseInt(qty, 10);
    if (!q || q <= 0) return setError('Enter a quantity.');
    if (q > purchase.quantity) return setError(`They only bought ${purchase.quantity} on that date.`);
    setLines([...lines, {
      product_id: product.product_id, name: product.name, quantity: q,
      unit_price: purchase.unit_price, date: purchase.created_at, invoice: purchase.invoice_number,
    }]);
    setProductId(''); setPurchaseIdx(''); setQty('1');
  }
  const removeLine = (i) => setLines(lines.filter((_, idx) => idx !== i));
  const total = lines.reduce((s, l) => s + l.quantity * l.unit_price, 0);

  // Check the form is ready, then open the "how to complete" popup.
  function openChoice() {
    setError('');
    if (lines.length === 0) return setError('Add at least one item to return.');
    if (!branchId) return setError('Choose where the goods are returned to.');
    if (note.trim().length < 3) return setError('A note is required — say why it is being returned.');
    setChoosing(true);
  }

  // mode: 'refund' | 'credit' | 'balance' (reduce debt) | 'swap'
  async function complete(mode) {
    setError('');
    if (mode === 'refund' && !can('return.refund')) return setError('You are not allowed to give cash refunds.');
    if (mode === 'swap' && !(isAdmin && can('return.swap'))) return setError('Only an admin can swap items.');
    setBusy(true);
    try {
      const res = await api('/returns/customer', {
        method: 'POST',
        headers: { 'Idempotency-Key': keyRef },
        body: {
          customer_id: customer.id, branch_id: branchId, refund_mode: mode, note: note.trim(),
          refund_method: mode === 'refund' ? refundMethod : undefined,
          items: lines.map((l) => ({ product_id: l.product_id, quantity: l.quantity, unit_price: l.unit_price })),
        },
      });
      if (onSaved) onSaved();
      onClose();
      if (mode === 'swap') {
        // Go straight to a sale for the swap-in goods, credit already applied.
        navigate('/sales', { state: { swapCustomerId: customer.id, swapFromReturn: res.return_number, swapBranchId: branchId } });
      }
    } catch (e) { setError(e.message); setBusy(false); }
  }

  return (
    <Modal title={`Return — ${customer.name}`} onClose={onClose} wide
      footer={<>
        <button className="btn btn-ghost" onClick={onClose}>Cancel</button>
        <button className="btn btn-primary" onClick={openChoice} disabled={busy}>{busy ? 'Saving…' : `Complete return · ${naira(total)}`}</button>
      </>}>
      {choosing && (
        <div style={{ position: 'absolute', inset: 0, background: 'rgba(15,40,28,.45)', display: 'grid', placeItems: 'center', zIndex: 5, borderRadius: 14 }}>
          <div className="card card-pad" style={{ maxWidth: 380, width: '90%', background: '#fff' }}>
            <h2 style={{ marginBottom: 4 }}>How is this return completed?</h2>
            <p className="subtle" style={{ marginBottom: 14 }}>Returning {naira(total)} of goods for {customer.name}.</p>
            <div style={{ display: 'grid', gap: 10 }}>
              {Number(customer.balance_owed) > 0 && (
                <button className="btn btn-ghost" style={{ justifyContent: 'flex-start' }} onClick={() => complete('balance')} disabled={busy}>
                  ↩️ Just a return — take it off their debt (owes {naira(customer.balance_owed)})
                </button>
              )}
              <button className="btn btn-ghost" style={{ justifyContent: 'flex-start' }} onClick={() => complete('credit')} disabled={busy}>
                🏦 Add credit — keep it as store credit for later
              </button>
              {can('return.refund') && (
                <div style={{ border: '1px solid var(--line)', borderRadius: 10, padding: 10 }}>
                  <div style={{ fontWeight: 600, marginBottom: 6 }}>💵 Refund the money</div>
                  <select className="input" value={refundMethod} onChange={(e) => setRefundMethod(e.target.value)} style={{ marginBottom: 8 }}>
                    <option value="cash">Cash</option>
                    <option value="pos">POS Card (Moniepoint)</option>
                    <option value="transfer_moniepoint">Transfer - Moniepoint</option>
                    <option value="transfer_zenith">Transfer - Zenith Bank</option>
                    <option value="cheque">Cheque</option>
                  </select>
                  <button className="btn btn-ghost btn-block" onClick={() => complete('refund')} disabled={busy}>Refund {naira(total)}</button>
                </div>
              )}
              {isAdmin && can('return.swap') && (
                <button className="btn btn-primary" style={{ justifyContent: 'flex-start' }} onClick={() => complete('swap')} disabled={busy}>
                  🔁 Swap with other item(s) — exchange for new goods
                </button>
              )}
            </div>
            <button className="btn btn-ghost" style={{ marginTop: 12 }} onClick={() => setChoosing(false)} disabled={busy}>Back</button>
          </div>
        </div>
      )}
      {purchases.length === 0 ? <p className="subtle">This customer has no recorded purchases to return.</p> : (
        <>
          <div className="row2">
            <div className="field">
              <label>Product they bought</label>
              <select className="input" value={productId} onChange={(e) => { setProductId(e.target.value); setPurchaseIdx(''); }}>
                <option value="">— choose a product —</option>
                {purchases.map((p) => <option key={p.product_id} value={p.product_id}>{p.name}</option>)}
              </select>
            </div>
            <div className="field">
              <label>Which purchase (date)</label>
              <select className="input" value={purchaseIdx} onChange={(e) => setPurchaseIdx(e.target.value)} disabled={!product}>
                <option value="">— choose the date —</option>
                {product && product.purchases.map((pu, i) => (
                  <option key={i} value={i}>{fmtDate(pu.created_at)} · {pu.company_code} {pu.invoice_number} · {pu.quantity} @ {naira(pu.unit_price)}</option>
                ))}
              </select>
            </div>
          </div>
          <div className="toolbar-row">
            <div className="field" style={{ maxWidth: 140, marginBottom: 0 }}>
              <label>Quantity</label>
              <input className="input" type="number" min="1" value={qty} onChange={(e) => setQty(e.target.value)} />
            </div>
            <button className="btn btn-ghost" style={{ alignSelf: 'flex-end' }} onClick={addLine}>+ Add to return</button>
          </div>

          {lines.length > 0 && (
            <div className="table-wrap" style={{ marginTop: 10 }}>
              <table className="t">
                <thead><tr><th>Product</th><th>From</th><th className="num">Qty</th><th className="num">Refund each</th><th className="num">Total</th><th></th></tr></thead>
                <tbody>
                  {lines.map((l, i) => (
                    <tr key={i}>
                      <td>{l.name}</td><td className="subtle">{l.invoice} · {fmtDate(l.date)}</td>
                      <td className="num">{l.quantity}</td><td className="num">{naira(l.unit_price)}</td>
                      <td className="num">{naira(l.quantity * l.unit_price)}</td>
                      <td className="num"><button className="linkbtn" style={{ color: 'var(--clay)' }} onClick={() => removeLine(i)}>✕</button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <div className="field" style={{ marginTop: 12 }}>
            <label>Returned to (location)</label>
            <select className="input" value={branchId} onChange={(e) => setBranchId(e.target.value)}>
              {branches.map((b) => <option key={b.id} value={b.id}>{b.name}{b.is_warehouse ? ' (Warehouse)' : ''}</option>)}
            </select>
            <div className="hint" style={{ marginTop: 4 }}>You'll choose refund, store credit, or a swap when you complete.</div>
          </div>

          <div className="field">
            <label>Note (required) <span style={{ color: 'var(--clay)' }}>*</span></label>
            <input className="input" value={note} onChange={(e) => setNote(e.target.value)} placeholder="Why is it being returned? (e.g. wrong item, faulty)" />
          </div>

          {error && <div className="banner-error" style={{ marginTop: 6 }}>{error}</div>}
        </>
      )}
    </Modal>
  );
}
