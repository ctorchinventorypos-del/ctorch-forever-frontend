// ============================================================
//  Tooltip: a small "?" chip that shows a plain-language hint.
//  Works on hover and on keyboard focus. Pass align="left" for
//  chips near the right edge so the bubble opens inward.
// ============================================================
import { useState } from 'react';

export default function Tooltip({ text, align }) {
  const [open, setOpen] = useState(false);
  return (
    <span
      className={`tip${align === 'left' ? ' tip-left' : ''}`}
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
