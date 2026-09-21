import { useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import dragIcon from '../../pages/CreatePost/dragIcon.png';
import styles from './DragToLaunch.module.css';

// Replaces a plain "shoot into hero" submit button on both ImgForm and
// Mp3Form: press and hold this, drag the real file preview (whatever's
// passed as children) anywhere on the page, and release to drop it there
// — onDrop({x, y}) fires with the release point in viewport coordinates,
// which the host passes straight through to FloatingFiles as the file's
// starting spot.
//
// The dragged preview is rendered via a portal into document.body, not as
// a normal child here — this button lives inside PlusMenu's sheet, whose
// ancestors (.sheet has will-change: transform) would otherwise become the
// containing block for a plain position: fixed ghost, trapping it inside
// the sheet's own clipped box instead of letting it roam the real
// viewport. Its position is written straight to the ghost element's style
// on every pointermove rather than through React state, same reasoning as
// FloatingFiles' own ticker: this needs to stay smooth at pointer-move
// frequency, not re-render-frequency.
//
// A plain click (press and release without moving) or a keyboard
// activation (Enter/Space while focused) both still work — they just drop
// the file at the button's own position, the same place the old "shoot
// into hero" button always launched from.
export default function DragToLaunch({ children, label, disabled, onDrop, className = '' }) {
    const handleRef = useRef(null);
    const ghostRef = useRef(null);
    const [dragging, setDragging] = useState(false);

    const moveGhost = (x, y) => {
        if (ghostRef.current) ghostRef.current.style.transform = `translate(calc(${x}px - 50%), calc(${y}px - 50%))`;
    };

    const startDrag = (e) => {
        if (disabled) return;
        setDragging(true);
        handleRef.current.setPointerCapture(e.pointerId);
        // the ghost doesn't exist in the DOM until the next render (it's
        // conditional on `dragging`) — wait a frame so moveGhost has
        // something to position
        requestAnimationFrame(() => moveGhost(e.clientX, e.clientY));
    };

    const onMove = (e) => {
        if (!dragging) return;
        moveGhost(e.clientX, e.clientY);
    };

    const endDrag = (e) => {
        if (!dragging) return;
        setDragging(false);
        onDrop({ x: e.clientX, y: e.clientY });
    };

    // keyboard activation (Enter/Space on a focused button) fires a click
    // with detail === 0 — a real mouse/touch click has detail >= 1 and is
    // already handled by startDrag/endDrag above, so this only ever
    // catches the keyboard path.
    const onClick = (e) => {
        if (disabled || e.detail !== 0) return;
        const rect = handleRef.current.getBoundingClientRect();
        onDrop({ x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 });
    };

    return (
        <>
            <button
                type="button"
                ref={handleRef}
                className={`${styles.handle} ${className}`.trim()}
                disabled={disabled}
                onPointerDown={startDrag}
                onPointerMove={onMove}
                onPointerUp={endDrag}
                onPointerCancel={endDrag}
                onClick={onClick}
            >
                <img src={dragIcon} alt="" aria-hidden="true" draggable={false} className={styles.icon} />
                {label}
            </button>
            {dragging && createPortal(
                <div className={styles.ghost} ref={ghostRef} aria-hidden="true">
                    {children}
                </div>,
                document.body,
            )}
        </>
    );
}
