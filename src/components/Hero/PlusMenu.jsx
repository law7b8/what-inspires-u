import { useEffect, useRef, useState } from 'react';
import { gsap } from 'gsap';
import PostForm from '../PostForm/PostForm';
import Mp3Form from '../Mp3Form/Mp3Form';
import styles from './PlusMenu.module.css';

// Edit this list to add/remove/rename options. Each option slides its own
// fill-out sheet out from behind itself; only one sheet is open at a time.
const OPTIONS = [
    { id: 'post-img', label: 'post img' },
    { id: 'post-mp3', label: 'post mp3' },
];

const HIDDEN_X = -28;      // px each option starts offset to the left while cascading in
const SHEET_HIDDEN = -105; // % of its own width a sheet sits to the left (behind its option) while closed

// The + toggle and the cascade of options it reveals down the left side.
// Every visual knob (border, radius, colors, spacing, cascade indent, sheet
// size) is a CSS custom property at the top of PlusMenu.module.css.
// onLaunchMp3(track, origin) is called when a file is shot from the mp3 sheet.
export default function PlusMenu({ onLaunchMp3 }) {
    const rootRef = useRef(null);
    const firstRun = useRef(true);
    const [open, setOpen] = useState(false);
    const [sheet, setSheet] = useState(null); // id of the open sheet, or null

    const reduced = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    // cascade — options fade/slide in one after another; closing collapses
    // them bottom-up and tucks the sheet away with them.
    useEffect(() => {
        const items = rootRef.current.querySelectorAll('[data-item]');
        const instant = firstRun.current || reduced();
        if (open) {
            gsap.to(items, {
                autoAlpha: 1, x: 0,
                duration: instant ? 0 : 0.5, stagger: instant ? 0 : 0.08,
                ease: 'back.out(1.6)', overwrite: true,
            });
        } else {
            gsap.to(items, {
                autoAlpha: 0, x: HIDDEN_X,
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

    // closing the menu closes the sheet too
    useEffect(() => {
        if (!open) setSheet(null);
    }, [open]);

    useEffect(() => {
        if (!open) return;
        const onKey = (e) => {
            if (e.key !== 'Escape') return;
            if (sheet) setSheet(null);
            else setOpen(false);
        };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [open, sheet]);

    const closeSheet = () => setSheet(null);

    const handleLaunchMp3 = (track, origin) => {
        onLaunchMp3?.(track, origin);
        closeSheet();
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
                                onClick={() => setSheet(active ? null : opt.id)}
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
                                            <PostForm className={styles.sheetForm} onCancel={closeSheet} />
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
    );
}
