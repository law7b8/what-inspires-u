import { useLayoutEffect, useRef, useState } from 'react';
import { gsap } from 'gsap';
import styles from './FileWindow.module.css';

// The "old Windows player application window" a floating file opens into
// when clicked — img and mp3 windows share one "enlarged" frame/behavior
// (2x size, enlarge-from-click-origin, drag from anywhere, resize from
// any edge, the frosted-glass titlebar): img files show the picture, name,
// and an optional context dropdown; mp3 files show the real embeddable
// player oEmbed already handed back (trackLookup.js's `embed` field — an
// <iframe> straight from YouTube/SoundCloud/Spotify's own oEmbed
// response), so it actually plays instead of just displaying metadata —
// no context dropdown there, since mp3 posts don't carry that field.
// Dragging is hand-rolled — pointer events writing straight to the
// element's own style — rather than a library, same approach
// FloatingFiles' own ticker uses for its position updates.
export default function FileWindow({ data, x, y, width, zIndex, origin, onClose, onFocus }) {
    const rootRef = useRef(null);
    const labelRef = useRef(null); // the name (+ context-arrow, img only) group that slides up on open
    const [showContext, setShowContext] = useState(false);
    const isImg = data.kind === 'img';
    const dragRef = useRef(null); // { startX, startY, originLeft, originTop } while a drag is in progress

    // every window enlarges open from the floating file's own on-screen
    // spot (`origin`, its rect at the moment it was clicked — see
    // FloatingFiles.jsx/Hero.jsx) rather than just appearing at their
    // target spot. Pure transform (translate+scale), not left/top/width —
    // compositor-only, so it stays smooth and never fights the drag/resize
    // handlers above, which do own left/top/width directly. Runs once,
    // right after this window's real (already on-screen-clamped) layout
    // rect is known, so the "grown" state it eases into is always the
    // clamped one — it can never land or pass outside the viewport on the
    // way there any more than the target rect itself already does. The
    // name label gets its own slightly-delayed slide-up-from-below —
    // simultaneous with the frame around it wouldn't read as two things.
    useLayoutEffect(() => {
        if (!origin) return;
        if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
        const el = rootRef.current;
        const final = el.getBoundingClientRect();
        if (!final.width || !final.height) return;

        const scaleX = origin.width / final.width;
        const scaleY = origin.height / final.height;
        const fromX = (origin.left + origin.width / 2) - (final.left + final.width / 2);
        const fromY = (origin.top + origin.height / 2) - (final.top + final.height / 2);

        gsap.fromTo(el,
            { x: fromX, y: fromY, scaleX, scaleY, opacity: 0.6 },
            { x: 0, y: 0, scaleX: 1, scaleY: 1, opacity: 1, duration: 0.5, ease: 'power3.out' },
        );
        if (labelRef.current) {
            gsap.fromTo(labelRef.current,
                { y: 14, autoAlpha: 0 },
                { y: 0, autoAlpha: 1, duration: 0.35, ease: 'power2.out', delay: 0.16 },
            );
        }
    }, [origin]);

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
    // every window drags from anywhere in it (the picture/embed included),
    // not just the titlebar — these three go on the root div, not the
    // titlebar specifically, so a pointerdown on the titlebar (which is
    // inside root) still reaches them via normal bubbling. The context
    // arrow, the close button, the resize handles and the context text
    // drop all stop this pointerdown from ever reaching here (see their
    // own onPointerDown/stopPropagation), so none of them accidentally
    // start a drag.
    const dragProps = { onPointerDown: startDrag, onPointerMove: drag, onPointerUp: endDrag, onPointerCancel: endDrag };

    // every window resizes by width only, not freely in both dimensions:
    // dragging any handle maps to a width change (whichever axis it's on),
    // and height just follows from whatever's inside — the picture's own
    // aspect ratio for img windows (the <img> is width: 100%; height:
    // auto), an oEmbed iframe's own fixed height for mp3 windows — so
    // there's never any letterboxing or stretching. Resizable from any
    // edge or corner (8 handles below), not just the bottom-right one —
    // each handle's config says which pointer axis/axes drive the size
    // change (signX/signY, or 0 to ignore that axis) and which of the
    // window's own corners has to stay put on screen while it grows
    // (anchorX/anchorY): dragging a LEFT/TOP handle grows the window back
    // toward the opposite edge, same as dragging the window's own border
    // in a real OS, rather than only ever growing down-and-right
    // regardless of which handle was grabbed.
    const RESIZE_HANDLES = {
        se: { signX: 1, signY: 1, anchorX: 'left', anchorY: 'top' },
        sw: { signX: -1, signY: 1, anchorX: 'right', anchorY: 'top' },
        ne: { signX: 1, signY: -1, anchorX: 'left', anchorY: 'bottom' },
        nw: { signX: -1, signY: -1, anchorX: 'right', anchorY: 'bottom' },
        e: { signX: 1, signY: 0, anchorX: 'left', anchorY: 'top' },
        w: { signX: -1, signY: 0, anchorX: 'right', anchorY: 'top' },
        n: { signX: 0, signY: -1, anchorX: 'left', anchorY: 'bottom' },
        s: { signX: 0, signY: 1, anchorX: 'left', anchorY: 'top' },
    };
    const resizeRef = useRef(null); // { handle, startX, startY, w, h, left, top, ratio }
    const startResize = (handle) => (e) => {
        e.stopPropagation();
        const rect = rootRef.current.getBoundingClientRect();
        resizeRef.current = {
            handle, startX: e.clientX, startY: e.clientY,
            w: rect.width, h: rect.height, left: rect.left, top: rect.top, ratio: rect.width / rect.height,
        };
        e.currentTarget.setPointerCapture(e.pointerId);
    };
    const doResize = (e) => {
        if (!resizeRef.current) return;
        const { handle, startX, startY, w, h, left, top, ratio } = resizeRef.current;
        const { signX, signY, anchorX, anchorY } = RESIZE_HANDLES[handle];
        // a corner handle blends both axes (halved so a diagonal drag
        // grows at the same rate as a straight one); an edge handle only
        // ever has one non-zero sign, so the other term is already 0
        const dw = (signX * (e.clientX - startX) + signY * (e.clientY - startY) * ratio) / (signX && signY ? 2 : 1);

        // clamp so growth can never push the window past whichever screen
        // edge it's growing toward, on either axis — mirrors the corner-
        // only clamp this used to have, just aimed at the right edge for
        // whichever handle is actually being dragged
        const hCap = anchorX === 'left' ? window.innerWidth - 8 - left : left + w - 8;
        const vCapAsWidth = (anchorY === 'top' ? window.innerHeight - 8 - top : top + h - 8) * ratio;
        const maxW = Math.max(200, Math.min(hCap, vCapAsWidth));
        const newWidth = Math.max(200, Math.min(w + dw, maxW));
        rootRef.current.style.width = `${newWidth}px`;

        // growing from a right- or bottom-anchored handle has to shift
        // left/top back to keep that far edge fixed on screen — height is
        // auto (follows the image), so its real new value is only known
        // after the width above has actually applied
        if (anchorX === 'right' || anchorY === 'bottom') {
            const grown = rootRef.current.getBoundingClientRect();
            if (anchorX === 'right') rootRef.current.style.left = `${left + w - grown.width}px`;
            if (anchorY === 'bottom') rootRef.current.style.top = `${top + h - grown.height}px`;
        }
    };
    const endResize = () => { resizeRef.current = null; };

    return (
        <div
            className={`${styles.window} ${styles.enlarged}`}
            ref={rootRef}
            // width overrides .enlarged's own flat 560px default — Hero.jsx
            // computes this once (2x the video's real native size when
            // known, its normal 2x otherwise) and hands it down as the
            // window's actual starting width; the resize handles below
            // then take over writing this same style.width imperatively
            style={{ left: x, top: y, zIndex, ...(width && { width }) }}
            onPointerDownCapture={onFocus}
            {...dragProps}
        >
            <div className={styles.titlebar}>
                {/* the arrow sits to the left of the name, img windows only
                    (mp3 posts don't carry a context field to show) — both
                    grouped together under labelRef so they slide up from
                    below as one unit when the window opens; for mp3, just
                    the name gets that same entrance, see the
                    useLayoutEffect above */}
                <span className={styles.label} ref={labelRef}>
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
                    <span className={styles.titleText}>{data.fileName}</span>
                </span>
                <span className={styles.spacer} />
                <button
                    type="button"
                    className={styles.closeBtn}
                    onClick={onClose}
                    // stops the root's own onPointerDown (startDrag, see
                    // dragProps above) from ever seeing this — otherwise
                    // it captures the pointer on every pointerdown that
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
                            // stops this from starting a whole-window drag
                            // (see dragProps above) so selecting/
                            // copying the text here works normally
                            <div className={styles.contextDrop} onPointerDown={(e) => e.stopPropagation()}>
                                {data.context || 'no context'}
                            </div>
                        )}
                    </>
                ) : data.embed ? (
                    // trusted: embed only ever comes from trackLookup.js's
                    // fixed 3-service whitelist, never an arbitrary URL —
                    // see the comment there.
                    //
                    // aspect-ratio (when the oEmbed read included a real
                    // width/height, i.e. embedWidth/embedHeight) keeps the
                    // video's own true ratio as the window resizes — same
                    // "width drives it, height follows" contract as an img
                    // window's own width: 100%; height: auto, just done via
                    // aspect-ratio since there's no intrinsic-sized <img>
                    // here for a plain height: auto to follow.
                    <div
                        className={styles.embedWrap}
                        data-has-ratio={data.embedWidth ? '' : undefined}
                        style={data.embedWidth ? { aspectRatio: `${data.embedWidth} / ${data.embedHeight}` } : undefined}
                        dangerouslySetInnerHTML={{ __html: data.embed }}
                    />
                ) : (
                    <div className={styles.noPlayback}>
                        <img className={styles.bigImg} src={data.cover} alt="" />
                        <p>no playback available for this one</p>
                    </div>
                )}
            </div>

            {Object.keys(RESIZE_HANDLES).map((handle) => (
                <div
                    key={handle}
                    className={`${styles.resizeHandle} ${styles[`resize${handle}`]}`}
                    onPointerDown={startResize(handle)}
                    onPointerMove={doResize}
                    onPointerUp={endResize}
                    onPointerCancel={endResize}
                    aria-hidden="true"
                />
            ))}
        </div>
    );
}
