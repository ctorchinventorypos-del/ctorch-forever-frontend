// ============================================================
//  Tooltip: a "?" chip that shows a plain-language hint.
//  The bubble is anchored to the chip in CSS, so its arrow always
//  grows straight out of the "?" it belongs to. By default it
//  opens upward; pass `below` for chips at the very top of the
//  screen so the bubble drops downward instead.
// ============================================================
import { useState } from 'react';

export default function Tooltip({ text, below }) {
  const [open, setOpen] = useState(false);
  return (
    <span
      className={`tip${below ? ' below' : ''}`}
      tabIndex={0}
      role="button"
      aria-label={text}
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
      onFocus={() => setOpen(true)}
      onBlur={() => setOpen(false)}
    >
      ?
      {open && <span className="tip-bubble">{text}</span>}
    </span>
  );
}
