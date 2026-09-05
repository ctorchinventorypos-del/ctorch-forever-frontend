// ============================================================
//  Records: dated, filterable history for every kind of record —
//  cash sales, credit sales, goods to resellers, payments (credit
//  and reseller), and returns. Sales rows can be reprinted.
// ============================================================
import { useEffect, useState, useCallback } from 'react';
import { api } from '../api/client';
import Modal from '../components/Modal';
import SearchableSelect from '../components/SearchableSelect';
import { useCompany } from '../context/CompanyContext';
import { useAuth } from '../context/AuthContext';
import { usePerms } from '../context/PermissionsContext';
import { naira } from '../utils/format';
import Tooltip from '../components/Tooltip';
import Spinner from '../components/Spinner';

const ALL_TYPES = [
  { key: 'cash_sales',       label: 'Cash sales',         path: '/sales?sale_type=cash',          kind: 'sale' },
  { key: 'credit_sales',     label: 'Credit sales',       path: '/sales?sale_type=credit',        kind: 'sale' },
  { key: 'reseller_sales',   label: 'Goods to distributors', path: '/sales?sale_type=reseller',      kind: 'sale' },
  { key: 'credit_payments',  label: 'Credit payments',    path: '/payments?customer_type=credit', kind: 'payment' },
  { key: 'reseller_payments',label: 'Distributor payments',  path: '/payments?customer_type=reseller', kind: 'payment' },
  { key: 'returns',          label: 'Returns',            path: '/returns/customer',              kind: 'return' },
  { key: 'stock_changes',    label: 'Stock changes',      path: '/stock/movements',               kind: 'stock' },
  { key: 'products_added',   label: 'Products added',     path: '/products?include_inactive=1',   kind: 'product' },
];

export default function Records() {
  const { activeId, active } = useCompany();
  const { isAdmin } = useAuth();
  const { can } = usePerms();
  // Non-admins never see stock changes or products-added records.
  const featFor = (t) => (
    t.kind === 'sale' ? 'records.sales'
    : t.kind === 'payment' ? 'records.payments'
    : t.kind === 'return' ? 'records.returns'
    : t.key === 'stock_changes' ? 'records.stock_changes'
    : t.key === 'products_added' ? 'records.products_added' : null);
  const TYPES = ALL_TYPES.filter((t) => { const f = featFor(t); return f ? can(f) : true; });
  const [typeKey, setTypeKey] = useState('cash_sales');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [rows, setRows] = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  const cfg = TYPES.find((t) => t.key === typeKey);

  // Admin: change the date of a past sale / payment / return.
  const [settingCust, setSettingCust] = useState(null);
  const [custList, setCustList] = useState([]);
  const [custPick, setCustPick] = useState('');
  useEffect(() => { if (settingCust) api('/customers').then(setCustList).catch(() => setCustList([])); }, [settingCust]);

  const saveCustomer = async () => {
    if (!custPick) return;
    try { await api(`/sales/${settingCust.id}/customer`, { method: 'PATCH', body: { customer_id: custPick } }); setSettingCust(null); setCustPick(''); load(); }
    catch (e) { window.alert(e.message); }
  };

  const changeDate = async (kind, id, current) => {
    const cur = current ? new Date(current).toISOString().slice(0, 10) : '';
    const val = window.prompt('New date (YYYY-MM-DD):', cur);
    if (!val) return;
    const ep = kind === 'sale' ? `/sales/${id}/date`
      : kind === 'payment' ? `/payments/${id}/date`
      : kind === 'return' ? `/returns/customer/${id}/date` : null;
    if (!ep) return;
    try { await api(ep, { method: 'PATCH', body: { date: val } }); load(); }
    catch (e) { window.alert(e.message); }
  };

  const load = useCallback(() => {
    setLoading(true);
    const sep = cfg.path.includes('?') ? '&' : '?';
    const parts = [];
    if (from) parts.push(`from=${from}`);
    if (to) parts.push(`to=${to}`);
    const url = parts.length ? cfg.path + sep + parts.join('&') : cfg.path;
    api(url)
      .then((data) => {
        let out = data || [];
        // Stock changes and product-creation lists aren't date-filtered by the
        // server, so filter (and sort newest-first) here.
        if (cfg.kind === 'stock' || cfg.kind === 'product') {
          if (from) out = out.filter((r) => new Date(r.created_at) >= new Date(from));
          if (to) out = out.filter((r) => new Date(r.created_at) < new Date(new Date(to).getTime() + 86400000));
          out = [...out].sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
        }
        setRows(out);
      })
      .catch(() => setRows([]))
      .finally(() => setLoading(false));
  }, [cfg.path, cfg.kind, from, to]);

  useEffect(() => { if (activeId) load(); }, [activeId, load]);

  const fmtDate = (d) => new Date(d).toLocaleDateString('en-NG', { day: '2-digit', month: 'short', year: 'numeric' });

  function reprint(id) {
    const prefix = active && active.code === 'FOREVER' ? 'forever' : 'ctorch';
    window.open(`/${prefix}-invoice.html?id=${id}`, '_blank');
  }

  function printReceipt(id) {
    window.open(`/payment-receipt.html?id=${id}`, '_blank');
  }

  // Search across every field of a record (invoice, customer, branch, amount, method, note, date…).
  const matches = (r) => {
    const t = search.trim().toLowerCase();
    if (!t) return true;
    const dateStr = r.created_at ? new Date(r.created_at).toLocaleDateString('en-NG', { day: '2-digit', month: 'short', year: 'numeric' }).toLowerCase() : '';
    return dateStr.includes(t) || Object.values(r).some((v) => v != null && String(v).toLowerCase().includes(t));
  };
  const visibleRows = rows.filter(matches);

  // running total for the footer
  const total = visibleRows.reduce((sum, r) => sum + Number(r.total_amount ?? r.amount ?? r.refund_amount ?? 0), 0);

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
        <input className="input grow" style={{ minWidth: 160 }} placeholder="🔎 Search (invoice, customer, amount, branch…)" value={search} onChange={(e) => setSearch(e.target.value)} />
        <label className="hint" style={{ alignSelf: 'center' }}>From</label>
        <input className="input" style={{ maxWidth: 160 }} type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
        <label className="hint" style={{ alignSelf: 'center' }}>To</label>
        <input className="input" style={{ maxWidth: 160 }} type="date" value={to} onChange={(e) => setTo(e.target.value)} />
        {(from || to) && <button className="btn btn-ghost" onClick={() => { setFrom(''); setTo(''); }}>Clear</button>}
      </div>

      {loading ? (
        <Spinner full />
      ) : visibleRows.length === 0 ? (
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
                  {visibleRows.map((r) => (
                    <tr key={r.id}>
                      <td><span className="code">{r.invoice_number}</span></td>
                      <td>{fmtDate(r.created_at)}{isAdmin && ['sale','payment','return'].includes(cfg.kind) && <button className="linkbtn" title="Change this date" style={{ marginLeft: 6 }} onClick={() => changeDate(cfg.kind, r.id, r.created_at)}>✎</button>}</td>
                      <td>{r.customer_name || '—'}{can('records.edit_customer') && <button className="linkbtn" title="Set / change the customer on this sale" style={{ marginLeft: 6 }} onClick={() => setSettingCust(r)}>✎</button>}</td>
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
                  {visibleRows.map((r) => (
                    <tr key={r.id}>
                      <td>{fmtDate(r.created_at)}{isAdmin && ['sale','payment','return'].includes(cfg.kind) && <button className="linkbtn" title="Change this date" style={{ marginLeft: 6 }} onClick={() => changeDate(cfg.kind, r.id, r.created_at)}>✎</button>}</td>
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
                  <tr><th>Date</th><th>Return No.</th><th>Customer</th><th>Back to</th><th className="num">Value</th><th></th></tr>
                </thead>
                <tbody>
                  {visibleRows.map((r) => (
                    <tr key={r.id}>
                      <td>{fmtDate(r.created_at)}{isAdmin && ['sale','payment','return'].includes(cfg.kind) && <button className="linkbtn" title="Change this date" style={{ marginLeft: 6 }} onClick={() => changeDate(cfg.kind, r.id, r.created_at)}>✎</button>}</td>
                      <td><span className="code">{r.return_number}</span></td>
                      <td>{r.customer_name}</td>
                      <td className="subtle">{r.branch_name}</td>
                      <td className="num">{naira(r.total_amount)}</td>
                      <td className="num">
                        <button className="linkbtn" onClick={() => window.open(`/return-invoice.html?id=${r.id}&copy=customer`, '_blank')}>Print</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </>
            )}

            {cfg.kind === 'stock' && (
              <>
                <thead>
                  <tr><th>Date</th><th>Product</th><th>Change</th><th className="num">Qty</th><th>Location</th><th>By</th></tr>
                </thead>
                <tbody>
                  {visibleRows.map((r) => {
                    const labels = { restock: 'Restock', transfer: 'Transfer', sale: 'Sale', adjustment: 'Stock edit', return: 'Return' };
                    const where = r.movement_type === 'transfer' ? `${r.from_branch || '—'} → ${r.to_branch || '—'}` : (r.to_branch || r.from_branch || '—');
                    return (
                      <tr key={r.id}>
                        <td>{fmtDate(r.created_at)}{isAdmin && ['sale','payment','return'].includes(cfg.kind) && <button className="linkbtn" title="Change this date" style={{ marginLeft: 6 }} onClick={() => changeDate(cfg.kind, r.id, r.created_at)}>✎</button>}</td>
                        <td>{r.product_name} <span className="subtle">({r.product_code})</span></td>
                        <td><span className="tag tag-store">{labels[r.movement_type] || r.movement_type}</span></td>
                        <td className="num" style={{ color: Number(r.quantity) < 0 ? 'var(--clay)' : 'inherit' }}>{Number(r.quantity) > 0 ? '+' : ''}{r.quantity}</td>
                        <td className="subtle">{where}</td>
                        <td className="subtle">{r.done_by || '—'}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </>
            )}

            {cfg.kind === 'product' && (
              <>
                <thead>
                  <tr><th>Date added</th><th>Product</th><th>Code</th><th>Category</th><th className="num">In stock</th><th>Added by</th></tr>
                </thead>
                <tbody>
                  {visibleRows.map((r) => (
                    <tr key={r.id} style={r.is_active === false ? { opacity: 0.55 } : null}>
                      <td>{fmtDate(r.created_at)}{isAdmin && ['sale','payment','return'].includes(cfg.kind) && <button className="linkbtn" title="Change this date" style={{ marginLeft: 6 }} onClick={() => changeDate(cfg.kind, r.id, r.created_at)}>✎</button>}</td>
                      <td>{r.name}{r.is_active === false && <span className="tag tag-store" style={{ marginLeft: 6 }}>Deactivated</span>}</td>
                      <td><span className="code">{r.product_code}</span></td>
                      <td className="subtle">{r.category_name || '—'}</td>
                      <td className="num">{r.total_stock} {r.unit}</td>
                      <td className="subtle">{r.created_by_name || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </>
            )}

            <tfoot>
              {cfg.kind === 'stock' || cfg.kind === 'product' ? (
                <tr>
                  <td colSpan="6" style={{ fontWeight: 700 }}>{visibleRows.length} record{visibleRows.length === 1 ? '' : 's'}</td>
                </tr>
              ) : (
                <tr>
                  <td colSpan={cfg.kind === 'sale' ? 4 : cfg.kind === 'return' ? 4 : 3} style={{ fontWeight: 700 }}>
                    {visibleRows.length} record{visibleRows.length === 1 ? '' : 's'}
                  </td>
                  <td className="num" style={{ fontWeight: 800 }}>{naira(total)}</td>
                  <td></td>
                </tr>
              )}
            </tfoot>
          </table>
        </div>
      )}
      {settingCust && (
        <Modal title={`Set customer for ${settingCust.invoice_number}`} onClose={() => { setSettingCust(null); setCustPick(''); }}
          footer={<><button className="btn btn-ghost" onClick={() => { setSettingCust(null); setCustPick(''); }}>Cancel</button>
            <button className="btn btn-primary" onClick={saveCustomer} disabled={!custPick}>Save</button></>}>
          <p className="subtle" style={{ marginBottom: 10 }}>Attribute this sale to a customer. If it was on credit, the balance moves to them.</p>
          <SearchableSelect value={custPick} onChange={setCustPick} placeholder="— choose customer —"
            options={custList.map((c) => ({ value: c.id, label: `${c.name}${c.phone ? ' · ' + c.phone : ''}` }))} />
        </Modal>
      )}
    </div>
  );
}