// ============================================================
//  Layout: the frame every signed-in page sits inside.
//  On mobile the sidebar slides in, with a tap-to-close overlay.
// ============================================================
import { useState } from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import Topbar from './Topbar';

export default function Layout() {
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
