// ============================================================
//  Stock as at a date: what each product's quantity WAS at a
//  branch on a chosen past date (reconstructed from movement
//  history). Searchable and printable per branch.
// ============================================================
import { useEffect, useState, Fragment } from 'react';
import { api } from '../api/client';
import Tooltip from '../components/Tooltip';

export default function StockAsAt() {
  const [branches, setBranches] = useState([]);
  const [branchId, setBranchId] = useState('');
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');

  useEffect(() => { api('/branches/all').then(setBranches).catch(() => {}); }, []);
  useEffect(() => {
    if (!branchId || !date) { setData(null); return; }
    setLoading(true);
    api(`/reports/stock-as-at?branch_id=${branchId}&date=${date}`)
      .then(setData).catch(() => setData(null)).finally(() => setLoading(false));
  }, [branchId, date]);

  const shown = (data?.products || []).filter((p) => {
    const t = search.trim().toLowerCase();
    return !t || p.name.toLowerCase().includes(t) || (p.product_code || '').toLowerCase().includes(t) || (p.category_name || '').toLowerCase().includes(t);
  });

  // group by category
  const groups = {};
  shown.forEach((p) => { (groups[p.category_name] = groups[p.category_name] || []).push(p); });

  const openPrint = () => window.open(`/stock-asat-print.html?branch_id=${branchId}&date=${date}`, '_blank');
  const fmtDate = (d) => new Date(d + 'T12:00:00').toLocaleDateString('en-NG', { day: '2-digit', month: 'long', year: 'numeric' });

  return (
    <div>
      <div className="page-head">
        <h1>Stock as at a date</h1>
        <Tooltip text="See what each product's quantity WAS at a location on any past date — reconstructed from the full movement history." />
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
          <label className="subtle">As at <input type="date" className="input" value={date} max={new Date().toISOString().slice(0,10)} onChange={(e) => setDate(e.target.value)} /></label>
          {data && <button className="btn btn-ghost" onClick={openPrint}>🖨️ Print</button>}
        </div>
      </div>

      {!branchId ? (
        <p className="subtle">Choose a location and a date to see its stock as at that day.</p>
      ) : (
        <div className="card card-pad">
          <div className="toolbar-row" style={{ marginBottom: 8 }}>
            <h2 className="grow">{data ? `${data.branch.company_code} · ${data.branch.name}` : ''} <span className="subtle" style={{ fontWeight: 400 }}>as at {fmtDate(date)}</span></h2>
            {data && <span className="subtle">Total units: <b>{shown.reduce((s, p) => s + p.quantity, 0).toLocaleString()}</b></span>}
          </div>
          <input className="input" style={{ marginBottom: 12 }} placeholder="🔎 Search product / code / category…" value={search} onChange={(e) => setSearch(e.target.value)} />
          {loading ? <p className="subtle">Reconstructing…</p> : !data || shown.length === 0 ? (
            <p className="subtle">No stock recorded at this location on that date{search ? ' matching your search' : ''}.</p>
          ) : (
            <div className="table-wrap">
              <table className="t">
                <thead><tr><th>Product</th><th>Code</th><th className="num">Qty as at {date}</th></tr></thead>
                <tbody>
                  {Object.keys(groups).sort().map((cat) => (
                    <Fragment key={cat}>
                      <tr><td colSpan="3" style={{ background: '#eef6f0', fontWeight: 700, color: '#1f7a44' }}>{cat}</td></tr>
                      {groups[cat].map((p) => (
                        <tr key={p.id}>
                          <td>{p.owner_code && data && p.owner_code !== data.branch.company_code ? `[${p.owner_code}] ` : ''}{p.name}</td>
                          <td>{p.product_code}</td>
                          <td className="num">{p.quantity}</td>
                        </tr>
                      ))}
                    </Fragment>
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
