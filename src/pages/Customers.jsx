// ============================================================
//  Customers: two tabs — credit customers and bulk resellers.
//  Each row shows the balance owed; click to open their page.
// ============================================================
import { useEffect, useState, useCallback } from 'react';
import { api } from '../api/client';
import { useCompany } from '../context/CompanyContext';
import { naira } from '../utils/format';
import Tooltip from '../components/Tooltip';
import Spinner from '../components/Spinner';
import AddCustomerModal from './customers/AddCustomerModal';
import CustomerDetailModal from './customers/CustomerDetailModal';

export default function Customers() {
  const { activeId } = useCompany();
  const [tab, setTab] = useState('credit'); // 'credit' | 'reseller'
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [adding, setAdding] = useState(false);
  const [openId, setOpenId] = useState(null);

  const load = useCallback(() => {
    setLoading(true);
    api(`/customers?type=${tab}`)
      .then(setRows)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [tab]);

  useEffect(() => { if (activeId) load(); }, [activeId, load]);

  const term = search.trim().toLowerCase();
  const filtered = rows.filter(
    (r) => !term || r.name.toLowerCase().includes(term) || (r.phone || '').includes(term)
  );

  const label = tab === 'reseller' ? 'bulk reseller' : 'credit customer';

  return (
    <div>
      <div className="page-head">
        <h1>Customers</h1>
        <Tooltip text="Credit customers buy and pay later. Bulk resellers take goods on credit to resell. Each one's balance is what they still owe." />
        <div className="spacer" />
        <button className="btn btn-primary" onClick={() => setAdding(true)}>+ Add {label}</button>
      </div>

      <div className="tabs">
        <button className={tab === 'credit' ? 'on' : ''} onClick={() => setTab('credit')}>Credit customers</button>
        <button className={tab === 'reseller' ? 'on' : ''} onClick={() => setTab('reseller')}>Bulk resellers</button>
      </div>

      <div className="toolbar-row">
        <div className="search">
          <span className="mag">🔍</span>
          <input className="input" placeholder="Search by name or phone"
            value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
      </div>

      {loading ? (
        <Spinner full />
      ) : filtered.length === 0 ? (
        <div className="card card-pad">
          <div className="empty">
            <div className="big">👥</div>
            <h2 style={{ marginBottom: 6 }}>No {label}s yet</h2>
            <p>Add one to start tracking what they owe.</p>
            <button className="btn btn-primary" style={{ marginTop: 14 }} onClick={() => setAdding(true)}>
              + Add {label}
            </button>
          </div>
        </div>
      ) : (
        <div className="table-wrap">
          <table className="t">
            <thead>
              <tr>
                <th>Name</th>
                <th>Phone</th>
                <th className="num">Owes</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((c) => (
                <tr key={c.id}>
                  <td>{c.name}</td>
                  <td className="subtle">{c.phone || '—'}</td>
                  <td className="num">
                    <span className={`owed${Number(c.balance_owed) === 0 ? ' zero' : ''}`}>
                      {naira(c.balance_owed)}
                    </span>
                  </td>
                  <td className="num">
                    <button className="linkbtn" onClick={() => setOpenId(c.id)}>View</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {adding && (
        <AddCustomerModal type={tab} onClose={() => setAdding(false)} onSaved={() => load()} />
      )}
      {openId && (
        <CustomerDetailModal customerId={openId} onClose={() => setOpenId(null)} onChanged={load} />
      )}
    </div>
  );
}
