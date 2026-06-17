// ============================================================
//  Tooltip: a "?" chip that shows a plain-language hint.
//  When it opens it measures itself and clamps inside the
//  screen, so the bubble can never run off the edge — no matter
//  where the chip sits (left, right, mobile, anywhere).
// ============================================================
import { useState, useRef, useLayoutEffect } from 'react';

export default function Tooltip({ text }) {
  const [open, setOpen] = useState(false);
  const chipRef = useRef(null);
  const [style, setStyle] = useState(null);
  const [arrowLeft, setArrowLeft] = useState(0);

  useLayoutEffect(() => {
    if (!open || !chipRef.current) return;
    const r = chipRef.current.getBoundingClientRect();
    const margin = 10;
    const maxW = Math.min(260, window.innerWidth - margin * 2);
    const chipCenter = r.left + r.width / 2;

    // Center on the chip, then pull back inside the screen edges.
    let left = chipCenter - maxW / 2;
    left = Math.max(margin, Math.min(left, window.innerWidth - maxW - margin));

    setStyle({
      position: 'fixed',
      top: r.top - 8,
      left,
      maxWidth: maxW,
      transform: 'translateY(-100%)',
    });
    setArrowLeft(chipCenter - left); // keep the arrow pointing at the chip
  }, [open]);

  return (
    <span
      ref={chipRef}
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
      {open && style && (
        <span className="tip-bubble" style={style}>
          {text}
          <span className="tip-arrow" style={{ left: arrowLeft }} />
        </span>
      )}
    </span>
  );
}
