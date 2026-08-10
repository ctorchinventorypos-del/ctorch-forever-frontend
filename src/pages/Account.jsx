// ============================================================
//  Account: money received per payment method, over time.
//  Switch between Daily / Weekly / Monthly / Yearly. Admin only.
// ============================================================
import { useEffect, useState, useCallback } from 'react';
import { api } from '../api/client';
import { useCompany } from '../context/CompanyContext';
import { naira } from '../utils/format';
import Spinner from '../components/Spinner';

const GROUPS = [
  { key: 'day', label: 'Daily' },
  { key: 'week', label: 'Weekly' },
  { key: 'month', label: 'Monthly' },
  { key: 'year', label: 'Yearly' },
];

const METHOD_LABELS = {
  cash: 'Cash',
  pos: 'POS Card (Moniepoint)',
  transfer_moniepoint: 'Transfer - Moniepoint',
  transfer_zenith: 'Transfer - Zenith Bank',
  cheque: 'Cheque',
  transfer: 'Transfer (old)',
};

export default function Account() {
  const { activeId } = useCompany();
  const [group, setGroup] = useState('day');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);

  const load = useCallback(() => {
    setLoading(true);
    const p = [`group=${group}`];
    if (from) p.push(`from=${from}`);
    if (to) p.push(`to=${to}`);
    api(`/reports/account?${p.join('&')}`).then(setData).catch(() => setData(null)).finally(() => setLoading(false));
  }, [group, from, to]);

  useEffect(() => { if (activeId) load(); }, [activeId, load]);

  // Order the method columns nicely: known ones first, then any extras.
  const known = ['cash', 'pos', 'transfer_moniepoint', 'transfer_zenith', 'cheque'];
  const methods = data ? [...known.filter((m) => data.methods.includes(m)), ...data.methods.filter((m) => !known.includes(m))] : [];

  const fmtBucket = (iso) => {
    const d = new Date(iso);
    if (group === 'year') return String(d.getFullYear());
    if (group === 'month') return d.toLocaleDateString('en-NG', { month: 'long', year: 'numeric' });
    if (group === 'week') return 'Week of ' + d.toLocaleDateString('en-NG', { day: '2-digit', month: 'short', year: 'numeric' });
    return d.toLocaleDateString('en-NG', { weekday: 'short', day: '2-digit', month: 'short', year: 'numeric' });
  };

  // Column totals across all buckets.
  const colTotal = (m) => (data ? data.buckets.reduce((s, b) => s + (b.methods[m] || 0), 0) : 0);
  const grandTotal = data ? data.buckets.reduce((s, b) => s + b.total, 0) : 0;

  return (
    <div>
      <div className="page-head"><h1>Account</h1></div>

      <div className="tabs">
        {GROUPS.map((g) => (
          <button key={g.key} className={group === g.key ? 'on' : ''} onClick={() => setGroup(g.key)}>{g.label}</button>
        ))}
      </div>

      <div className="toolbar-row" style={{ gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
        <span className="subtle">From</span>
        <input className="input" style={{ maxWidth: 175 }} type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
        <span className="subtle">To</span>
        <input className="input" style={{ maxWidth: 175 }} type="date" value={to} onChange={(e) => setTo(e.target.value)} />
        {(from || to) && <button className="linkbtn" onClick={() => { setFrom(''); setTo(''); }}>Clear</button>}
      </div>

      {loading ? <Spinner full /> : !data || data.buckets.length === 0 ? (
        <div className="card card-pad"><p className="subtle">No money recorded for this period.</p></div>
      ) : (
        <div className="table-wrap">
          <table className="t">
            <thead>
              <tr>
                <th>{GROUPS.find((g) => g.key === group).label.replace('ly', '')}</th>
                {methods.map((m) => <th key={m} className="num">{METHOD_LABELS[m] || m}</th>)}
                <th className="num">Total</th>
              </tr>
            </thead>
            <tbody>
              {data.buckets.map((b) => (
                <tr key={b.bucket}>
                  <td>{fmtBucket(b.bucket)}</td>
                  {methods.map((m) => <td key={m} className="num">{b.methods[m] ? naira(b.methods[m]) : '—'}</td>)}
                  <td className="num" style={{ fontWeight: 700 }}>{naira(b.total)}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr>
                <td style={{ fontWeight: 700 }}>All-period total</td>
                {methods.map((m) => <td key={m} className="num" style={{ fontWeight: 700 }}>{naira(colTotal(m))}</td>)}
                <td className="num" style={{ fontWeight: 800 }}>{naira(grandTotal)}</td>
              </tr>
            </tfoot>
          </table>
        </div>
      )}
    </div>
  );
}
