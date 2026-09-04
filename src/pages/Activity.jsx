// ============================================================
//  Activity record: every transaction for the active company in a
//  chosen window — day / week / month / year. Sales (all types),
//  payments, returns, restocks, transfers, expenses.
// ============================================================
import { useEffect, useMemo, useState } from 'react';
import { api } from '../api/client';
import { naira } from '../utils/format';
import Tooltip from '../components/Tooltip';

// Compute a from/to range for a period anchored on a date.
function rangeFor(period, anchor) {
  const d = new Date(anchor + 'T12:00:00');
  const iso = (x) => x.toISOString().slice(0, 10);
  if (period === 'day') return { from: iso(d), to: iso(d) };
  if (period === 'week') {
    const day = (d.getDay() + 6) % 7; // Monday-start
    const start = new Date(d); start.setDate(d.getDate() - day);
    const end = new Date(start); end.setDate(start.getDate() + 6);
    return { from: iso(start), to: iso(end) };
  }
  if (period === 'month') {
    const start = new Date(d.getFullYear(), d.getMonth(), 1);
    const end = new Date(d.getFullYear(), d.getMonth() + 1, 0);
    return { from: iso(start), to: iso(end) };
  }
  const start = new Date(d.getFullYear(), 0, 1);
  const end = new Date(d.getFullYear(), 11, 31);
  return { from: iso(start), to: iso(end) };
}

const PERIODS = [['day', 'Day'], ['week', 'Week'], ['month', 'Month'], ['year', 'Year']];

export default function Activity() {
  const [period, setPeriod] = useState('day');
  const [anchor, setAnchor] = useState(() => new Date().toISOString().slice(0, 10));
  const [data, setData] = useState({ items: [], summary: {} });
  const [loading, setLoading] = useState(false);

  const range = useMemo(() => rangeFor(period, anchor), [period, anchor]);

  useEffect(() => {
    setLoading(true);
    api(`/reports/activity?from=${range.from}&to=${range.to}`)
      .then(setData).catch(() => setData({ items: [], summary: {} }))
      .finally(() => setLoading(false));
  }, [range.from, range.to]);

  const fmt = (d) => new Date(d).toLocaleString('en-NG', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
  const openPrint = () => window.open(`/activity-print.html?from=${range.from}&to=${range.to}`, '_blank');

  return (
    <div>
      <div className="page-head">
        <h1>Activity record</h1>
        <Tooltip text="Every transaction for this company — sales, payments, returns, restocks, transfers and expenses — for the day, week, month or year you pick." />
      </div>

      <div className="card card-pad" style={{ marginBottom: 16 }}>
        <div className="toolbar-row">
          <div className="seg">
            {PERIODS.map(([k, l]) => <button key={k} className={period === k ? 'on' : ''} onClick={() => setPeriod(k)}>{l}</button>)}
          </div>
          <label className="subtle">Date <input type="date" className="input" value={anchor} max={new Date().toISOString().slice(0, 10)} onChange={(e) => setAnchor(e.target.value)} /></label>
          <span className="grow" />
          <button className="btn btn-ghost" onClick={openPrint}>🖨️ Print</button>
        </div>
        <p className="subtle" style={{ margin: '6px 0 0' }}>{range.from} → {range.to}</p>
      </div>

      {/* Summary tiles */}
      {Object.keys(data.summary).length > 0 && (
        <div className="grid grid-3" style={{ marginBottom: 16 }}>
          {Object.entries(data.summary).map(([kind, s]) => (
            <div className="card stat" key={kind}>
              <div className="label">{kind} ({s.count})</div>
              <div className="value" style={{ fontSize: 22 }}>{s.total ? naira(s.total) : '—'}</div>
            </div>
          ))}
        </div>
      )}

      <div className="card card-pad">
        <h2 style={{ marginBottom: 10 }}>{loading ? 'Loading…' : `${data.items.length} activities`}</h2>
        {data.items.length === 0 && !loading ? <p className="subtle">No activity in this period.</p> : (
          <div className="table-wrap">
            <table className="t">
              <thead><tr><th>When</th><th>Activity</th><th>Ref / detail</th><th>Who</th><th>By</th><th className="num">Amount</th></tr></thead>
              <tbody>
                {data.items.map((i, idx) => (
                  <tr key={idx}>
                    <td>{fmt(i.created_at)}</td>
                    <td><span className="code">{i.kind}</span></td>
                    <td>{i.ref}{i.qty != null ? ` · ${i.qty} pcs` : ''}</td>
                    <td>{i.who || '—'}</td>
                    <td>{i.by_user || '—'}</td>
                    <td className="num" style={{ color: i.amount < 0 ? 'var(--clay)' : undefined }}>
                      {i.amount == null ? '—' : naira(i.amount)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
