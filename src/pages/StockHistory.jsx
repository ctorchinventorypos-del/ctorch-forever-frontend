// ============================================================
//  Stock history: a line graph of one product's stock level over
//  time (per branch or across all branches), with every restock,
//  sale, transfer and adjustment plotted so you can see the swings.
//  Chart is hand-drawn SVG — no external library needed.
// ============================================================
import { useEffect, useMemo, useState } from 'react';
import { api } from '../api/client';
import Tooltip from '../components/Tooltip';
import SearchableSelect from '../components/SearchableSelect';

const TYPE_COLOR = { restock: '#1f7a44', sale: '#b9512f', transfer: '#2f6fb9', adjustment: '#a5852f', start: '#888' };

function LineChart({ points }) {
  const W = 900, H = 320, padL = 48, padR = 16, padT = 16, padB = 40;
  const { path, dots, ymin, ymax, xs } = useMemo(() => {
    if (!points.length) return { path: '', dots: [], ymin: 0, ymax: 1, xs: [] };
    const levels = points.map((p) => p.level);
    let lo = Math.min(0, ...levels), hi = Math.max(...levels, 1);
    if (hi === lo) hi = lo + 1;
    const t0 = new Date(points[0].date).getTime();
    const t1 = new Date(points[points.length - 1].date).getTime();
    const span = t1 - t0 || 1;
    const x = (d) => padL + ((new Date(d).getTime() - t0) / span) * (W - padL - padR);
    const y = (v) => padT + (1 - (v - lo) / (hi - lo)) * (H - padT - padB);
    const path = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${x(p.date).toFixed(1)} ${y(p.level).toFixed(1)}`).join(' ');
    const dots = points.map((p) => ({ cx: x(p.date), cy: y(p.level), c: TYPE_COLOR[p.type] || '#888', p }));
    return { path, dots, ymin: lo, ymax: hi, xs: [points[0].date, points[points.length - 1].date] };
  }, [points]);

  if (!points.length) return null;
  const yTicks = 4;
  return (
    <div style={{ overflowX: 'auto' }}>
      <svg viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', minWidth: 640, height: 'auto' }}>
        {/* y grid + labels */}
        {Array.from({ length: yTicks + 1 }).map((_, i) => {
          const v = ymin + ((ymax - ymin) * i) / yTicks;
          const yy = padT + (1 - i / yTicks) * (H - padT - padB);
          return (
            <g key={i}>
              <line x1={padL} y1={yy} x2={W - 16} y2={yy} stroke="#eee" />
              <text x={padL - 6} y={yy + 4} textAnchor="end" fontSize="11" fill="#888">{Math.round(v).toLocaleString()}</text>
            </g>
          );
        })}
        <path d={path} fill="none" stroke="#1f7a44" strokeWidth="2" />
        {dots.map((d, i) => <circle key={i} cx={d.cx} cy={d.cy} r="3.5" fill={d.c}><title>{`${d.p.type}${d.p.delta ? ` ${d.p.delta > 0 ? '+' : ''}${d.p.delta}` : ''} → ${d.p.level} on ${new Date(d.p.date).toLocaleDateString('en-NG')}`}</title></circle>)}
        {xs[0] && <text x={padL} y={H - 12} fontSize="11" fill="#888">{new Date(xs[0]).toLocaleDateString('en-NG', { day: '2-digit', month: 'short', year: '2-digit' })}</text>}
        {xs[1] && <text x={W - 16} y={H - 12} textAnchor="end" fontSize="11" fill="#888">{new Date(xs[1]).toLocaleDateString('en-NG', { day: '2-digit', month: 'short', year: '2-digit' })}</text>}
      </svg>
    </div>
  );
}

export default function StockHistory() {
  const [products, setProducts] = useState([]);
  const [branches, setBranches] = useState([]);
  const [productId, setProductId] = useState('');
  const [branchId, setBranchId] = useState('');
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => { api('/products').then(setProducts).catch(() => {}); api('/branches/all').then(setBranches).catch(() => {}); }, []);
  useEffect(() => {
    if (!productId) { setData(null); return; }
    const q = new URLSearchParams({ product_id: productId });
    if (branchId) q.set('branch_id', branchId);
    setLoading(true);
    api(`/reports/stock-history?${q.toString()}`).then(setData).catch(() => setData(null)).finally(() => setLoading(false));
  }, [productId, branchId]);

  const events = data ? data.points.filter((p) => p.type !== 'start').slice().reverse() : [];
  const fmt = (d) => new Date(d).toLocaleString('en-NG', { day: '2-digit', month: 'short', year: '2-digit', hour: '2-digit', minute: '2-digit' });

  return (
    <div>
      <div className="page-head">
        <h1>Stock history</h1>
        <Tooltip text="Watch a product's stock rise and fall over time — every restock, sale, transfer and adjustment plotted on a graph." />
      </div>

      <div className="card card-pad" style={{ marginBottom: 16 }}>
        <div className="row2">
          <div className="field">
            <label>Product</label>
            <SearchableSelect value={productId} onChange={setProductId} placeholder="— choose a product —"
              options={products.map((p) => ({ value: p.id, label: `${p.name} (${p.product_code})` }))} />
          </div>
          <div className="field">
            <label>Location <Tooltip text="Leave blank to see the product's total stock across all locations." /></label>
            <select className="input" value={branchId} onChange={(e) => setBranchId(e.target.value)}>
              <option value="">All locations (total)</option>
              {branches.map((b) => <option key={b.id} value={b.id}>{b.company_code} · {b.name}{b.is_warehouse ? ' (Warehouse)' : ''}</option>)}
            </select>
          </div>
        </div>
      </div>

      {!productId ? <p className="subtle">Choose a product to see its stock graph.</p> : loading ? <p className="subtle">Loading…</p> : !data ? null : (
        <>
          <div className="card card-pad" style={{ marginBottom: 16 }}>
            <div className="toolbar-row" style={{ marginBottom: 8 }}>
              <h2 className="grow">{data.product.name} <span className="subtle" style={{ fontWeight: 400 }}>· now: {data.current} {data.product.unit}</span></h2>
            </div>
            <LineChart points={data.points} />
            <div className="subtle" style={{ marginTop: 8, display: 'flex', gap: 14, flexWrap: 'wrap' }}>
              <span style={{ color: TYPE_COLOR.restock }}>● Restock</span>
              <span style={{ color: TYPE_COLOR.sale }}>● Sale</span>
              <span style={{ color: TYPE_COLOR.transfer }}>● Transfer</span>
              <span style={{ color: TYPE_COLOR.adjustment }}>● Adjustment</span>
            </div>
          </div>

          <div className="card card-pad">
            <h2 style={{ marginBottom: 10 }}>Movements ({events.length})</h2>
            {events.length === 0 ? <p className="subtle">No movements recorded.</p> : (
              <div className="table-wrap">
                <table className="t">
                  <thead><tr><th>When</th><th>Type</th><th className="num">Change</th><th className="num">Level after</th><th>Detail</th><th>By</th></tr></thead>
                  <tbody>
                    {events.map((e, i) => (
                      <tr key={i}>
                        <td>{fmt(e.date)}</td>
                        <td><span className="code" style={{ color: TYPE_COLOR[e.type] || '#333' }}>{e.type}</span></td>
                        <td className="num" style={{ color: e.delta < 0 ? 'var(--clay)' : 'var(--green-700)' }}>{e.delta > 0 ? '+' : ''}{e.delta}</td>
                        <td className="num">{e.level}</td>
                        <td>{e.other || '—'}</td>
                        <td>{e.by_user || '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
