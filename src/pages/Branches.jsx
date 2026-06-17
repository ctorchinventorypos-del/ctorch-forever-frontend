// ============================================================
//  Branches: the warehouses and stores for the active company.
//  Admins can add and edit; everyone can view.
// ============================================================
import { useEffect, useState, useCallback } from 'react';
import { api } from '../api/client';
import { useCompany } from '../context/CompanyContext';
import { useAuth } from '../context/AuthContext';
import Tooltip from '../components/Tooltip';
import Spinner from '../components/Spinner';
import BranchModal from './branches/BranchModal';

export default function Branches() {
  const { activeId } = useCompany();
  const { isAdmin } = useAuth();
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(null); // branch object or 'new'

  const load = useCallback(() => {
    setLoading(true);
    api('/branches').then(setRows).catch(() => {}).finally(() => setLoading(false));
  }, []);

  useEffect(() => { if (activeId) load(); }, [activeId, load]);

  return (
    <div>
      <div className="page-head">
        <h1>Branches</h1>
        <Tooltip text="Your stores and warehouses. Stock lives at each one. A warehouse is where you keep bulk stock to transfer to stores." />
        <div className="spacer" />
        {isAdmin && <button className="btn btn-primary" onClick={() => setEditing('new')}>+ Add branch</button>}
      </div>

      {loading ? (
        <Spinner full />
      ) : (
        <div className="table-wrap">
          <table className="t">
            <thead>
              <tr><th>Name</th><th>Type</th><th>Address</th><th>Phone</th>{isAdmin && <th></th>}</tr>
            </thead>
            <tbody>
              {rows.map((b) => (
                <tr key={b.id}>
                  <td>{b.name}</td>
                  <td>
                    <span className={`tag ${b.is_warehouse ? 'tag-wh' : 'tag-store'}`}>
                      {b.is_warehouse ? 'Warehouse' : 'Store'}
                    </span>
                  </td>
                  <td className="subtle">{b.address || '—'}</td>
                  <td className="subtle">{b.phone || '—'}</td>
                  {isAdmin && (
                    <td className="num"><button className="linkbtn" onClick={() => setEditing(b)}>Edit</button></td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {editing && (
        <BranchModal
          branch={editing === 'new' ? null : editing}
          onClose={() => setEditing(null)}
          onSaved={load}
        />
      )}
    </div>
  );
}
