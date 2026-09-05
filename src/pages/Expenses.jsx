// ============================================================
//  Daily expenses: record money-out and review a running list.
//  Visible when the user has expense.view; recording needs
//  expense.record (both set from the Permissions screen).
// ============================================================
import { useEffect, useState } from 'react';
import { api } from '../api/client';
import { naira } from '../utils/format';
import { useAuth } from '../context/AuthContext';
import { usePerms } from '../context/PermissionsContext';
import NumberField from '../components/NumberField';
import Tooltip from '../components/Tooltip';

const METHODS = [
  { key: 'cash', label: 'Cash' },
  { key: 'pos', label: 'POS Card (Moniepoint)' },
  { key: 'transfer_moniepoint', label: 'Transfer - Moniepoint' },
  { key: 'transfer_zenith', label: 'Transfer - Zenith Bank' },
  { key: 'cheque', label: 'Cheque' },
];
const today = () => new Date().toISOString().slice(0, 10);

export default function Expenses() {
  const { isAdmin } = useAuth();
  const { can } = usePerms();
  const [data, setData] = useState({ expenses: [], total: 0 });
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [form, setForm] = useState({ amount: '', category: '', payment_method: 'cash', note: '', created_at: today() });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [search, setSearch] = useState('');

  const load = () => {
    const q = new URLSearchParams();
    if (from) q.set('from', from);
    if (to) q.set('to', to);
    api(`/expenses?${q.toString()}`).then(setData).catch(() => {});
  };
  useEffect(() => { load(); }, [from, to]);

  const set = (k) => (v) => setForm({ ...form, [k]: v?.target ? v.target.value : v });

  const record = async () => {
    setError('');
    if (!Number(form.amount)) return setError('Enter an amount.');
    setBusy(true);
    try {
      await api('/expenses', { method: 'POST', body: { ...form, amount: Number(form.amount) } });
      setForm({ amount: '', category: '', payment_method: 'cash', note: '', created_at: today() });
      load();
    } catch (e) { setError(e.message); }
    finally { setBusy(false); }
  };
  const remove = async (id) => {
    if (!window.confirm('Delete this expense?')) return;
    try { await api(`/expenses/${id}`, { method: 'DELETE' }); load(); } catch (e) { window.alert(e.message); }
  };
  const changeDate = async (id, current) => {
    const val = window.prompt('New date (YYYY-MM-DD):', new Date(current).toISOString().slice(0, 10));
    if (!val) return;
    try { await api(`/expenses/${id}/date`, { method: 'PATCH', body: { date: val } }); load(); } catch (e) { window.alert(e.message); }
  };
  const fmtDate = (d) => new Date(d).toLocaleDateString('en-NG', { day: '2-digit', month: 'short', year: 'numeric' });

  return (
    <div>
      <div className="page-head">
        <h1>Daily expenses</h1>
        <Tooltip text="Record money spent (fuel, transport, supplies, etc.) for this company. Switch companies at the top to see the other one's expenses." />
      </div>

      {can('expense.record') && (
        <div className="card card-pad" style={{ marginBottom: 16 }}>
          <h2 style={{ marginBottom: 12 }}>Record an expense</h2>
          <div className="row2">
            <div className="field">
              <label>Amount</label>
              <NumberField className="input" value={form.amount} onChange={set('amount')} placeholder="0" />
            </div>
            <div className="field">
              <label>What for (category)</label>
              <input className="input" value={form.category} onChange={set('category')} placeholder="e.g. Fuel, Transport, Airtime" />
            </div>
          </div>
          <div className="row2">
            <div className="field">
              <label>Paid with</label>
              <select className="input" value={form.payment_method} onChange={set('payment_method')}>
                {METHODS.map((m) => <option key={m.key} value={m.key}>{m.label}</option>)}
              </select>
            </div>
            <div className="field">
              <label>Date <Tooltip text="Defaults to today; back-date if the expense was on another day." /></label>
              <input type="date" className="input" value={form.created_at} max={today()} onChange={set('created_at')} />
            </div>
          </div>
          <div className="field">
            <label>Note (optional)</label>
            <input className="input" value={form.note} onChange={set('note')} placeholder="Any detail" />
          </div>
          {error && <div className="banner-error" style={{ marginBottom: 10 }}>{error}</div>}
          <button className="btn btn-primary" onClick={record} disabled={busy}>{busy ? 'Saving…' : 'Record expense'}</button>
        </div>
      )}

      <div className="card card-pad">
        <div className="toolbar-row">
          <h2>Expenses</h2>
          <input className="input grow" style={{ minWidth: 150 }} placeholder="🔎 Search category, note, method…" value={search} onChange={(e) => setSearch(e.target.value)} />
          <label className="subtle">From <input type="date" className="input" value={from} max={today()} onChange={(e) => setFrom(e.target.value)} /></label>
          <label className="subtle">To <input type="date" className="input" value={to} max={today()} onChange={(e) => setTo(e.target.value)} /></label>
        </div>
        <p style={{ margin: '4px 0 12px' }}><b>Total: {naira(data.total)}</b>{(from || to) ? ' (filtered)' : ''}</p>
        {(() => { const t = search.trim().toLowerCase(); const shown = (data.expenses||[]).filter((e) => !t || Object.values(e).some((v) => v != null && String(v).toLowerCase().includes(t))); return shown.length === 0 ? <p className="subtle">No expenses{search ? ' match your search' : ' yet'}.</p> : (
          <div className="table-wrap">
            <table className="t">
              <thead><tr><th>Date</th><th>Category</th><th>Method</th><th>Note</th><th>By</th><th className="num">Amount</th>{isAdmin && <th></th>}</tr></thead>
              <tbody>
                {shown.map((e) => (
                  <tr key={e.id}>
                    <td>{fmtDate(e.created_at)}{isAdmin && <button className="linkbtn" title="Change date" style={{ marginLeft: 6 }} onClick={() => changeDate(e.id, e.created_at)}>✎</button>}</td>
                    <td>{e.category || '—'}</td>
                    <td>{e.payment_method}</td>
                    <td>{e.note || '—'}</td>
                    <td>{e.recorded_by || '—'}</td>
                    <td className="num">{naira(e.amount)}</td>
                    {isAdmin && <td className="num"><button className="linkbtn" style={{ color: 'var(--clay)' }} onClick={() => remove(e.id)}>Delete</button></td>}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ); })()}
      </div>
    </div>
  );
}
