import { useEffect, useRef, useState } from 'react';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import CaseDisc from './CaseDisc';
import LogoDisc from './LogoDisc';
import OptionsMenu from './OptionsMenu';
import PlusMenu from './PlusMenu';
import FloatingFiles from './FloatingFiles';
import FileWindow from './FileWindow';
import SideImage from './SideImage';
import Footer from '../Footer/Footer';
import styles from './Hero.module.css';

gsap.registerPlugin(ScrollTrigger);

// where the logo disc parks once it has come forward — same values as
// LogoDisc.jsx's own reduced-motion parked state
const restX = () => window.innerWidth * 0.15;
const restY = () => window.innerHeight * 0.08;

const MAX_FLOATING_FILES = 8;
const MAX_OPEN_WINDOWS = 25;
// how many diagonal steps the spawn-position cascade takes before looping
// back to the first spot — separate from MAX_OPEN_WINDOWS so raising that
// cap doesn't also march new windows' starting position further and
// further off the bottom/left of the screen with no wraparound
const CASCADE_SLOTS = 8;
const TITLEBAR_HEIGHT = 26; // matches .enlarged .titlebar's own fixed height in FileWindow.module.css

// Hero is now the orchestrator, not the owner, of the case/logo/options
// blocks — each of those is its own self-contained component
// (CaseDisc/LogoDisc/OptionsMenu/SideImage), with its own refs, its own
// perpetual tumble, its own reduced-motion handling. What's left here is
// only what genuinely has to stay centralized: the mouse-speed spin boost,
// which needs to hit-test against multiple components' elements to decide
// which one(s) to spin up, plus a plain scroll-velocity listener that
// boosts the logo's spin the same way. No more scroll-triggered pin/fly-
// apart at all — everything just sits in place; scrolling only ever makes
// the logo spin faster, it never moves anything or hijacks the page's own
// scroll distance. Reaches into the child components via the small
// imperative handles each one exposes (a couple of raw refs + a boostSpin
// function) rather than owning those elements directly.
export default function Hero() {
    const caseWrapRef = useRef(null);

    // .mp3/.img files launched from the + menu — one shared pool, kind-
    // tagged per file so FloatingFiles can render (and bounce) both
    // together, oldest dropped past the cap so the hero doesn't fill up.
    // In-memory only — they don't survive a reload.
    const [floatingFiles, setFloatingFiles] = useState([]);
    const launchFile = (kind, payload, origin) => {
        setFloatingFiles((files) => [...files, { ...payload, kind, origin, id: crypto.randomUUID() }].slice(-MAX_FLOATING_FILES));
    };
    const launchMp3 = (track, origin) => launchFile('mp3', track, origin);
    const launchImg = (file, origin) => launchFile('img', file, origin);

    // windows opened by clicking a floating file — a snapshot of that
    // file's own data (not a live reference into floatingFiles, which can
    // evict older entries past MAX_FLOATING_FILES while its window stays
    // open), positioned in a small cascade near the top-right corner so
    // several opened in a row don't land exactly on top of each other.
    // nextZRef is a plain incrementing counter, not React state — it only
    // ever needs to hand out the next-highest z-index, never trigger a
    // render on its own.
    const [openWindows, setOpenWindows] = useState([]);
    const nextZRef = useRef(10);

    const openFileWindow = (file, originRect) => {
        setOpenWindows((wins) => {
            if (wins.some((w) => w.id === file.id)) {
                // already open — an img file toggles its enlarged window
                // closed on a second click; an mp3 file still just comes
                // to front (closing mid-playback isn't what a re-click
                // on it usually means)
                if (file.kind === 'img') return wins.filter((w) => w.id !== file.id);
                return wins.map((w) => (w.id === file.id ? { ...w, z: nextZRef.current++ } : w));
            }
            const slot = wins.length % CASCADE_SLOTS;
            // every window opens at 2x its normal size — 2x the flat 280px
            // window width normally (see .enlarged in FileWindow.module.css)
            // — but for an mp3 with a real video behind it (embedWidth/
            // embedHeight, from trackLookup.js's oEmbed read) or an img file
            // (imgWidth/imgHeight, from ImgForm's own natural-size read), 2x
            // its own native width AND height instead, so the window opens
            // at the file's real aspect ratio rather than stretching/
            // shrinking it to the generic 560px. Scaled down from 2x (never
            // up) only as far as needed to keep both dimensions on screen —
            // width alone isn't enough to bound this: a tall/portrait image
            // could still be 2x its own (comfortably narrow) width yet
            // taller than the viewport, so height has to be checked too.
            // The viewport ceiling itself is deliberately well under the
            // full screen (60%, not "whatever fits minus a small margin") —
            // a real photo's own pixel size is almost always well past what
            // 2x can ever actually reach on any screen, so without a real
            // ceiling here the window would end up simply "as big as the
            // screen allows" for most photos, which reads as oversized
            // regardless of how the 2x math worked out.
            // FileWindow.module.css's .enlarged .bigImg then just does
            // width: 100%; height: auto with no CSS-side max-height of its
            // own, since this already lands at the right size.
            const VIEWPORT_FIT_RATIO = 0.6;
            const nativeWidth = file.embedWidth || file.imgWidth;
            const nativeHeight = file.embedHeight || file.imgHeight;
            let width;
            if (nativeWidth && nativeHeight) {
                const maxW = window.innerWidth * VIEWPORT_FIT_RATIO;
                const maxH = window.innerHeight * VIEWPORT_FIT_RATIO - TITLEBAR_HEIGHT;
                const scale = Math.min(2, maxW / nativeWidth, maxH / nativeHeight);
                width = nativeWidth * scale;
            } else {
                width = Math.min(nativeWidth ? nativeWidth * 2 : 560, window.innerWidth * VIEWPORT_FIT_RATIO);
            }
            const spawned = {
                ...file,
                x: Math.max(16, window.innerWidth - width - 32 - slot * 28),
                y: 96 + slot * 28,
                z: nextZRef.current++,
                // stored so FileWindow can actually apply it (was computed
                // here for the x placement above and then silently
                // dropped — the window's real rendered width came only
                // from .enlarged's own flat 560px in the CSS, never this
                // value, so embedWidth above never actually did anything)
                width,
                // the clicked floating file's own on-screen rect (plain
                // object — a DOMRect wouldn't survive being spread into
                // state cleanly) — FileWindow enlarges open from here
                origin: originRect && {
                    left: originRect.left, top: originRect.top, width: originRect.width, height: originRect.height,
                },
            };
            return [...wins, spawned].slice(-MAX_OPEN_WINDOWS);
        });
    };
    const closeFileWindow = (id) => setOpenWindows((wins) => wins.filter((w) => w.id !== id));
    const focusFileWindow = (id) => setOpenWindows((wins) => wins.map((w) => (w.id === id ? { ...w, z: nextZRef.current++ } : w)));

    const caseDiscRef = useRef(null);    // CaseDisc's imperative handle: { discRef, imgGroupRef, boostSpin }
    const logoDiscRef = useRef(null);    // LogoDisc's imperative handle: { groupRef, boostSpin }

    useEffect(() => {
        const ctx = gsap.context(() => {
            const mm = gsap.matchMedia();

            // ── full experience — the mouse features (parallax, mouse-
            // speed spin) and the scroll-speed spin boost only exist under
            // this branch, matching the original design: under reduced
            // motion there's none of that, and each child component
            // already falls back to its own static/slow-idle state on its
            // own (see CaseDisc/LogoDisc/OptionsMenu), so
            // Hero itself has nothing left to do in a 'reduce' branch.
            mm.add('(prefers-reduced-motion: no-preference)', () => {
                gsap.set(caseWrapRef.current, { transformPerspective: 900 });

                // ── mouse parallax — the case drifts gently toward the
                // cursor, measured from true viewport center (0,0 dead-
                // center, ±1 at the edges). Nothing moves until the page
                // actually receives a mousemove — the scene sits exactly
                // at its CSS-default centered position until then — but
                // from the very first one, the offset reflects the
                // cursor's real position relative to center, the same way
                // any standard cursor-parallax effect works, rather than
                // being calibrated off wherever the cursor happened to
                // start. (LogoDisc/CaseDisc's own tumbles handle
                // themselves; this is specifically caseWrapRef, which
                // stays Hero-owned since .caseWrap also lays out
                // OptionsMenu/SideImage/CaseDisc as a row.) quickTo only
                // ever touches x/y (translate) — never rotation/scale/
                // opacity — so it can't fight CaseDisc's own tumble or the
                // scroll timeline below for the same property.
                const PARALLAX_EASE = 'power2.out';
                const CASE_PARALLAX_DURATION = 0.9;
                const PARALLAX_RANGE = 8;
                const caseParallaxX = gsap.quickTo(caseWrapRef.current, 'x', { duration: CASE_PARALLAX_DURATION, ease: PARALLAX_EASE });
                const caseParallaxY = gsap.quickTo(caseWrapRef.current, 'y', { duration: CASE_PARALLAX_DURATION, ease: PARALLAX_EASE });

                // ── mouse-speed spin — sweeping the cursor across the
                // case or the ambient logo spins that element's own
                // tumble faster, scaled to how fast the cursor is
                // actually moving at that instant (not merely "is it
                // hovering"). This is the one piece that can't live
                // inside either child component individually: it needs to
                // hit-test against BOTH of them (via the raw element refs
                // each exposes) to decide which one(s) to boost, then
                // calls each one's own boostSpin — it never touches
                // either tumble directly. Hit-tested by hand via
                // getBoundingClientRect rather than native pointerenter/
                // leave on the elements themselves, because LogoDisc's
                // .ambientGroup/.ambient/.ambientFloat are deliberately
                // pointer-events: none (so the fixed, page-spanning
                // watermark logo never blocks clicks on real content once
                // it's parked there) — an element with pointer-events:
                // none can never be a hover/pointer target, so native
                // hover events would simply never fire on it. A plain
                // global mousemove + rect math isn't blocked by that, and
                // works identically for the case (which carries no such
                // restriction).
                const MOUSE_SPIN_SPEED_RANGE = 3000; // px/s of cursor travel that maps to max spin boost
                let lastPointerX = null;
                let lastPointerY = null;
                let lastPointerTime = null;
                function isPointInRect(x, y, el) {
                    if (!el) return false;
                    const rect = el.getBoundingClientRect();
                    return x >= rect.left && x <= rect.right && y >= rect.top && y <= rect.bottom;
                }
                function boostSpinFromMouseSpeed(e) {
                    if (lastPointerTime !== null) {
                        const dt = e.timeStamp - lastPointerTime;
                        if (dt > 0) {
                            const dist = Math.hypot(e.clientX - lastPointerX, e.clientY - lastPointerY);
                            const speed = (dist / dt) * 1000; // px/s
                            const boost = gsap.utils.clamp(0, 6, speed / MOUSE_SPIN_SPEED_RANGE);
                            if (boost > 0) {
                                if (isPointInRect(e.clientX, e.clientY, caseDiscRef.current?.discRef.current)) {
                                    caseDiscRef.current.boostSpin(boost);
                                }
                                if (isPointInRect(e.clientX, e.clientY, logoDiscRef.current?.groupRef.current)) {
                                    logoDiscRef.current.boostSpin(boost);
                                }
                            }
                        }
                    }
                    lastPointerX = e.clientX;
                    lastPointerY = e.clientY;
                    lastPointerTime = e.timeStamp;
                }

                function handleMouseMove(e) {
                    const offsetX = gsap.utils.clamp(-1, 1, (e.clientX - window.innerWidth / 2) / (window.innerWidth / 2));
                    const offsetY = gsap.utils.clamp(-1, 1, (e.clientY - window.innerHeight / 2) / (window.innerHeight / 2));
                    caseParallaxX(offsetX * PARALLAX_RANGE);
                    caseParallaxY(offsetY * PARALLAX_RANGE);
                    boostSpinFromMouseSpeed(e);
                }
                window.addEventListener('mousemove', handleMouseMove, { passive: true });

                // makes scrolling itself visibly spin the logo faster — a
                // plain native scroll listener computing velocity by hand
                // (no ScrollTrigger, no pin — that's the whole point: this
                // never moves or hijacks anything, it only ever reads how
                // fast the page is scrolling). Routes through the same
                // boostSpin LogoDisc exposes, so scroll and cursor speed
                // never fight over its tumble's timeScale directly; they
                // just both nudge the one booster LogoDisc owns internally.
                let lastScrollY = window.scrollY;
                let lastScrollTime = performance.now();
                function handleScroll() {
                    const now = performance.now();
                    const dt = now - lastScrollTime;
                    if (dt > 0 && logoDiscRef.current) {
                        const velocity = (window.scrollY - lastScrollY) / (dt / 1000); // px/s
                        logoDiscRef.current.boostSpin(gsap.utils.clamp(0, 6, Math.abs(velocity) / 500));
                    }
                    lastScrollY = window.scrollY;
                    lastScrollTime = now;
                }
                window.addEventListener('scroll', handleScroll, { passive: true });

                // ── scroll-scrubbed "disc comes forward": as the page scrolls
                // the case recedes into the depth and the ambient logo disc
                // eases forward out of it into its parked watermark spot.
                // Deliberately NOT pinned — no pin-spacer, so it adds no
                // extra scroll height; the hero just scrolls away normally
                // while the scrub plays over the first ~40% of a viewport.
                // Only touches scale/z/x/y/opacity; LogoDisc's and
                // CaseDisc's own tumbles keep owning rotation.
                const caseImgGroupEl = caseDiscRef.current?.imgGroupRef.current;
                const discEl = caseDiscRef.current?.discRef.current;
                const logoEl = logoDiscRef.current?.groupRef.current;
                let tl = null;
                if (caseImgGroupEl && discEl && logoEl) {
                    tl = gsap.timeline({
                        defaults: { ease: 'none' },
                        scrollTrigger: {
                            trigger: '#hero',
                            start: 'top top',
                            end: () => '+=' + Math.round(window.innerHeight * 0.4),
                            scrub: 0.4,
                            invalidateOnRefresh: true,
                        },
                    });
                    // x targets below are called once here, not passed as
                    // live function references — with invalidateOnRefresh
                    // above (needed so `end` keeps matching the viewport's
                    // actual height), GSAP re-invokes any *function-based*
                    // tween value on every refresh, including the resize
                    // ones the browser fires while you're dragging its
                    // window edge. That was recomputing these against the
                    // window's new size mid-drag and snapping the case disc
                    // and the logo to a different spot every time it fired.
                    // Calling them once bakes in a plain number instead, so
                    // only the scroll-driven scrub still moves them —
                    // resizing the window doesn't.
                    tl
                        .to(caseWrapRef.current, { scale: 0.85, z: -200, duration: 1 }, 0)
                        .to(caseImgGroupEl, { z: -260, scale: 0.7, duration: 1 }, 0)
                        .to(discEl, {
                            x: window.innerWidth * 0.12, rotation: 120, rotationY: 160, scale: 1.05, z: 20, duration: 1,
                        }, 0)
                        .to(logoEl, {
                            scale: 1.2, x: restX(), y: restY(), opacity: 0.16, z: 60, duration: 1,
                        }, 0);
                }

                return () => {
                    window.removeEventListener('mousemove', handleMouseMove);
                    window.removeEventListener('scroll', handleScroll);
                    if (tl) {
                        tl.scrollTrigger?.kill();
                        tl.kill();
                    }
                };
            });
        });

        return () => ctx.revert();
    }, []);

    return (
        <>
            {/* Footer — pinned to the bottom of the screen (position:
                fixed, see .fixedFooter in Hero.module.css) and stays
                visible through scrolling instead of only appearing once
                you reach the very bottom of the page. Sits outside
                .pinInner/the pinned scroll hierarchy so nothing in that
                hierarchy's own opacity/transform tweens can affect it. */}
            <div className={styles.fixedFooter}>
                <Footer />
            </div>

            <section className={styles.hero} id="hero">
                <div className={styles.pinInner}>

                    {/* the title card group — top-left. .titleCardGroup
                        shrinks to the image's own natural width (no
                        explicit width set on a position: absolute block),
                        and PlusMenu is positioned against THIS wrapper
                        (right: 0; top: 100%) rather than .pinInner
                        directly, so its right edge lines up with the
                        title card's right edge exactly, whatever the
                        image's actual rendered width turns out to be, with
                        the + toggle and its cascading options going
                        straight down directly underneath it. Fixed screen
                        position, not part of .caseWrap's layout or the
                        scroll fly-apart. */}
                    <div className={styles.titleCardGroup}>
                        <img src="/titlecard.png" alt="" className={styles.titleCardImg} />
                        <PlusMenu onLaunchMp3={launchMp3} onLaunchImg={launchImg} />
                    </div>

                    {/* .mp3/.img files shot in from the sheets — one shared
                        pool, floating and bouncing off the screen's edges
                        together. Clicking one opens its FileWindow below. */}
                    <FloatingFiles files={floatingFiles} onOpen={openFileWindow} />

                    <div className={styles.floatCase}>
                        <div className={styles.caseWrap} ref={caseWrapRef}>
                            <OptionsMenu logoRef={logoDiscRef} caseRef={caseDiscRef} />
                            <SideImage />
                            <CaseDisc ref={caseDiscRef} />
                        </div>
                    </div>
                </div>
            </section>

            <LogoDisc ref={logoDiscRef} />

            {/* draggable "open file" windows — outside .pinInner entirely
                (position: fixed in FileWindow.module.css), so they're never
                affected by the pinned section's own stacking/scroll. */}
            {openWindows.map((w) => (
                <FileWindow
                    key={w.id}
                    data={w}
                    x={w.x}
                    y={w.y}
                    width={w.width}
                    zIndex={w.z}
                    origin={w.origin}
                    onClose={() => closeFileWindow(w.id)}
                    onFocus={() => focusFileWindow(w.id)}
                />
            ))}
        </>
    );
}
