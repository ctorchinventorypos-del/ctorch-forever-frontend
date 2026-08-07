// ============================================================
//  AuthContext: keeps track of who is logged in.
//  Provides login(), logout(), the current user, and isAdmin.
// ============================================================
import { createContext, useContext, useState, useEffect } from 'react';
import { api } from '../api/client';

const AuthCtx = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    try { return JSON.parse(localStorage.getItem('user')); } catch { return null; }
  });

  // If a request reports the session expired, drop the user.
  useEffect(() => {
    const onExpired = () => setUser(null);
    window.addEventListener('auth-expired', onExpired);
    return () => window.removeEventListener('auth-expired', onExpired);
  }, []);

  async function login(username, password) {
    const data = await api('/auth/login', {
      method: 'POST',
      body: { username, password },
      company: false,
    });
    localStorage.setItem('token', data.token);
    localStorage.setItem('user', JSON.stringify(data.user));
    setUser(data.user);
    return data.user;
  }

  function logout() {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    localStorage.removeItem('companyId');
    setUser(null);
  }

  const role = user?.role;
  const isSuperAdmin = role === 'super_admin';
  const isAdmin = role === 'admin' || role === 'super_admin'; // admin checks include super admin
  const isWarehouse = role === 'warehouse';
  const isSales = role === 'sales';
  const value = { user, login, logout, role, isAdmin, isSuperAdmin, isWarehouse, isSales };
  return <AuthCtx.Provider value={value}>{children}</AuthCtx.Provider>;
}

export const useAuth = () => useContext(AuthCtx);
