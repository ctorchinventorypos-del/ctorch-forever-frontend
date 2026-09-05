// ============================================================
//  Sidebar: the main menu. "Users" only shows for admins.
//  onNavigate closes the slide-in menu after a tap on mobile.
// ============================================================
import { NavLink } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { usePerms } from '../context/PermissionsContext';

const links = [
  { to: '/', label: 'Dashboard', ico: '🏠', end: true },
  { to: '/inventory', label: 'Inventory', ico: '📦', feat: 'inventory.view' },
  { to: '/sales', label: 'Sales', ico: '🧾', hideFor: ['warehouse'] },
  { to: '/warehouse-sale', label: 'Warehouse sale', ico: '🏭', feat: 'sale.warehouse' },
  { to: '/quotations', label: 'Sales orders', ico: '📝', feat: 'quote.create' },
  { to: '/customers', label: 'Customers', ico: '👥', feat: 'customer.view' },
  { to: '/debtors', label: 'Who owes me', ico: '💰', feat: 'debtors.view' },
  { to: '/records', label: 'Records', ico: '🗂️', feat: 'records.sales' },
  { to: '/expenses', label: 'Daily expenses', ico: '🧾', feat: 'expense.view' },
  { to: '/activity', label: 'Activity record', ico: '📋', feat: 'activity.view' },
  { to: '/transfer-records', label: 'Transfer records', ico: '🔁', feat: 'transfers.records' },
  { to: '/stock-as-at', label: 'Stock as at date', ico: '📅', feat: 'stock.asat' },
  { to: '/reports', label: 'Reports', ico: '📊', feat: 'reports.open' },
  { to: '/account', label: 'Account', ico: '💵', adminOnly: true },
  { to: '/branches', label: 'Branches', ico: '🏬', feat: 'branches.manage' },
];

export default function Sidebar({ open, onNavigate }) {
  const { isAdmin, role } = useAuth();
  const { can } = usePerms();
  return (
    <aside className={`sidebar${open ? ' open' : ''}`}>
      <div className="brand">
        <div className="mark">C</div>
        <div className="name">
          CTORCH · FOREVER
          <small>Inventory system</small>
        </div>
      </div>

      {links.filter((l) => (l.feat ? can(l.feat) : ((!l.adminOnly || isAdmin) && !(l.hideFor || []).includes(role)))).map((l) => (
        <NavLink key={l.to} to={l.to} end={l.end} className="nav-link" onClick={onNavigate}>
          <span className="ico">{l.ico}</span>
          {l.label}
        </NavLink>
      ))}

      {isAdmin && (
        <>
          <div className="nav-sep" />
          <NavLink to="/users" className="nav-link" onClick={onNavigate}>
            <span className="ico">🔑</span>
            Users
          </NavLink>
          <NavLink to="/permissions" className="nav-link" onClick={onNavigate}>
            <span className="ico">🎚️</span>
            Permissions
          </NavLink>
        </>
      )}
    </aside>
  );
}
