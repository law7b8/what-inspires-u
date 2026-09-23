import { useEffect, useRef, useState } from 'react';
import { gsap } from 'gsap';
import ImgForm from './ImgForm';
import Mp3Form from './Mp3Form';
import styles from './PlusMenu.module.css';

// Edit this list to add/remove/rename options. Each one slides its own
// fill-out sheet out from behind itself, only one open at a time.
const OPTIONS = [
    { id: 'post-img', label: 'post img' },
    { id: 'post-mp3', label: 'post mp3' },
];

const HIDDEN_Y = -40;      // px each option starts offset upward while cascading in — comes down from behind the toggle, not just a nudge
const SHEET_HIDDEN = -105; // % of its own width a sheet sits to the left (behind its option) while closed

// The + toggle and the cascade of options it reveals below it. Every
// visual knob (border, radius, colors, spacing, cascade indent, sheet
// size) is a CSS custom property at the top of PlusMenu.module.css.
// onLaunchMp3(track, origin)/onLaunchImg(file, origin) are called when a
// file is shot from the mp3/img sheet respectively.
// concise "what can I do here" blurb, pops out from the title card's right
// edge alongside the options — edit freely, it's just static copy. Typed
// out one line at a time (see the typewriter effect below), not a single
// paragraph, so it's a short list of lines rather than prose.
const ABOUT_LINES = [
    'find an img or mp3',
    'fill this page up with your ideas',
    'capture your space',
];
const TYPE_MS = 22;        // ms per character while a line is typing
const LINE_PAUSE_MS = 220; // pause after a line finishes before the next starts
const TYPE_START_DELAY = 150; // lets the panel's own fade/slide start first
const LINE_HIDDEN_Y = 14;  // px each line starts below its resting spot — fades/slides up into place as it starts typing

export default function PlusMenu({ onLaunchMp3, onLaunchImg }) {
    const rootRef = useRef(null);
    const aboutRef = useRef(null);
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
    // the about blurb's own typewriter state — how much of each line is
    // "typed" so far, and which line (if any) is actively typing right now
    // (drives the blinking cursor's position).
    const [typedLines, setTypedLines] = useState(() => ABOUT_LINES.map(() => ''));
    const [typingLine, setTypingLine] = useState(-1);
    const typingTimeouts = useRef([]);
    const lineRefs = useRef([]);

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
                // was back.out(1.4), which overshoots past y:0 and springs
                // back — a deliberate bounce. power2.out decelerates into
                // place with no overshoot at all, same duration/stagger.
                duration: instant ? 0 : 0.4, stagger: instant ? 0 : 0.06,
                ease: 'power2.out', overwrite: true,
            });
        } else {
            gsap.to(items, {
                autoAlpha: 0, y: HIDDEN_Y,
                duration: instant ? 0 : 0.18, stagger: instant ? 0 : { each: 0.03, from: 'end' },
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
                // was 0.6s/0.35s with power3's long easing tail — power2
                // gets there almost as smoothly in noticeably less time
                duration: instant ? 0 : isOpen ? 0.45 : 0.28,
                ease: isOpen ? 'power2.out' : 'power2.in',
                overwrite: true,
            });
        });
        firstRun.current = false;
    }, [sheet]);

    // flag <html> while the menu is out so the title card/scene can react
    // (enlarge / recede) from their own CSS — cleared on close and unmount
    useEffect(() => {
        const root = document.documentElement;
        if (open) root.setAttribute('data-options-open', '');
        else root.removeAttribute('data-options-open');
        return () => root.removeAttribute('data-options-open');
    }, [open]);

    // the about blurb pops out from the title card's right edge in step
    // with the options opening — same fade + slight slide-in used
    // elsewhere here, just on its own timeline since it isn't one of the
    // cascading [data-item]s.
    useEffect(() => {
        if (!aboutRef.current) return;
        const instant = firstRun.current || reduced();
        gsap.to(aboutRef.current, {
            autoAlpha: open ? 1 : 0,
            x: open ? 0 : -12,
            duration: instant ? 0 : 0.35,
            ease: open ? 'power2.out' : 'power2.in',
            overwrite: true,
        });
    }, [open]);

    // types the blurb out one line at a time, same "reveal in sequence" idea
    // as the options cascading in below the toggle — just character-by-
    // character instead of item-by-item. Re-types from scratch every time
    // the menu opens (mirrors the options, which also replay their cascade
    // on every open rather than only once).
    useEffect(() => {
        typingTimeouts.current.forEach(clearTimeout);
        typingTimeouts.current = [];

        if (!open) {
            setTypedLines(ABOUT_LINES.map(() => ''));
            setTypingLine(-1);
            gsap.set(lineRefs.current, { autoAlpha: 0, y: LINE_HIDDEN_Y });
            return;
        }

        if (firstRun.current || reduced()) {
            setTypedLines([...ABOUT_LINES]);
            setTypingLine(-1);
            gsap.set(lineRefs.current, { autoAlpha: 1, y: 0 });
            return;
        }

        setTypedLines(ABOUT_LINES.map(() => ''));
        gsap.set(lineRefs.current, { autoAlpha: 0, y: LINE_HIDDEN_Y });

        const typeLine = (lineIndex) => {
            if (lineIndex >= ABOUT_LINES.length) {
                setTypingLine(-1);
                return;
            }
            setTypingLine(lineIndex);
            // each line fades in and slides up into place right as it
            // starts typing, same fade + move used for the cascading
            // options, just bottom-to-top instead of top-to-bottom.
            const lineEl = lineRefs.current[lineIndex];
            if (lineEl) {
                gsap.to(lineEl, { autoAlpha: 1, y: 0, duration: 0.35, ease: 'power2.out', overwrite: true });
            }
            const text = ABOUT_LINES[lineIndex];
            let charIndex = 0;
            const step = () => {
                charIndex += 1;
                setTypedLines((prev) => {
                    const next = [...prev];
                    next[lineIndex] = text.slice(0, charIndex);
                    return next;
                });
                if (charIndex < text.length) {
                    typingTimeouts.current.push(setTimeout(step, TYPE_MS));
                } else {
                    typingTimeouts.current.push(setTimeout(() => typeLine(lineIndex + 1), LINE_PAUSE_MS));
                }
            };
            step();
        };

        typingTimeouts.current.push(setTimeout(() => typeLine(0), TYPE_START_DELAY));

        return () => {
            typingTimeouts.current.forEach(clearTimeout);
            typingTimeouts.current = [];
        };
    }, [open]);

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
                setSheet((s) => (s === opt.id ? null : opt.id));
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

    return (
        <>
        <div className={styles.menu} ref={rootRef} style={{ '--count': OPTIONS.length }}>
            <button
                type="button"
                className={styles.toggle}
                onClick={() => setOpen((o) => !o)}
                aria-expanded={open}
                aria-controls="plus-menu-list"
                aria-label={open ? 'close options' : 'open options'}
                data-open={open || undefined}
            >
                <img src="/optionButton.png" alt="" className={styles.toggleImg} />
            </button>

            <ul className={styles.list} id="plus-menu-list">
                {OPTIONS.map((opt, i) => {
                    const active = sheet === opt.id;
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
                                onClick={() => { setFocusedIndex(i); setSheet(active ? null : opt.id); }}
                                aria-expanded={active}
                                aria-controls={`plus-menu-sheet-${opt.id}`}
                            >
                                {opt.label}
                            </button>

                            <div className={styles.sheetWindow}>
                                <div
                                    className={styles.sheet}
                                    id={`plus-menu-sheet-${opt.id}`}
                                    data-sheet={opt.id}
                                >
                                    {/* no header bar here anymore (was a titlebar with the
                                        option's name + its own × close button) — each form
                                        already has its own Cancel button wired to closeSheet,
                                        so nothing was actually lost by taking it out */}
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
                        </li>
                    );
                })}
            </ul>
        </div>

        {/* pops out from the title card's right edge alongside the
            options (see the useEffect above) — a concise, always-the-
            same blurb, not part of the OPTIONS cascade above */}
        <div className={styles.about} ref={aboutRef} aria-hidden={!open}>
            {ABOUT_LINES.map((_, i) => (
                <div key={i} className={styles.aboutLine} ref={(el) => (lineRefs.current[i] = el)}>
                    {typedLines[i]}
                    {typingLine === i && <span className={styles.cursor} />}
                </div>
            ))}
            <div className={styles.aboutCredit}>press h to hide ui</div>
        </div>
        </>
    );
}
