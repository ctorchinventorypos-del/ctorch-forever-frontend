// ============================================================
//  SearchableSelect: a dropdown you can type to filter.
//  Props: value, onChange(value), options [{ value, label }],
//         placeholder, disabled.
//  Keeps the same visual style as the app's .input controls.
// ============================================================
import { useEffect, useMemo, useRef, useState } from 'react';

export default function SearchableSelect({ value, onChange, options, placeholder = '— choose —', disabled }) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState('');
  const boxRef = useRef(null);

  const selected = options.find((o) => String(o.value) === String(value));

  const filtered = useMemo(() => {
    const t = q.trim().toLowerCase();
    if (!t) return options;
    return options.filter((o) => o.label.toLowerCase().includes(t));
  }, [q, options]);

  useEffect(() => {
    const onDoc = (e) => { if (boxRef.current && !boxRef.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, []);

  return (
    <div className="ss" ref={boxRef} style={{ position: 'relative' }}>
      <button
        type="button" className="input ss-btn" disabled={disabled}
        onClick={() => { if (!disabled) { setOpen((v) => !v); setQ(''); } }}
        style={{ textAlign: 'left', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8, cursor: disabled ? 'not-allowed' : 'pointer', width: '100%' }}
      >
        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: selected ? 'inherit' : '#9aa' }}>
          {selected ? selected.label : placeholder}
        </span>
        <span style={{ opacity: 0.5 }}>▾</span>
      </button>
      {open && (
        <div className="ss-menu" style={{
          position: 'absolute', zIndex: 40, top: 'calc(100% + 4px)', left: 0, right: 0,
          background: '#fff', border: '1px solid var(--line, #dcdcdc)', borderRadius: 10,
          boxShadow: '0 10px 30px rgba(0,0,0,0.12)', maxHeight: 280, overflow: 'hidden',
        }}>
          <div style={{ padding: 8, borderBottom: '1px solid var(--line, #eee)' }}>
            <input
              autoFocus className="input" placeholder="Type to search…"
              value={q} onChange={(e) => setQ(e.target.value)} style={{ width: '100%' }}
            />
          </div>
          <div style={{ maxHeight: 220, overflowY: 'auto' }}>
            {filtered.length === 0 ? (
              <div style={{ padding: '10px 12px', color: '#9aa', fontSize: 13 }}>No matches</div>
            ) : filtered.map((o) => (
              <button
                type="button" key={o.value} className="ss-opt"
                onClick={() => { onChange(String(o.value)); setOpen(false); }}
                style={{
                  display: 'block', width: '100%', textAlign: 'left', padding: '9px 12px',
                  background: String(o.value) === String(value) ? '#eaf6ee' : 'transparent',
                  border: 0, cursor: 'pointer', fontSize: 13.5,
                }}
              >
                {o.label}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
