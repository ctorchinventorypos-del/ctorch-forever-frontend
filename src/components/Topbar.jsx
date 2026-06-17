// ============================================================
//  Topbar: the company switcher (CTORCH / FOREVER) and the
//  logged-in user with a logout button.
// ============================================================
import { useAuth } from '../context/AuthContext';
import { useCompany } from '../context/CompanyContext';
import Tooltip from './Tooltip';

export default function Topbar({ onMenu }) {
  const { user, logout } = useAuth();
  const { companies, activeId, setCompany } = useCompany();

  const initials = (user?.full_name || 'U')
    .split(' ')
    .map((w) => w[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();

  return (
    <header className="topbar">
      <button className="btn btn-ghost only-mobile" onClick={onMenu} aria-label="Menu">☰</button>

      <div className="company-switch" role="group" aria-label="Choose company">
        {companies.map((c) => (
          <button
            key={c.id}
            className={String(c.id) === String(activeId) ? 'on' : ''}
            onClick={() => setCompany(c.id)}
          >
            {c.code}
          </button>
        ))}
      </div>
      <Tooltip below text="Switch between your two businesses. Everything you see — stock, sales, customers — belongs to the company shown here." />

      <div className="spacer" />

      <div className="userchip">
        <div className="who">
          <b>{user?.full_name}</b>
          <small>{user?.role}</small>
        </div>
        <div className="avatar">{initials}</div>
        <button className="btn btn-ghost" onClick={logout}>Log out</button>
      </div>
    </header>
  );
}
