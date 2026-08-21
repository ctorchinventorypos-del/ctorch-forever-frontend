// ============================================================
//  Permissions: admin grid to switch features ON/OFF for the Sales
//  group, the Warehouse group, or a single chosen user. A user
//  override wins over the group; clearing it falls back to the group
//  default. Admins always have everything (not shown here).
// ============================================================
import { useEffect, useMemo, useState } from 'react';
import { api } from '../api/client';
import Tooltip from '../components/Tooltip';

export default function Permissions() {
  const [data, setData] = useState(null);
  const [scope, setScope] = useState('sales');     // 'sales' | 'warehouse' | 'user'
  const [userId, setUserId] = useState('');
  const [busyKey, setBusyKey] = useState('');
  const [msg, setMsg] = useState('');

  const load = () => api('/permissions/catalog').then(setData).catch(() => {});
  useEffect(() => { load(); }, []);

  // Build quick lookups from the overrides list.
  const ovMap = useMemo(() => {
    const m = {};
    (data?.overrides || []).forEach((o) => { m[`${o.scope_type}:${o.scope_id}:${o.feature_key}`] = o.allowed; });
    return m;
  }, [data]);

  if (!data) return <div className="page-head"><h1>Permissions</h1></div>;

  const roleDefault = (f, role) => f.defaults[role] === true;
  const scopeType = scope === 'user' ? 'user' : 'role';
  const scopeId = scope === 'user' ? String(userId) : scope;

  // Effective value shown on the switch for the current scope.
  const effective = (f) => {
    if (scope === 'user') {
      const uKey = `user:${userId}:${f.key}`;
      if (uKey in ovMap) return ovMap[uKey];
      // fall back to the user's role group
      const u = data.users.find((x) => String(x.id) === String(userId));
      const role = u?.role || 'sales';
      const rKey = `role:${role}:${f.key}`;
      return rKey in ovMap ? ovMap[rKey] : roleDefault(f, role);
    }
    const rKey = `role:${scope}:${f.key}`;
    return rKey in ovMap ? ovMap[rKey] : roleDefault(f, scope);
  };
  const isOverridden = (f) => `${scopeType}:${scopeId}:${f.key}` in ovMap;

  const setVal = async (f, allowed) => {
    if (scope === 'user' && !userId) { setMsg('Pick a user first.'); return; }
    setBusyKey(f.key);
    try {
      await api('/permissions', { method: 'PUT', body: { feature_key: f.key, scope_type: scopeType, scope_id: scopeId, allowed } });
      await load();
    } catch (e) { setMsg(e.message); }
    finally { setBusyKey(''); }
  };
  const reset = async (f) => {
    setBusyKey(f.key);
    try {
      await api('/permissions', { method: 'DELETE', body: { feature_key: f.key, scope_type: scopeType, scope_id: scopeId } });
      await load();
    } catch (e) { setMsg(e.message); }
    finally { setBusyKey(''); }
  };

  // Group features by category for display.
  const byCat = {};
  data.features.forEach((f) => { (byCat[f.category] = byCat[f.category] || []).push(f); });

  return (
    <div>
      <div className="page-head">
        <h1>Permissions</h1>
        <Tooltip text="Turn features on or off for the Sales group, the Warehouse group, or one specific person. Admins always have full access." />
      </div>

      <div className="card card-pad" style={{ marginBottom: 16 }}>
        <div className="field" style={{ marginBottom: scope === 'user' ? 12 : 0 }}>
          <label>Apply to</label>
          <div className="seg">
            <button className={scope === 'sales' ? 'on' : ''} onClick={() => setScope('sales')}>Sales group</button>
            <button className={scope === 'warehouse' ? 'on' : ''} onClick={() => setScope('warehouse')}>Warehouse group</button>
            <button className={scope === 'user' ? 'on' : ''} onClick={() => setScope('user')}>One user</button>
          </div>
        </div>
        {scope === 'user' && (
          <div className="field">
            <label>User <Tooltip text="A per-user switch overrides that person's group. Reset it to fall back to the group." /></label>
            <select className="input" value={userId} onChange={(e) => setUserId(e.target.value)}>
              <option value="">— choose a user —</option>
              {data.users.map((u) => <option key={u.id} value={u.id}>{u.full_name} ({u.role})</option>)}
            </select>
          </div>
        )}
      </div>

      {msg && <div className="banner-error" style={{ marginBottom: 12 }}>{msg}</div>}

      {scope === 'user' && !userId ? (
        <p className="subtle">Choose a user above to see and change their switches.</p>
      ) : (
        Object.entries(byCat).map(([cat, feats]) => (
          <div className="card card-pad" key={cat} style={{ marginBottom: 14 }}>
            <h2 style={{ marginBottom: 10 }}>{cat}</h2>
            <div className="table-wrap">
              <table className="t">
                <thead><tr><th>Feature</th><th>Type</th><th className="num">Allowed?</th><th></th></tr></thead>
                <tbody>
                  {feats.map((f) => {
                    const on = effective(f);
                    const over = isOverridden(f);
                    return (
                      <tr key={f.key}>
                        <td>{f.label}</td>
                        <td><span className="code">{f.type === 'action' ? 'Action' : 'View'}</span></td>
                        <td className="num">
                          <label className="switch" title={on ? 'On' : 'Off'}>
                            <input type="checkbox" checked={on} disabled={busyKey === f.key}
                              onChange={(e) => setVal(f, e.target.checked)} />
                            <span className="slider" />
                          </label>
                        </td>
                        <td className="num" style={{ width: 90 }}>
                          {over
                            ? <button className="linkbtn" onClick={() => reset(f)} title="Remove this override and fall back to the default">Reset</button>
                            : <span className="subtle" style={{ fontSize: 12 }}>default</span>}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        ))
      )}
    </div>
  );
}
