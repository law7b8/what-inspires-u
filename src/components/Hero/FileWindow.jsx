import { useRef, useState } from 'react';
import styles from './FileWindow.module.css';

// The "old Windows player application window" a floating file opens into
// when clicked. img files show the picture, name, and context underneath;
// mp3 files show the real embeddable player oEmbed already handed back
// (trackLookup.js's `embed` field — an <iframe> straight from YouTube/
// SoundCloud/Spotify's own oEmbed response), so it actually plays instead
// of just displaying metadata. Dragging is hand-rolled — pointer events
// writing straight to the element's own style — rather than a library,
// same approach FloatingFiles' own ticker uses for its position updates.
export default function FileWindow({ data, x, y, zIndex, onClose, onFocus }) {
    const rootRef = useRef(null);
    const [showContext, setShowContext] = useState(false);
    const isImg = data.kind === 'img';
    const dragRef = useRef(null); // { startX, startY, originLeft, originTop } while a drag is in progress

    const startDrag = (e) => {
        const rect = rootRef.current.getBoundingClientRect();
        dragRef.current = { startX: e.clientX, startY: e.clientY, originLeft: rect.left, originTop: rect.top };
        e.currentTarget.setPointerCapture(e.pointerId);
    };
    const drag = (e) => {
        if (!dragRef.current) return;
        const { startX, startY, originLeft, originTop } = dragRef.current;
        rootRef.current.style.left = `${originLeft + (e.clientX - startX)}px`;
        rootRef.current.style.top = `${originTop + (e.clientY - startY)}px`;
    };
    const endDrag = () => { dragRef.current = null; };

    // img windows resize by scale, not freely: only the width is ever
    // written (dragging the corner in either axis maps to a width change)
    // and the height follows from the picture's own aspect ratio (the
    // <img> is width: 100%; height: auto), so the window always hugs the
    // image with no letterboxing.
    const resizeRef = useRef(null);
    const startResize = (e) => {
        e.stopPropagation();
        const rect = rootRef.current.getBoundingClientRect();
        resizeRef.current = { startX: e.clientX, startY: e.clientY, w: rect.width, ratio: rect.width / rect.height };
        e.currentTarget.setPointerCapture(e.pointerId);
    };
    const doResize = (e) => {
        if (!resizeRef.current) return;
        const { startX, startY, w, ratio } = resizeRef.current;
        const dw = ((e.clientX - startX) + (e.clientY - startY) * ratio) / 2;
        const rect = rootRef.current.getBoundingClientRect();
        const maxW = Math.min(window.innerWidth - rect.left - 8, (window.innerHeight - rect.top - 8) * ratio);
        rootRef.current.style.width = `${Math.max(200, Math.min(w + dw, maxW))}px`;
    };
    const endResize = () => { resizeRef.current = null; };

    return (
        <div
            className={`${styles.window} ${isImg ? styles.imgWindow : ''}`.trim()}
            ref={rootRef}
            style={{ left: x, top: y, zIndex }}
            onPointerDownCapture={onFocus}
        >
            <div
                className={styles.titlebar}
                onPointerDown={startDrag}
                onPointerMove={drag}
                onPointerUp={endDrag}
            >
                <span className={styles.titleText}>{data.fileName}</span>
                {isImg && (
                    <button
                        type="button"
                        className={`${styles.contextBtn} ${showContext ? styles.contextBtnOpen : ''}`}
                        onClick={() => setShowContext((v) => !v)}
                        onPointerDown={(e) => e.stopPropagation()}
                        aria-expanded={showContext}
                        aria-label="show context"
                    >
                        ▾
                    </button>
                )}
                <span className={styles.spacer} />
                <button
                    type="button"
                    className={styles.closeBtn}
                    onClick={onClose}
                    // stops the titlebar's own onPointerDown (startDrag)
                    // from ever seeing this — otherwise it captures the
                    // pointer to the titlebar on every pointerdown that
                    // bubbles up to it, including this button's, which
                    // redirects the matching pointerup away from the
                    // button and silently swallows the click that would've
                    // fired onClose
                    onPointerDown={(e) => e.stopPropagation()}
                    aria-label={`close ${data.fileName}`}
                >
                    ×
                </button>
            </div>

            <div className={styles.body}>
                {isImg ? (
                    <>
                        <img className={styles.bigImg} src={data.cover} alt="" draggable={false} />
                        {showContext && (
                            <div className={styles.contextDrop}>
                                {data.context || 'no context'}
                            </div>
                        )}
                    </>
                ) : data.embed ? (
                    // trusted: embed only ever comes from trackLookup.js's
                    // fixed 3-service whitelist, never an arbitrary URL —
                    // see the comment there
                    <div className={styles.embedWrap} dangerouslySetInnerHTML={{ __html: data.embed }} />
                ) : (
                    <div className={styles.noPlayback}>
                        <img className={styles.bigImg} src={data.cover} alt="" />
                        <p>no playback available for this one</p>
                    </div>
                )}
            </div>

            {isImg && (
                <div
                    className={styles.resizeHandle}
                    onPointerDown={startResize}
                    onPointerMove={doResize}
                    onPointerUp={endResize}
                    onPointerCancel={endResize}
                    aria-hidden="true"
                />
            )}
        </div>
    );
}
