// ============================================================
//  Debtors ("Who owes me"): everyone with an outstanding balance,
//  grouped by how overdue their oldest unpaid sale is. One tap sends
//  a friendly WhatsApp reminder, or opens a printable statement.
// ============================================================
import { useEffect, useState, useCallback } from 'react';
import { api } from '../api/client';
import { useCompany } from '../context/CompanyContext';
import { naira } from '../utils/format';
import Tooltip from '../components/Tooltip';
import Spinner from '../components/Spinner';

// Turn a Nigerian number into the wa.me international format.
function waNumber(phone) {
  if (!phone) return '';
  let d = String(phone).replace(/\D/g, '');
  if (d.startsWith('234')) return d;
  if (d.startsWith('0')) return '234' + d.slice(1);
  if (d.length === 10) return '234' + d;
  return d;
}

function daysOverdue(oldest) {
  if (!oldest) return 0;
  return Math.max(0, Math.floor((Date.now() - new Date(oldest).getTime()) / 86400000));
}

const BUCKETS = [
  { key: 'b1', label: '0–30 days', test: (d) => d <= 30, color: '#1f7a44', bg: '#e8f5ec' },
  { key: 'b2', label: '31–60 days', test: (d) => d > 30 && d <= 60, color: '#8a6d1f', bg: '#fbf4e2' },
  { key: 'b3', label: '61–90 days', test: (d) => d > 60 && d <= 90, color: '#9a5a1f', bg: '#fbeede' },
  { key: 'b4', label: 'Over 90 days', test: (d) => d > 90, color: '#b9512f', bg: '#fbeee8' },
];

export default function Debtors() {
  const { activeId, active } = useCompany();
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(() => {
    setLoading(true);
    api('/reports/debtors').then(setRows).catch(() => setRows([])).finally(() => setLoading(false));
  }, []);

  useEffect(() => { if (activeId) load(); }, [activeId, load]);

  const fmtDate = (d) => (d ? new Date(d).toLocaleDateString('en-NG', { day: '2-digit', month: 'short', year: 'numeric' }) : '—');

  function remind(c) {
    const num = waNumber(c.phone);
    const company = active ? active.name : 'us';
    const text =
      `Hello ${c.name}, this is a friendly reminder from ${company}. ` +
      `Our records show an outstanding balance of ${naira(c.balance_owed)}. ` +
      `Kindly arrange payment at your earliest convenience. Thank you.`;
    const url = num
      ? `https://wa.me/${num}?text=${encodeURIComponent(text)}`
      : `https://wa.me/?text=${encodeURIComponent(text)}`;
    window.open(url, '_blank');
  }

  const total = rows.reduce((s, r) => s + Number(r.balance_owed), 0);

  // Split into buckets
  const grouped = BUCKETS.map((b) => ({
    ...b,
    items: rows.filter((r) => b.test(daysOverdue(r.oldest_unpaid))),
  }));

  return (
    <div>
      <div className="page-head">
        <h1>Who owes me</h1>
        <Tooltip text="Everyone with an unpaid balance, grouped by how long their oldest unpaid sale has been outstanding. Send a WhatsApp reminder or open a statement." />
        <div className="spacer" />
        {!loading && <div className="subtle" style={{ fontWeight: 700 }}>Total owed: {naira(total)}</div>}
      </div>

      {loading ? (
        <Spinner full />
      ) : rows.length === 0 ? (
        <div className="card card-pad">
          <div className="empty">
            <div className="big">🎉</div>
            <h2 style={{ marginBottom: 6 }}>Nobody owes you</h2>
            <p>Every customer and reseller is fully paid up.</p>
          </div>
        </div>
      ) : (
        grouped.map((b) =>
          b.items.length === 0 ? null : (
            <div className="cat-group" key={b.key}>
              <div className="cat-title">
                <span className="tag" style={{ background: b.bg, color: b.color }}>{b.label}</span>
                <span className="count"> · {b.items.length} · {naira(b.items.reduce((s, r) => s + Number(r.balance_owed), 0))}</span>
              </div>
              <div className="table-wrap">
                <table className="t">
                  <thead>
                    <tr>
                      <th>Customer</th>
                      <th>Type</th>
                      <th>Oldest debt</th>
                      <th className="num">Owes</th>
                      <th></th>
                    </tr>
                  </thead>
                  <tbody>
                    {b.items.map((c) => (
                      <tr key={c.id}>
                        <td>{c.name}{c.phone ? <span className="subtle"> · {c.phone}</span> : null}</td>
                        <td><span className={`tag ${c.customer_type === 'reseller' ? 'tag-wh' : 'tag-store'}`}>{c.customer_type}</span></td>
                        <td className="subtle">{fmtDate(c.oldest_unpaid)} ({daysOverdue(c.oldest_unpaid)}d)</td>
                        <td className="num" style={{ color: 'var(--clay)', fontWeight: 700 }}>{naira(c.balance_owed)}</td>
                        <td className="num" style={{ whiteSpace: 'nowrap' }}>
                          <button className="linkbtn" onClick={() => remind(c)}>💬 Remind</button>
                          {'  '}
                          <button className="linkbtn" onClick={() => window.open(`/statement.html?id=${c.id}`, '_blank')}>📄 Statement</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )
        )
      )}
    </div>
  );
}
