// ============================================================
//  Customers — general (walk-in), credit, and distributors.
//  Each row shows balance + how many purchases they've made, so
//  repeat buyers stand out. Sort by name / purchases / balance,
//  or group by buying frequency.
// ============================================================
import { useEffect, useState, useCallback, useMemo } from 'react';
import { api } from '../api/client';
import { useCompany } from '../context/CompanyContext';
import { naira } from '../utils/format';
import Tooltip from '../components/Tooltip';
import Spinner from '../components/Spinner';
import AddCustomerModal from './customers/AddCustomerModal';
import CustomerDetailModal from './customers/CustomerDetailModal';

// Frequency buckets (used when "Group by activity" is on).
const BUCKETS = [
  { key: 'frequent', label: '🔥 Frequent buyers (10+)', test: (n) => n >= 10 },
  { key: 'regular', label: '⭐ Regular (3–9)', test: (n) => n >= 3 && n <= 9 },
  { key: 'occasional', label: '🚶 Occasional / walk-in (1–2)', test: (n) => n >= 1 && n <= 2 },
  { key: 'none', label: '— No purchases yet', test: (n) => n === 0 },
];

export default function Customers() {
  const { activeId } = useCompany();
  const [tab, setTab] = useState('general');
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState('purchases'); // 'name' | 'purchases' | 'owes'
  const [grouped, setGrouped] = useState(true);
  const [adding, setAdding] = useState(false);
  const [openId, setOpenId] = useState(null);

  const load = useCallback(() => {
    setLoading(true);
    api(`/customers?type=${tab}`).then(setRows).catch(() => {}).finally(() => setLoading(false));
  }, [tab]);
  useEffect(() => { if (activeId) load(); }, [activeId, load]);

  const term = search.trim().toLowerCase();
  const filtered = useMemo(() => {
    let out = rows.filter((r) => !term || r.name.toLowerCase().includes(term) || (r.phone || '').includes(term));
    const n = (r) => Number(r.purchase_count || 0);
    if (sortBy === 'purchases') out = [...out].sort((a, b) => n(b) - n(a) || a.name.localeCompare(b.name));
    else if (sortBy === 'owes') out = [...out].sort((a, b) => Number(b.balance_owed) - Number(a.balance_owed) || a.name.localeCompare(b.name));
    else out = [...out].sort((a, b) => a.name.localeCompare(b.name));
    return out;
  }, [rows, term, sortBy]);

  const label = tab === 'reseller' ? 'distributor' : tab === 'general' ? 'general customer' : 'credit customer';

  const Row = (c) => (
    <tr key={c.id}>
      <td>{c.name}</td>
      <td className="subtle">{c.phone || '—'}</td>
      <td className="num"><span className={`buys${Number(c.purchase_count) ? '' : ' zero'}`}>{c.purchase_count || 0}</span></td>
      <td className="num"><span className={`owed${Number(c.balance_owed) === 0 ? ' zero' : ''}`}>{naira(c.balance_owed)}</span></td>
      <td className="num"><button className="linkbtn" onClick={() => setOpenId(c.id)}>View</button></td>
    </tr>
  );

  const Head = () => (
    <thead><tr>
      <th>Name</th><th>Phone</th>
      <th className="num">Purchases</th>
      <th className="num">Owes</th><th></th>
    </tr></thead>
  );

  // Build grouped buckets (only non-empty ones).
  const groups = useMemo(() => {
    if (!grouped) return null;
    return BUCKETS.map((b) => ({ ...b, items: filtered.filter((c) => b.test(Number(c.purchase_count || 0))) })).filter((g) => g.items.length);
  }, [filtered, grouped]);

  return (
    <div>
      <div className="page-head">
        <h1>Customers</h1>
        <Tooltip text="General customers are walk-in cash buyers. Credit customers buy and pay later. Distributors take goods on credit to resell. The Purchases column shows how many sales are on each account." />
        <div className="spacer" />
        <button title="Add a new customer." className="btn btn-primary" onClick={() => setAdding(true)}>+ Add {label}</button>
      </div>

      <div className="tabs">
        <button className={tab === 'general' ? 'on' : ''} onClick={() => setTab('general')}>General</button>
        <button className={tab === 'credit' ? 'on' : ''} onClick={() => setTab('credit')}>Credit</button>
        <button className={tab === 'reseller' ? 'on' : ''} onClick={() => setTab('reseller')}>Distributors</button>
      </div>

      <div className="toolbar-row">
        <div className="search grow">
          <span className="mag">🔍</span>
          <input className="input" placeholder="Search by name or phone" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <label className="cust-ctl">Sort
          <select className="input" value={sortBy} onChange={(e) => setSortBy(e.target.value)}>
            <option value="purchases">Most purchases</option>
            <option value="name">Name (A–Z)</option>
            <option value="owes">Highest balance</option>
          </select>
        </label>
        <label className="cust-ctl" style={{ userSelect: 'none' }}>
          <input type="checkbox" checked={grouped} onChange={(e) => setGrouped(e.target.checked)} /> Group by activity
        </label>
      </div>

      {loading ? <Spinner full /> : filtered.length === 0 ? (
        <div className="card card-pad">
          <div className="empty">
            <div className="big">👥</div>
            <h2 style={{ marginBottom: 6 }}>No {label}s{term ? ' match your search' : ' yet'}</h2>
            {!term && <><p>Add one to start tracking their purchases and balance.</p>
              <button className="btn btn-primary" style={{ marginTop: 14 }} onClick={() => setAdding(true)}>+ Add {label}</button></>}
          </div>
        </div>
      ) : grouped ? (
        groups.map((g) => (
          <div key={g.key} style={{ marginBottom: 18 }}>
            <div className="cust-group">{g.label} <span className="cust-count">{g.items.length}</span></div>
            <div className="table-wrap">
              <table className="t"><Head />
                <tbody>{g.items.map(Row)}</tbody>
              </table>
            </div>
          </div>
        ))
      ) : (
        <div className="table-wrap">
          <table className="t"><Head />
            <tbody>{filtered.map(Row)}</tbody>
          </table>
        </div>
      )}

      {adding && <AddCustomerModal type={tab} onClose={() => setAdding(false)} onSaved={() => load()} />}
      {openId && <CustomerDetailModal customerId={openId} onClose={() => setOpenId(null)} onChanged={load} />}
    </div>
  );
}
