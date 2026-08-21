// ============================================================
//  Permissions context: loads the current user's effective feature
//  map from /permissions/me and exposes can('feature.key').
//  Admins get everything; while loading, admins are allowed and others
//  are held back so nothing flashes before the map arrives.
// ============================================================
import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { api } from '../api/client';
import { useAuth } from './AuthContext';

const PermCtx = createContext(null);

export function PermissionsProvider({ children }) {
  const { user, isAdmin } = useAuth();
  const [perms, setPerms] = useState(null);
  const [loaded, setLoaded] = useState(false);

  const refresh = useCallback(() => {
    if (!user) { setPerms(null); setLoaded(false); return; }
    api('/permissions/me')
      .then((r) => setPerms(r.permissions || {}))
      .catch(() => setPerms({}))
      .finally(() => setLoaded(true));
  }, [user]);

  useEffect(() => { refresh(); }, [refresh]);

  const can = useCallback((key) => {
    if (isAdmin) return true;            // admins always allowed
    if (!loaded || !perms) return false; // hold non-admins until the map loads
    return perms[key] === true;
  }, [isAdmin, loaded, perms]);

  return <PermCtx.Provider value={{ can, perms, loaded, refresh }}>{children}</PermCtx.Provider>;
}

export function usePerms() {
  const ctx = useContext(PermCtx);
  if (!ctx) return { can: () => false, perms: null, loaded: false, refresh: () => {} };
  return ctx;
}
