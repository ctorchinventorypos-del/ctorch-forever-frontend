// ============================================================
//  Tooltip: a "?" chip that shows a plain-language hint.
//  It measures itself when it opens and:
//   - clamps left/right so it never runs off the sides, and
//   - flips BELOW the chip when there isn't room above (so chips
//     at the very top of the screen aren't cut off).
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
    const gap = 10;
    const maxW = Math.min(260, window.innerWidth - margin * 2);
    const chipCenter = c.left + c.width / 2;

    let left = chipCenter - maxW / 2;
    left = Math.max(margin, Math.min(left, window.innerWidth - maxW - margin));

    // Not enough room above? Drop the bubble below the chip instead.
    const below = c.top < b.height + gap + margin;
    const top = below ? c.bottom + gap : c.top - gap - b.height;

    setPos({ left, top, below, arrowLeft: chipCenter - left, maxW });
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
              ? { position: 'fixed', top: pos.top, left: pos.left, maxWidth: pos.maxW }
              : { position: 'fixed', top: 0, left: 0, visibility: 'hidden',
                  maxWidth: Math.min(260, window.innerWidth - 20) }
          }
        >
          {text}
          <span className="tip-arrow" style={{ left: pos ? pos.arrowLeft : 0 }} />
        </span>
      )}
    </span>
  );
}
