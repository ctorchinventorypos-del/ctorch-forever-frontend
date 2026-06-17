// ============================================================
//  Records: dated, filterable history for every kind of record —
//  cash sales, credit sales, goods to resellers, payments (credit
//  and reseller), and returns. Sales rows can be reprinted.
// ============================================================
import { useEffect, useState, useCallback } from 'react';
import { api } from '../api/client';
import { useCompany } from '../context/CompanyContext';
import { naira } from '../utils/format';
import Tooltip from '../components/Tooltip';
import Spinner from '../components/Spinner';

const TYPES = [
  { key: 'cash_sales',       label: 'Cash sales',         path: '/sales?sale_type=cash',          kind: 'sale' },
  { key: 'credit_sales',     label: 'Credit sales',       path: '/sales?sale_type=credit',        kind: 'sale' },
  { key: 'reseller_sales',   label: 'Goods to resellers', path: '/sales?sale_type=reseller',      kind: 'sale' },
  { key: 'credit_payments',  label: 'Credit payments',    path: '/payments?customer_type=credit', kind: 'payment' },
  { key: 'reseller_payments',label: 'Reseller payments',  path: '/payments?customer_type=reseller', kind: 'payment' },
  { key: 'returns',          label: 'Returns',            path: '/returns',                       kind: 'return' },
];

export default function Records() {
  const { activeId, active } = useCompany();
  const [typeKey, setTypeKey] = useState('cash_sales');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);

  const cfg = TYPES.find((t) => t.key === typeKey);

  const load = useCallback(() => {
    setLoading(true);
    const sep = cfg.path.includes('?') ? '&' : '?';
    const parts = [];
    if (from) parts.push(`from=${from}`);
    if (to) parts.push(`to=${to}`);
    const url = parts.length ? cfg.path + sep + parts.join('&') : cfg.path;
    api(url).then(setRows).catch(() => setRows([])).finally(() => setLoading(false));
  }, [cfg.path, from, to]);

  useEffect(() => { if (activeId) load(); }, [activeId, load]);

  const fmtDate = (d) => new Date(d).toLocaleDateString('en-NG', { day: '2-digit', month: 'short', year: 'numeric' });

  function reprint(id) {
    const prefix = active && active.code === 'FOREVER' ? 'forever' : 'ctorch';
    window.open(`/${prefix}-invoice.html?id=${id}`, '_blank');
  }

  function printReceipt(id) {
    window.open(`/payment-receipt.html?id=${id}`, '_blank');
  }

  // running total for the footer
  const total = rows.reduce((s, r) => s + Number(r.total_amount ?? r.amount ?? r.refund_amount ?? 0), 0);

  return (
    <div>
      <div className="page-head">
        <h1>Records</h1>
        <Tooltip text="Every transaction, by date. Pick a record type and a date range. Sales can be reprinted." />
      </div>

      <div className="toolbar-row">
        <select className="input" style={{ maxWidth: 220 }} value={typeKey} onChange={(e) => setTypeKey(e.target.value)}>
          {TYPES.map((t) => <option key={t.key} value={t.key}>{t.label}</option>)}
        </select>
        <label className="hint" style={{ alignSelf: 'center' }}>From</label>
        <input className="input" style={{ maxWidth: 160 }} type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
        <label className="hint" style={{ alignSelf: 'center' }}>To</label>
        <input className="input" style={{ maxWidth: 160 }} type="date" value={to} onChange={(e) => setTo(e.target.value)} />
        {(from || to) && <button className="btn btn-ghost" onClick={() => { setFrom(''); setTo(''); }}>Clear</button>}
      </div>

      {loading ? (
        <Spinner full />
      ) : rows.length === 0 ? (
        <div className="card card-pad">
          <div className="empty">
            <div className="big">🗂️</div>
            <h2 style={{ marginBottom: 6 }}>Nothing here yet</h2>
            <p>No {cfg.label.toLowerCase()} for this company{(from || to) ? ' in that date range' : ''}.</p>
          </div>
        </div>
      ) : (
        <div className="table-wrap">
          <table className="t">
            {cfg.kind === 'sale' && (
              <>
                <thead>
                  <tr>
                    <th>Invoice</th><th>Date</th><th>Customer</th><th>Branch</th>
                    <th className="num">Total</th><th></th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r) => (
                    <tr key={r.id}>
                      <td><span className="code">{r.invoice_number}</span></td>
                      <td>{fmtDate(r.created_at)}</td>
                      <td>{r.customer_name || '—'}</td>
                      <td className="subtle">{r.branch_name}</td>
                      <td className="num">{naira(r.total_amount)}</td>
                      <td className="num"><button className="linkbtn" onClick={() => reprint(r.id)}>🖨️ Reprint</button></td>
                    </tr>
                  ))}
                </tbody>
              </>
            )}

            {cfg.kind === 'payment' && (
              <>
                <thead>
                  <tr><th>Date</th><th>Customer</th><th>Received by</th><th className="num">Amount</th><th></th></tr>
                </thead>
                <tbody>
                  {rows.map((r) => (
                    <tr key={r.id}>
                      <td>{fmtDate(r.created_at)}</td>
                      <td>{r.customer_name}</td>
                      <td className="subtle">{r.received_by || '—'}</td>
                      <td className="num" style={{ color: 'var(--green-700)', fontWeight: 700 }}>{naira(r.amount)}</td>
                      <td className="num"><button className="linkbtn" onClick={() => printReceipt(r.id)}>🖨️ Receipt</button></td>
                    </tr>
                  ))}
                </tbody>
              </>
            )}

            {cfg.kind === 'return' && (
              <>
                <thead>
                  <tr><th>Date</th><th>Invoice</th><th>Product</th><th className="num">Qty</th><th className="num">Refund</th><th>Back to</th></tr>
                </thead>
                <tbody>
                  {rows.map((r) => (
                    <tr key={r.id}>
                      <td>{fmtDate(r.created_at)}</td>
                      <td><span className="code">{r.invoice_number}</span></td>
                      <td>{r.product_name}</td>
                      <td className="num">{r.quantity}</td>
                      <td className="num">{naira(r.refund_amount)}</td>
                      <td className="subtle">{r.returned_to}</td>
                    </tr>
                  ))}
                </tbody>
              </>
            )}

            <tfoot>
              <tr>
                <td colSpan={cfg.kind === 'sale' ? 4 : cfg.kind === 'return' ? 4 : 3} style={{ fontWeight: 700 }}>
                  {rows.length} record{rows.length === 1 ? '' : 's'}
                </td>
                <td className="num" style={{ fontWeight: 800 }}>{naira(total)}</td>
                <td></td>
              </tr>
            </tfoot>
          </table>
        </div>
      )}
    </div>
  );
}
