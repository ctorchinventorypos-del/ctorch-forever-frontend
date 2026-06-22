// ============================================================
//  Sidebar: the main menu. "Users" only shows for admins.
//  onNavigate closes the slide-in menu after a tap on mobile.
// ============================================================
import { NavLink } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const links = [
  { to: '/', label: 'Dashboard', ico: '🏠', end: true },
  { to: '/inventory', label: 'Inventory', ico: '📦' },
  { to: '/sales', label: 'Sales', ico: '🧾' },
  { to: '/quotations', label: 'Quotations', ico: '📝' },
  { to: '/customers', label: 'Customers', ico: '👥' },
  { to: '/debtors', label: 'Who owes me', ico: '💰' },
  { to: '/records', label: 'Records', ico: '🗂️' },
  { to: '/reports', label: 'Reports', ico: '📊' },
  { to: '/branches', label: 'Branches', ico: '🏬' },
];

export default function Sidebar({ open, onNavigate }) {
  const { isAdmin } = useAuth();
  return (
    <aside className={`sidebar${open ? ' open' : ''}`}>
      <div className="brand">
        <div className="mark">C</div>
        <div className="name">
          CTORCH · FOREVER
          <small>Inventory system</small>
        </div>
      </div>

      {links.map((l) => (
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
        </>
      )}
    </aside>
  );
}
