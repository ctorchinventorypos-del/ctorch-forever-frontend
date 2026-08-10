// ============================================================
//  NumberField: a text input that shows numbers with thousands
//  separators (e.g. 1,234,567) while giving the raw number back.
//  Props: value (raw number or ''), onChange(rawString), plus any
//  input props (placeholder, disabled, style, etc.).
// ============================================================
export default function NumberField({ value, onChange, allowDecimal = true, ...rest }) {
  const format = (raw) => {
    if (raw === '' || raw === null || raw === undefined) return '';
    const s = String(raw);
    const neg = s.startsWith('-');
    let [int, dec] = s.replace('-', '').split('.');
    int = int.replace(/\D/g, '');
    const withCommas = int ? Number(int).toLocaleString('en-US') : '';
    let out = withCommas;
    if (allowDecimal && dec !== undefined) out += '.' + dec.replace(/\D/g, '');
    return (neg ? '-' : '') + out;
  };

  const handle = (e) => {
    let raw = e.target.value.replace(/,/g, '');
    if (!allowDecimal) raw = raw.replace(/\./g, '');
    // keep only a valid number pattern
    if (raw === '' || raw === '-' || /^-?\d*\.?\d*$/.test(raw)) onChange(raw);
  };

  return (
    <input
      {...rest}
      type="text"
      inputMode={allowDecimal ? 'decimal' : 'numeric'}
      value={format(value)}
      onChange={handle}
    />
  );
}
