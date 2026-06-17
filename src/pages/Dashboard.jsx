// ============================================================
//  Dashboard: a friendly home screen. Shows the active company,
//  a couple of live counts, and big shortcuts to common tasks.
// ============================================================
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useCompany } from '../context/CompanyContext';
import { api } from '../api/client';
import Tooltip from '../components/Tooltip';
import Spinner from '../components/Spinner';

export default function Dashboard() {
  const { user } = useAuth();
  const { active, activeId } = useCompany();
  const navigate = useNavigate();

  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!activeId) return;
    setLoading(true);
    Promise.all([
      api('/products'),
      api('/customers'),
      api('/sales'),
    ])
      .then(([products, customers, sales]) => {
        const owed = customers.reduce((sum, c) => sum + Number(c.balance_owed || 0), 0);
        setStats({
          products: products.length,
          customers: customers.length,
          sales: sales.length,
          owed,
        });
      })
      .catch(() => setStats(null))
      .finally(() => setLoading(false));
  }, [activeId]);

  const naira = (n) => '₦' + Number(n).toLocaleString('en-NG');

  const actions = [
    { ico: '🧾', t: 'New sale', s: 'Record a cash or credit sale', to: '/sales' },
    { ico: '📦', t: 'Add or restock', s: 'Manage products and stock', to: '/inventory' },
    { ico: '👥', t: 'Customers', s: 'Credit customers & resellers', to: '/customers' },
    { ico: '🗂️', t: 'Records', s: 'Sales, payments & returns', to: '/records' },
  ];

  return (
    <div>
      <div className="page-head">
        <div>
          <h1>Hello, {user?.full_name?.split(' ')[0]} 👋</h1>
          <p className="subtle">
            You're working in <b>{active ? active.name : '…'}</b>. Switch companies any time using the buttons at the top.
          </p>
        </div>
      </div>

      {loading ? (
        <Spinner full />
      ) : (
        <>
          <div className="grid grid-3" style={{ marginBottom: 18 }}>
            <div className="card stat">
              <div className="label">Products <Tooltip text="How many different products exist in this company's inventory." /></div>
              <div className="value">{stats ? stats.products : '—'}</div>
            </div>
            <div className="card stat">
              <div className="label">Customers <Tooltip text="Credit customers and bulk resellers combined." /></div>
              <div className="value">{stats ? stats.customers : '—'}</div>
            </div>
            <div className="card stat">
              <div className="label">Total owed <Tooltip text="Money all customers and resellers currently owe this company." /></div>
              <div className="value" style={{ color: 'var(--amber)' }}>{stats ? naira(stats.owed) : '—'}</div>
            </div>
          </div>

          <h2 style={{ margin: '6px 0 12px' }}>Quick actions</h2>
          <div className="grid grid-2">
            {actions.map((a) => (
              <button key={a.to} className="action" onClick={() => navigate(a.to)}>
                <span className="big">{a.ico}</span>
                <span className="t"><b>{a.t}</b><small>{a.s}</small></span>
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
