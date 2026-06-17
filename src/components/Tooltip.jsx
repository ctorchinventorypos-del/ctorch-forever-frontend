// ============================================================
//  Tooltip: a small "?" chip that shows a plain-language hint.
//  Works on hover and on keyboard focus. Used next to functions
//  so anyone can learn the app without training.
// ============================================================
import { useState } from 'react';

export default function Tooltip({ text }) {
  const [open, setOpen] = useState(false);
  return (
    <span
      className="tip"
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
