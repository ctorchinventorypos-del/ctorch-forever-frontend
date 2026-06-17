// ============================================================
//  Tooltip: a "?" chip that shows a plain-language hint.
//  The bubble hangs directly under (or above) the chip, with the
//  arrow pointing right at it, and never runs off the screen.
// ============================================================
import { useState, useRef, useLayoutEffect } from 'react';

export default function Tooltip({ text }) {
  const [open, setOpen] = useState(false);
  const chipRef = useRef(null);
  const bubbleRef = useRef(null);
  const [pos, setPos] = useState(null);

  useLayoutEffect(() => {
    if (!open || !chipRef.current || !bubbleRef.current) return;
    const c = chipRef.current.getBoundingClientRect();
    const b = bubbleRef.current.getBoundingClientRect();
    const margin = 10;
    const gap = 9;
    const chipCenter = c.left + c.width / 2;

    // Anchor the bubble so the arrow sits ~18px from its left edge,
    // landing directly under the chip; then keep it inside the screen.
    let left = chipCenter - 18;
    left = Math.max(margin, Math.min(left, window.innerWidth - b.width - margin));

    // Flip below the chip when there isn't room above.
    const below = c.top < b.height + gap + margin;
    const top = below ? c.bottom + gap : c.top - gap - b.height;

    setPos({ left, top, below, arrowLeft: chipCenter - left });
  }, [open]);

  const openTip = () => { setPos(null); setOpen(true); };
  const closeTip = () => { setOpen(false); setPos(null); };

  return (
    <span
      ref={chipRef}
      className="tip"
      tabIndex={0}
      role="button"
      aria-label={text}
      onMouseEnter={openTip}
      onMouseLeave={closeTip}
      onFocus={openTip}
      onBlur={closeTip}
    >
      ?
      {open && (
        <span
          ref={bubbleRef}
          className={`tip-bubble${pos?.below ? ' below' : ''}`}
          style={
            pos
              ? { position: 'fixed', top: pos.top, left: pos.left }
              : { position: 'fixed', top: 0, left: 0, visibility: 'hidden' }
          }
        >
          {text}
          <span className="tip-arrow" style={{ left: pos ? pos.arrowLeft : 0 }} />
        </span>
      )}
    </span>
  );
}
