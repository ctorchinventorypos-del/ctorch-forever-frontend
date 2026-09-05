// ============================================================
//  Transfer records: pick a location and see every product that
//  moved IN or OUT of it (restocks, transfers, sales, adjustments),
//  for any date range. Printable per branch.
// ============================================================
import { useEffect, useState } from 'react';
import { api } from '../api/client';
import Tooltip from '../components/Tooltip';

export default function TransferRecords() {
  const [branches, setBranches] = useState([]);
  const [branchId, setBranchId] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');

  useEffect(() => { api('/branches/all').then(setBranches).catch(() => {}); }, []);
  useEffect(() => {
    if (!branchId) { setData(null); return; }
    const q = new URLSearchParams({ branch_id: branchId });
    if (from) q.set('from', from);
    if (to) q.set('to', to);
    setLoading(true);
    api(`/stock/branch-movements?${q.toString()}`).then(setData).catch(() => setData(null)).finally(() => setLoading(false));
  }, [branchId, from, to]);

  const shown = (data?.movements || []).filter((m) => { const t = search.trim().toLowerCase(); if (!t) return true; return Object.values(m).some((v) => v != null && String(v).toLowerCase().includes(t)); });

  const fmt = (d) => new Date(d).toLocaleString('en-NG', { day: '2-digit', month: 'short', year: '2-digit', hour: '2-digit', minute: '2-digit' });
  const branchName = (id) => { const b = branches.find((x) => String(x.id) === String(id)); return b ? `${b.company_code} · ${b.name}` : ''; };
  const openPrint = () => {
    const q = new URLSearchParams({ branch_id: branchId });
    if (from) q.set('from', from); if (to) q.set('to', to);
    window.open(`/branch-movements-print.html?${q.toString()}`, '_blank');
  };

  return (
    <div>
      <div className="page-head">
        <h1>Transfer records</h1>
        <Tooltip text="Every product that moved in or out of a location — restocks, transfers, sales and adjustments. Choose a branch and date range, then print." />
      </div>

      <div className="card card-pad" style={{ marginBottom: 16 }}>
        <div className="toolbar-row">
          <div className="field grow" style={{ marginBottom: 0 }}>
            <label>Location</label>
            <select className="input" value={branchId} onChange={(e) => setBranchId(e.target.value)}>
              <option value="">— choose a warehouse / branch —</option>
              {branches.map((b) => <option key={b.id} value={b.id}>{b.company_code} · {b.name}{b.is_warehouse ? ' (Warehouse)' : ''}</option>)}
            </select>
          </div>
          <label className="subtle">From <input type="date" className="input" value={from} max={new Date().toISOString().slice(0,10)} onChange={(e) => setFrom(e.target.value)} /></label>
          <label className="subtle">To <input type="date" className="input" value={to} max={new Date().toISOString().slice(0,10)} onChange={(e) => setTo(e.target.value)} /></label>
          {branchId && <input className="input grow" style={{ minWidth: 150 }} placeholder="🔎 Search product, type, location…" value={search} onChange={(e) => setSearch(e.target.value)} />}
          {branchId && <button className="btn btn-ghost" onClick={openPrint}>🖨️ Print</button>}
        </div>
      </div>

      {!branchId ? (
        <p className="subtle">Choose a location to see its stock movements.</p>
      ) : (
        <div className="card card-pad">
          <div className="toolbar-row" style={{ marginBottom: 8 }}>
            <h2 className="grow">{branchName(branchId)}</h2>
            {data && <span className="subtle">In: <b style={{ color: 'var(--green-700)' }}>{data.total_in}</b> · Out: <b style={{ color: 'var(--clay)' }}>{data.total_out}</b></span>}
          </div>
          {loading ? <p className="subtle">Loading…</p> : !data || shown.length === 0 ? <p className="subtle">No movements{search ? ' match your search' : ' for this location in the selected range'}.</p> : (
            <div className="table-wrap">
              <table className="t">
                <thead><tr><th>When</th><th>In/Out</th><th>Product</th><th>Type</th><th>Other location</th><th className="num">Qty</th><th>By</th></tr></thead>
                <tbody>
                  {shown.map((m) => (
                    <tr key={m.id}>
                      <td>{fmt(m.created_at)}</td>
                      <td>{m.direction === 'in'
                        ? <span className="code" style={{ background: '#eaf6ee', color: '#1f7a44' }}>IN</span>
                        : <span className="code" style={{ background: '#fdf0e7', color: '#b9512f' }}>OUT</span>}</td>
                      <td>{m.product_company ? `[${m.product_company}] ` : ''}{m.product_name}</td>
                      <td>{m.movement_type}</td>
                      <td>{m.direction === 'in' ? (m.from_branch || '—') : (m.to_branch || '—')}</td>
                      <td className="num">{m.quantity}</td>
                      <td>{m.done_by || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
