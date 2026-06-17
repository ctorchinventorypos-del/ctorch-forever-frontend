// ============================================================
//  CompanyContext: which company are we working in right now?
//  Loads the list from the backend and remembers the choice.
// ============================================================
import { createContext, useContext, useState, useEffect } from 'react';
import { api } from '../api/client';
import { useAuth } from './AuthContext';

const CompanyCtx = createContext(null);

export function CompanyProvider({ children }) {
  const { user } = useAuth();
  const [companies, setCompanies] = useState([]);
  const [activeId, setActiveId] = useState(() => localStorage.getItem('companyId') || '');

  useEffect(() => {
    if (!user) { setCompanies([]); return; }
    api('/companies', { company: false })
      .then((list) => {
        setCompanies(list);
        let id = localStorage.getItem('companyId');
        const valid = list.find((c) => String(c.id) === String(id));
        if (!valid && list.length) {
          id = String(list[0].id);
          localStorage.setItem('companyId', id);
          setActiveId(id);
        }
      })
      .catch(() => {});
  }, [user]);

  function setCompany(id) {
    localStorage.setItem('companyId', String(id));
    setActiveId(String(id));
  }

  const active = companies.find((c) => String(c.id) === String(activeId)) || null;

  return (
    <CompanyCtx.Provider value={{ companies, active, activeId, setCompany }}>
      {children}
    </CompanyCtx.Provider>
  );
}

export const useCompany = () => useContext(CompanyCtx);
