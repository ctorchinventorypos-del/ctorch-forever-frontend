// ============================================================
//  Edit sale (SUPER ADMIN): correct the line items of a completed
//  sale. Saving reverses the original stock and applies the new
//  lines, then re-figures the total and the customer balance.
// ============================================================
import { useEffect, useState } from 'react';
import Modal from '../../components/Modal';
import { api } from '../../api/client';
import { naira } from '../../utils/format';
import SearchableSelect from '../../components/SearchableSelect';
import NumberField from '../../components/NumberField';

export default function EditSaleModal({ saleId, onClose, onSaved }) {
  const [sale, setSale] = useState(null);
  const [stock, setStock] = useState([]);      // products available at the sale's branch
  const [lines, setLines] = useState([]);       // { product_id, quantity, unit_price }
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    api(`/sales/${saleId}`).then((s) => {
      setSale(s);
      setLines((s.items || []).map((it) => ({ product_id: String(it.product_id), name: it.name, quantity: String(it.quantity), unit_price: String(it.unit_price) })));
      if (s.branch_id) api(`/stock?branch_id=${s.branch_id}`).then(setStock).catch(() => {});
    }).catch((e) => setError(e.message));
  }, [saleId]);

  const productById = (id) => stock.find((p) => String(p.product_id) === String(id));
  const setLine = (i, patch) => setLines(lines.map((l, idx) => (idx === i ? { ...l, ...patch } : l)));
  const pick = (i, id) => { const p = productById(id); setLine(i, { product_id: id, name: p ? p.name : '', unit_price: lines[i].unit_price || (p ? String(p.recommended_price || '') : '') }); };
  const addLine = () => setLines([...lines, { product_id: '', quantity: '', unit_price: '' }]);
  const delLine = (i) => setLines(lines.filter((_, idx) => idx !== i));

  const total = lines.reduce((s, l) => s + (Number(l.quantity) || 0) * (Number(l.unit_price) || 0), 0);

  async function save() {
    setError('');
    if (lines.length === 0) return setError('A sale must have at least one item.');
    for (const l of lines) {
      if (!l.product_id || !Number(l.quantity) || Number(l.unit_price) === '' ) return setError('Every line needs a product, quantity and price.');
    }
    if (!window.confirm('Correct this sale? Stock will be adjusted (old items returned, new items removed) and the customer balance updated.')) return;
    setBusy(true);
    try {
      await api(`/sales/${saleId}/items`, { method: 'PUT', body: { items: lines.map((l) => ({ product_id: l.product_id, quantity: Number(l.quantity), unit_price: Number(l.unit_price) })) } });
      if (onSaved) onSaved();
      onClose();
    } catch (e) { setError(e.message); }
    finally { setBusy(false); }
  }

  return (
    <Modal title={sale ? `Correct sale ${sale.invoice_number}` : 'Correct sale'} onClose={onClose} wide
      footer={<>
        <button className="btn btn-ghost" onClick={onClose}>Cancel</button>
        <button className="btn btn-primary" onClick={save} disabled={busy || !sale}>{busy ? 'Saving…' : `Save correction · ${naira(total)}`}</button>
      </>}>
      {!sale ? <p className="subtle">Loading…</p> : (
        <>
          <p className="subtle" style={{ marginBottom: 10 }}>
            Quantities are in pieces; price is per piece. Stock is taken from <b>{sale.branch_name}</b>.
            {sale.sale_type !== 'cash' ? ' The customer balance will be re-figured.' : ''}
          </p>
          {lines.map((l, i) => (
            <div key={i} style={{ display: 'grid', gridTemplateColumns: '1fr 90px 120px auto', gap: 8, marginBottom: 8, alignItems: 'center' }}>
              <SearchableSelect value={l.product_id} onChange={(id) => pick(i, id)} placeholder="— product —"
                options={stock.map((p) => ({ value: p.product_id, label: `${p.owner_code ? '[' + p.owner_code + '] ' : ''}${p.name} · ${p.quantity} in stock` }))} />
              <NumberField className="input" allowDecimal={false} value={l.quantity} onChange={(v) => setLine(i, { quantity: v })} />
              <NumberField className="input" value={l.unit_price} onChange={(v) => setLine(i, { unit_price: v })} />
              <button className="linkbtn" style={{ color: 'var(--clay)' }} onClick={() => delLine(i)}>✕</button>
            </div>
          ))}
          <button className="btn btn-ghost" onClick={addLine}>+ Add line</button>
          {error && <div className="banner-error" style={{ marginTop: 10 }}>{error}</div>}
          <p style={{ marginTop: 10, textAlign: 'right' }}><b>New total: {naira(total)}</b></p>
        </>
      )}
    </Modal>
  );
}
