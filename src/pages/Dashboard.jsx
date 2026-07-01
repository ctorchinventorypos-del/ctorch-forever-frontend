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
  const { user, isAdmin } = useAuth();
  const { active, activeId } = useCompany();
  const navigate = useNavigate();

  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!activeId) return;
    setLoading(true);
    api('/reports/dashboard')
      .then(setStats)
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
          {isAdmin && (
          <div className="grid grid-3" style={{ marginBottom: 18 }}>
            <div className="card stat">
              <div className="label">Sales today <Tooltip text="Total value of sales recorded today, and how many." /></div>
              <div className="value">{stats ? naira(stats.revenue_today) : '—'}</div>
              {stats && <small className="subtle">{stats.sales_today} sale{stats.sales_today === 1 ? '' : 's'}</small>}
            </div>
            <div className="card stat">
              <div className="label">Sales this month <Tooltip text="Total value of sales so far this calendar month." /></div>
              <div className="value">{stats ? naira(stats.revenue_month) : '—'}</div>
              {stats && <small className="subtle">{stats.sales_month} sale{stats.sales_month === 1 ? '' : 's'}</small>}
            </div>
            <div className="card stat">
              <div className="label">Total owed <Tooltip text="Money all customers and resellers currently owe this company." /></div>
              <div className="value" style={{ color: 'var(--amber)' }}>{stats ? naira(stats.owed) : '—'}</div>
              {stats && <small className="subtle">{stats.debtors} debtor{stats.debtors === 1 ? '' : 's'}</small>}
            </div>
          </div>
          )}

          {isAdmin && (
            <div className="grid grid-3" style={{ marginBottom: 18 }}>
              <div className="card stat">
                <div className="label">Profit today <Tooltip text="Selling price minus cost on today's sales. Admins only." /></div>
                <div className="value" style={{ color: 'var(--green-700)' }}>{stats && stats.profit_today != null ? naira(stats.profit_today) : '—'}</div>
              </div>
              <div className="card stat">
                <div className="label">Profit this month <Tooltip text="Selling price minus cost on this month's sales. Admins only." /></div>
                <div className="value" style={{ color: 'var(--green-700)' }}>{stats && stats.profit_month != null ? naira(stats.profit_month) : '—'}</div>
              </div>
              <button className="card stat" style={{ textAlign: 'left', cursor: 'pointer', border: 'none' }} onClick={() => navigate('/reports')}>
                <div className="label">Low on stock <Tooltip text="Products at or below their low-stock level. Tap to open the inventory report." /></div>
                <div className="value" style={{ color: stats && stats.low_stock ? 'var(--clay)' : 'inherit' }}>{stats ? stats.low_stock : '—'}</div>
              </button>
            </div>
          )}
          {!isAdmin && stats && stats.low_stock > 0 && (
            <div className="banner-error" style={{ background: '#fbeee8', borderColor: '#f0d4c6', color: '#b9512f', marginBottom: 18 }}>
              ⚠️ {stats.low_stock} product{stats.low_stock === 1 ? ' is' : 's are'} low on stock.
            </div>
          )}

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
