// ============================================================
//  Layout: the frame every signed-in page sits inside.
//  On mobile the sidebar slides in, with a tap-to-close overlay.
// ============================================================
import { useState, useEffect, useRef } from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import Topbar from './Topbar';
import { useAuth } from '../context/AuthContext';

// Auto sign-out after this many minutes with no activity.
const IDLE_MINUTES = 30;

export default function Layout() {
  const { logout, user } = useAuth();
  const timer = useRef(null);

  useEffect(() => {
    // Super admin can remove the sign-in timeout for an account.
    if (user && user.no_idle_timeout) return undefined;
    const reset = () => {
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(() => {
        logout();
        try { sessionStorage.setItem('loggedOutReason', 'idle'); } catch (_) {}
        window.location.href = '/';
      }, IDLE_MINUTES * 60 * 1000);
    };
    const events = ['mousemove', 'mousedown', 'keydown', 'touchstart', 'scroll', 'click'];
    events.forEach((e) => window.addEventListener(e, reset, { passive: true }));
    reset();
    return () => {
      events.forEach((e) => window.removeEventListener(e, reset));
      if (timer.current) clearTimeout(timer.current);
    };
  }, [logout, user]);
  const [menuOpen, setMenuOpen] = useState(false);
  const close = () => setMenuOpen(false);

  return (
    <div className="app">
      <Sidebar open={menuOpen} onNavigate={close} />
      {menuOpen && <div className="overlay" onClick={close} />}
      <div className="main">
        <Topbar onMenu={() => setMenuOpen((v) => !v)} />
        <div className="content">
          <Outlet />
        </div>
      </div>
    </div>
  );
}
