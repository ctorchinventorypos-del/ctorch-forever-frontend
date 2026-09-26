// ============================================================
//  Dashboard — a calm, professional home screen.
//  KPI band (money figures only for permitted users), a low-stock
//  signal, and quick actions filtered to what the user can do.
// ============================================================
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useCompany } from '../context/CompanyContext';
import { usePerms } from '../context/PermissionsContext';
import { api } from '../api/client';
import { naira } from '../utils/format';
import Spinner from '../components/Spinner';

// A single KPI tile.
function Kpi({ label, value, sub, accent, icon, onClick }) {
  return (
    <div className={`kpi${onClick ? ' kpi-click' : ''}`} onClick={onClick} role={onClick ? 'button' : undefined} tabIndex={onClick ? 0 : undefined}
      onKeyDown={onClick ? (e) => { if (e.key === 'Enter') onClick(); } : undefined}>
      <div className="kpi-top">
        <span className="kpi-label">{label}</span>
        <span className="kpi-icon" aria-hidden>{icon}</span>
      </div>
      <div className="kpi-value" style={accent ? { color: accent } : undefined}>{value}</div>
      {sub != null && <div className="kpi-sub">{sub}</div>}
    </div>
  );
}

export default function Dashboard() {
  const { user } = useAuth();
  const { active, activeId } = useCompany();
  const { can } = usePerms();
  const navigate = useNavigate();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!activeId) return;
    setLoading(true);
    api('/reports/dashboard').then(setStats).catch(() => setStats(null)).finally(() => setLoading(false));
  }, [activeId]);

  const money = stats && stats.can_see_money;
  const hour = new Date().getHours();
  const greet = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';

  // Quick actions, each shown only if the user can perform it.
  const actions = [
    { ico: '🧾', t: 'New sale', s: 'Cash, credit or distributor', to: '/sales', show: can('sale.cash') || can('sale.credit') || can('sale.distributor') },
    { ico: '🏭', t: 'Warehouse sale', s: 'Sell across both companies', to: '/warehouse-sale', show: can('sale.warehouse') },
    { ico: '📦', t: 'Inventory', s: 'Products & stock', to: '/inventory', show: can('inventory.view') },
    { ico: '👥', t: 'Customers', s: 'Credit & distributors', to: '/customers', show: can('customer.view') },
    { ico: '🗂️', t: 'Records', s: 'Sales, payments & returns', to: '/records', show: can('records.sales') },
    { ico: '📊', t: 'Reports', s: 'Profit, cash & performance', to: '/reports', show: can('reports.open') },
  ].filter((a) => a.show);

  return (
    <div className="dash">
      <header className="dash-hero">
        <div>
          <h1>{greet}, {user?.full_name?.split(' ')[0] || 'there'} 👋</h1>
          <p className="subtle">Working in <b>{active ? active.name : '…'}</b> · {new Date().toLocaleDateString('en-NG', { weekday: 'long', day: 'numeric', month: 'long' })}</p>
        </div>
        {active && <span className="co-chip">{active.code}</span>}
      </header>

      {loading ? <Spinner full /> : (
        <>
          <section className="kpi-grid" aria-label="Key figures">
            {money && <Kpi icon="💰" label="Sales today" value={stats.revenue_today != null ? naira(stats.revenue_today) : '—'} sub={`${stats.sales_today || 0} sale${stats.sales_today === 1 ? '' : 's'}`} />}
            {money && <Kpi icon="📈" label="Sales this month" value={stats.revenue_month != null ? naira(stats.revenue_month) : '—'} sub={`${stats.sales_month || 0} this month`} />}
            {money && stats.profit_month != null && <Kpi icon="✨" label="Profit this month" value={naira(stats.profit_month)} accent="var(--green-700)" sub={stats.profit_today != null ? `${naira(stats.profit_today)} today` : null} />}
            {money && <Kpi icon="⏳" label="Total owed" value={stats.owed != null ? naira(stats.owed) : '—'} accent="var(--amber)" sub={`${stats.debtors || 0} debtor${stats.debtors === 1 ? '' : 's'}`} onClick={can('debtors.view') ? () => navigate('/debtors') : undefined} />}
            <Kpi icon="📉" label="Low on stock" value={stats ? stats.low_stock : '—'} accent={stats && stats.low_stock ? 'var(--clay)' : 'var(--green-700)'} sub={stats && stats.low_stock ? 'need attention' : 'all healthy'} onClick={can('inventory.view') ? () => navigate('/inventory') : undefined} />
          </section>

          {!money && stats && stats.low_stock > 0 && (
            <div className="banner-error" style={{ background: '#fbeee8', borderColor: '#f0d4c6', color: '#b9512f' }}>
              ⚠️ {stats.low_stock} product{stats.low_stock === 1 ? ' is' : 's are'} low on stock.
            </div>
          )}

          <h2 className="dash-h2">Quick actions</h2>
          <section className="action-grid">
            {actions.map((a) => (
              <button key={a.to} className="action" onClick={() => navigate(a.to)}>
                <span className="big">{a.ico}</span>
                <span className="t"><b>{a.t}</b><small>{a.s}</small></span>
                <span className="action-arrow" aria-hidden>→</span>
              </button>
            ))}
          </section>
        </>
      )}
    </div>
  );
}
