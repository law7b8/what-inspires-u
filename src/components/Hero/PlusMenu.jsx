import { useEffect, useRef, useState } from 'react';
import { gsap } from 'gsap';
import ImgForm from './ImgForm';
import Mp3Form from './Mp3Form';
import { captureCleanScreenshot } from '../../utils/screenshot';
import styles from './PlusMenu.module.css';

// Edit this list to add/remove/rename options. kind: 'sheet' (the default)
// slides its own fill-out sheet out from behind itself, only one open at a
// time; kind: 'action' just runs immediately on click/Enter, no sheet.
const OPTIONS = [
    { id: 'post-img', label: 'post img', kind: 'sheet' },
    { id: 'post-mp3', label: 'post mp3', kind: 'sheet' },
    { id: 'screenshot', label: 'screenshot', kind: 'action' },
];

const HIDDEN_Y = -40;      // px each option starts offset upward while cascading in — comes down from behind the toggle, not just a nudge
const SHEET_HIDDEN = -105; // % of its own width a sheet sits to the left (behind its option) while closed

// The + toggle and the cascade of options it reveals below it. Every
// visual knob (border, radius, colors, spacing, cascade indent, sheet
// size) is a CSS custom property at the top of PlusMenu.module.css.
// onLaunchMp3(track, origin)/onLaunchImg(file, origin) are called when a
// file is shot from the mp3/img sheet respectively.
export default function PlusMenu({ onLaunchMp3, onLaunchImg }) {
    const rootRef = useRef(null);
    const firstRun = useRef(true);
    const [open, setOpen] = useState(false);
    const [sheet, setSheet] = useState(null); // id of the open sheet, or null
    // which option is highlighted right now — independent of which sheet (if
    // any) is open, same as an XMB icon can be highlighted without being
    // "opened". Arrow keys/wheel move this; Enter/click opens that item's
    // sheet. Wraps at both ends (the "shuffle" — cycling past the last
    // option lands back on the first, and vice versa).
    const [focusedIndex, setFocusedIndex] = useState(0);
    const wheelLockRef = useRef(false);
    const [capturing, setCapturing] = useState(false);

    const reduced = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const moveFocus = (delta) => setFocusedIndex((i) => (i + delta + OPTIONS.length) % OPTIONS.length);

    // cascade — options fade/slide in one after another; closing collapses
    // them bottom-up and tucks the sheet away with them.
    useEffect(() => {
        const items = rootRef.current.querySelectorAll('[data-item]');
        const instant = firstRun.current || reduced();
        if (open) {
            gsap.to(items, {
                autoAlpha: 1, y: 0,
                duration: instant ? 0 : 0.5, stagger: instant ? 0 : 0.08,
                ease: 'back.out(1.6)', overwrite: true,
            });
        } else {
            gsap.to(items, {
                autoAlpha: 0, y: HIDDEN_Y,
                duration: instant ? 0 : 0.22, stagger: instant ? 0 : { each: 0.04, from: 'end' },
                ease: 'power2.in', overwrite: true,
            });
        }
    }, [open]);

    // sheets — the open one slides out from behind its option (each lives in
    // a clip window starting at that option's right edge, so it only shows
    // once it has cleared it); the others tuck back in.
    useEffect(() => {
        const instant = firstRun.current || reduced();
        rootRef.current.querySelectorAll('[data-sheet]').forEach((el) => {
            const isOpen = el.dataset.sheet === sheet;
            gsap.to(el, {
                xPercent: isOpen ? 0 : SHEET_HIDDEN,
                autoAlpha: isOpen ? 1 : 0,
                duration: instant ? 0 : isOpen ? 0.6 : 0.35,
                ease: isOpen ? 'power3.out' : 'power3.in',
                overwrite: true,
            });
        });
        firstRun.current = false;
    }, [sheet]);

    // closing the menu closes the sheet too, and resets the highlight back
    // to the top for next time it opens
    useEffect(() => {
        if (!open) {
            setSheet(null);
            setFocusedIndex(0);
        }
    }, [open]);

    // arrow keys shuffle the highlight up/down through the options
    // (wrapping at both ends); Enter/Space opens the highlighted one's
    // sheet, same as clicking it. Escape backs out one level at a time.
    useEffect(() => {
        if (!open) return;
        const onKey = (e) => {
            if (e.key === 'ArrowDown') {
                e.preventDefault();
                moveFocus(1);
            } else if (e.key === 'ArrowUp') {
                e.preventDefault();
                moveFocus(-1);
            } else if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                const opt = OPTIONS[focusedIndex];
                if (opt.kind === 'action') runScreenshot();
                else setSheet((s) => (s === opt.id ? null : opt.id));
            } else if (e.key === 'Escape') {
                if (sheet) setSheet(null);
                else setOpen(false);
            }
        };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [open, sheet, focusedIndex]);

    // scrolling over the menu shuffles the highlight too, one option per
    // gesture (wheelLockRef debounces a single trackpad flick/scroll-wheel
    // notch into exactly one step instead of racing through several)
    useEffect(() => {
        if (!open) return;
        const el = rootRef.current;
        const onWheel = (e) => {
            e.preventDefault();
            if (wheelLockRef.current) return;
            wheelLockRef.current = true;
            moveFocus(e.deltaY > 0 ? 1 : -1);
            setTimeout(() => { wheelLockRef.current = false; }, 220);
        };
        el.addEventListener('wheel', onWheel, { passive: false });
        return () => el.removeEventListener('wheel', onWheel);
    }, [open]);

    const closeSheet = () => setSheet(null);

    const handleLaunchMp3 = (track, origin) => {
        onLaunchMp3?.(track, origin);
        closeSheet();
    };

    const handleLaunchImg = (file, origin) => {
        onLaunchImg?.(file, origin);
        closeSheet();
    };

    // screenshot is an "action" option — no sheet, it just runs immediately.
    // Hides this whole menu (rootRef) for the capture on top of whatever
    // captureCleanScreenshot already hides elsewhere (Header/footer), since
    // this menu itself is currently open/visible when you'd click this.
    const runScreenshot = async () => {
        if (capturing) return;
        setCapturing(true);
        const root = rootRef.current;
        const prevVisibility = root.style.visibility;
        root.style.visibility = 'hidden';
        try {
            await captureCleanScreenshot();
        } catch (err) {
            console.error('Screenshot failed:', err);
        } finally {
            root.style.visibility = prevVisibility;
            setCapturing(false);
        }
    };

    return (
        <div className={styles.menu} ref={rootRef} style={{ '--count': OPTIONS.length }}>
            <button
                type="button"
                className={styles.toggle}
                onClick={() => setOpen((o) => !o)}
                aria-expanded={open}
                aria-controls="plus-menu-list"
                aria-label={open ? 'close options' : 'open options'}
                data-open={open || undefined}
            />

            <ul className={styles.list} id="plus-menu-list">
                {OPTIONS.map((opt, i) => {
                    const active = sheet === opt.id;
                    const isAction = opt.kind === 'action';
                    return (
                        <li
                            key={opt.id}
                            className={styles.item}
                            style={{ '--i': i }}
                            data-item
                            data-sheet-open={active || undefined}
                        >
                            <button
                                type="button"
                                className={`${styles.opt} ${active ? styles.optActive : ''}`}
                                data-focused={i === focusedIndex || undefined}
                                onMouseEnter={() => setFocusedIndex(i)}
                                onClick={() => {
                                    setFocusedIndex(i);
                                    if (isAction) runScreenshot();
                                    else setSheet(active ? null : opt.id);
                                }}
                                disabled={isAction && capturing}
                                aria-expanded={isAction ? undefined : active}
                                aria-controls={isAction ? undefined : `plus-menu-sheet-${opt.id}`}
                            >
                                {isAction && opt.id === 'screenshot' && capturing ? '…' : opt.label}
                            </button>

                            {!isAction && (
                                <div className={styles.sheetWindow}>
                                    <div
                                        className={styles.sheet}
                                        id={`plus-menu-sheet-${opt.id}`}
                                        data-sheet={opt.id}
                                    >
                                        <div className={styles.titlebar}>
                                            <span className={styles.titleText}>{opt.label}</span>
                                            <button
                                                type="button"
                                                className={styles.close}
                                                onClick={closeSheet}
                                                aria-label={`close ${opt.label}`}
                                            >
                                                ×
                                            </button>
                                        </div>
                                        <div className={styles.sheetBody}>
                                            {opt.id === 'post-img' && (
                                                <ImgForm className={styles.sheetForm} onLaunch={handleLaunchImg} onCancel={closeSheet} />
                                            )}
                                            {opt.id === 'post-mp3' && (
                                                <Mp3Form className={styles.sheetForm} onLaunch={handleLaunchMp3} onCancel={closeSheet} />
                                            )}
                                        </div>
                                    </div>
                                </div>
                            )}
                        </li>
                    );
                })}
            </ul>
        </div>
    );
}
