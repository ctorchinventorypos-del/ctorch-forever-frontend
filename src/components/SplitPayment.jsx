// ============================================================
//  SplitPayment: choose one payment method, or split the amount
//  across several (part cash, part transfer, etc.). Controlled:
//  value = { mode:'single'|'split', method, splits:[{method,amount}] }.
//  The parent sends payment_method (single) or payment_splits (split).
// ============================================================
import NumberField from './NumberField';

export const PAY_METHOD_OPTIONS = [
  { key: 'cash', label: 'Cash' },
  { key: 'pos', label: 'POS Card (Moniepoint)' },
  { key: 'transfer_moniepoint', label: 'Transfer - Moniepoint' },
  { key: 'transfer_zenith', label: 'Transfer - Zenith Bank' },
  { key: 'cheque', label: 'Cheque' },
];

export const emptyPayment = () => ({ mode: 'single', method: 'cash', splits: [] });

// Turn the component state into the API fields for a sale/payment body.
export function paymentBody(v) {
  if (v && v.mode === 'split') {
    return { payment_splits: (v.splits || []).map((r) => ({ method: r.method, amount: Number(r.amount) || 0 })) };
  }
  return { payment_method: (v && v.method) || 'cash' };
}

export default function SplitPayment({ amountDue, value, onChange }) {
  const v = value || emptyPayment();
  const set = (patch) => onChange({ ...v, ...patch });
  const due = Number(amountDue || 0);
  const paid = (v.splits || []).reduce((s, r) => s + (Number(r.amount) || 0), 0);
  const remaining = Math.round((due - paid) * 100) / 100;

  const toggle = (on) => {
    if (on) set({ mode: 'split', splits: v.splits && v.splits.length ? v.splits : [{ method: 'cash', amount: due ? String(due) : '' }] });
    else set({ mode: 'single' });
  };
  const setRow = (i, patch) => set({ splits: v.splits.map((r, idx) => (idx === i ? { ...r, ...patch } : r)) });
  const addRow = () => set({ splits: [...v.splits, { method: 'transfer_moniepoint', amount: remaining > 0 ? String(remaining) : '' }] });
  const delRow = (i) => set({ splits: v.splits.filter((_, idx) => idx !== i) });

  return (
    <div>
      <label style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8, fontWeight: 500 }}>
        <input type="checkbox" checked={v.mode === 'split'} onChange={(e) => toggle(e.target.checked)} />
        Split across payment methods
      </label>

      {v.mode !== 'split' ? (
        <select className="input" value={v.method} onChange={(e) => set({ method: e.target.value })}>
          {PAY_METHOD_OPTIONS.map((m) => <option key={m.key} value={m.key}>{m.label}</option>)}
        </select>
      ) : (
        <div>
          {v.splits.map((r, i) => (
            <div key={i} style={{ display: 'flex', gap: 8, marginBottom: 6, alignItems: 'center' }}>
              <select className="input" value={r.method} onChange={(e) => setRow(i, { method: e.target.value })} style={{ flex: 1, minWidth: 0 }}>
                {PAY_METHOD_OPTIONS.map((m) => <option key={m.key} value={m.key}>{m.label}</option>)}
              </select>
              <div style={{ width: 130, flexShrink: 0 }}>
                <NumberField className="input" value={r.amount} onChange={(val) => setRow(i, { amount: val })} />
              </div>
              {v.splits.length > 1 && (
                <button type="button" className="linkbtn" style={{ color: 'var(--clay)' }} onClick={() => delRow(i)}>✕</button>
              )}
            </div>
          ))}
          <button type="button" className="btn btn-ghost" onClick={addRow}>+ Add method</button>
          <div className="hint" style={{ marginTop: 6, color: Math.abs(remaining) < 0.01 ? 'var(--green-700)' : 'var(--clay)' }}>
            Allocated ₦{paid.toLocaleString('en-NG')} of ₦{due.toLocaleString('en-NG')}
            {Math.abs(remaining) < 0.01 ? ' ✓' : remaining > 0 ? ` · ₦${remaining.toLocaleString('en-NG')} left` : ` · ₦${(-remaining).toLocaleString('en-NG')} over`}
          </div>
        </div>
      )}
    </div>
  );
}
