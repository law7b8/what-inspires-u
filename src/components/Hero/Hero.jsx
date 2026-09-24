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
// only what genuinely has to stay centralized: the one shared, scrubbed
// (not pinned — adds no extra scroll height) scroll timeline that flies the
// disc out of the case, and brings the ambient logo forward in its place,
// and the mouse-speed spin boost, which needs to hit-test against multiple
// components' elements to decide which one(s) to spin up. Both reach into
// the child components via the small imperative handles each one exposes
// (a couple of raw refs + a boostSpin function) rather than owning those
// elements directly.
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

                // makes scrolling itself visibly spin the logo faster — fed
                // by the pinned ScrollTrigger's own velocity below (see
                // onUpdate), not a separate native listener: it's tied to
                // this same ScrollTrigger's own velocity so it stays
                // perfectly in step with the scrubbed timeline below.
                function boostSpinFromScroll(velocity) {
                    if (logoDiscRef.current) {
                        logoDiscRef.current.boostSpin(gsap.utils.clamp(0, 6, Math.abs(velocity) / 500));
                    }
                }

                // ── the disc fly-apart — NOT pinned (see the scrollTrigger
                // config below), so it adds no extra scroll height; it just
                // scrubs a two-act timeline over a short scroll window as
                // the hero scrolls away normally: the case shrinks, darkens
                // and recedes into the depth (act 1) while the CD itself
                // flies out toward the viewer, tumbling as it goes; then the
                // ambient logo disc eases forward out of that same depth
                // into its parked watermark spot (act 2). Only touches
                // scale/z/x/y/opacity; LogoDisc's and CaseDisc's own tumbles
                // keep owning rotation, except the fly-out spin below, which
                // is this timeline's own one-shot flourish.
                const caseImgGroupEl = caseDiscRef.current?.imgGroupRef.current;
                const discEl = caseDiscRef.current?.discRef.current;
                const logoEl = logoDiscRef.current?.groupRef.current;
                let tl = null;
                if (caseImgGroupEl && discEl && logoEl) {
                    // act timings, as fractions of the timeline below — named
                    // so act 1's length, act 2's start/length, and the total
                    // all stay obviously in sync instead of relying on magic
                    // numbers that happen to add up. ACT2_START/ACT2_DURATION
                    // are chosen so ACT2 finishes exactly at the timeline's
                    // own total duration: no dead scroll stretch after the
                    // logo lands where nothing is visibly changing.
                    // ACT2_DURATION — scroll end (below) stays fixed, so
                    // this is the one knob for act 2's speed: bigger value
                    // = more of the timeline's own local duration for the
                    // same fixed scroll distance = slower. Went 0.10 -> 0.20
                    // first (still too fast) -> 0.80 now, a real, obvious
                    // slowdown rather than an incremental one. Act 1 stays
                    // exactly 0.05 in local time regardless — it just ends
                    // up an even smaller slice of a bigger total, which
                    // reads as act 1 finishing quickly and act 2 then taking
                    // its time, rather than the two feeling like one
                    // continuous-speed motion.
                    const ACT1_DURATION = 0.05;
                    const ACT2_START = 0.0;
                    const ACT2_DURATION = 0.80;
                    const ACT2_END = ACT2_START + ACT2_DURATION;

                    // the disc's own fly-out spin — a numeric proxy (not
                    // GSAP's own scale/z/rotationX/rotationY properties on
                    // discEl directly) because the rotation needs to happen
                    // around a single diagonal axis running through the
                    // element's own top-left and bottom-right corners, which
                    // rotationX + rotationY together don't produce: those
                    // are two SEPARATE single-axis rotations, and composing
                    // them simultaneously isn't the same as one rotation
                    // around their diagonal (3D rotations don't combine that
                    // way). rotate3d(1, 1, 0, angle) — axis (1, 1, 0) in
                    // screen coordinates (x right, y down) is exactly that
                    // diagonal — isn't one of GSAP's own animatable
                    // properties, so onUpdate composes the full transform
                    // (translateZ + the diagonal spin + scale) by hand each
                    // tick instead. angle target (720°, two full turns) and
                    // duration match the previous rotationX/Y version
                    // exactly, so the fly-out reads at the same speed as
                    // before — only the axis changed.
                    const discFly = { scale: 1, z: 0, angle: 0 };

                    tl = gsap.timeline({
                        defaults: { ease: 'none' },
                        scrollTrigger: {
                            trigger: '#hero',
                            start: 'top top',
                            // NOT pinned — no pin-spacer, so this adds zero
                            // extra scroll height to the page (was pin:
                            // pinRef.current + pinSpacing: true, which
                            // reserved a chunk of blank scroll space for the
                            // hero to sit still in while this scrubbed;
                            // removed because that extra space was exactly
                            // what read as "the page got longer"). The hero
                            // just scrolls away normally while this plays
                            // out over a short window instead — end below is
                            // deliberately small (0.18 of a viewport, back to
                            // its original value — see the ACT2_DURATION
                            // comment above for why the slowdown lives there
                            // instead of here now) so the whole fly-apart
                            // resolves quickly relative to the page's own
                            // scroll distance.
                            end: () => '+=' + Math.round(window.innerHeight * 0.18),
                            scrub: 0.3,
                            invalidateOnRefresh: true,
                            // ties the disc's spin rate to how fast you're
                            // scrolling
                            onUpdate: (self) => boostSpinFromScroll(self.getVelocity()),
                        },
                    });

                    tl
                        // act 1 — the case opens and drops away in 3D.
                        // Opacity is faded ONLY here, on the outermost
                        // wrapper — caseImgGroupEl and discEl are both
                        // descendants of caseWrapRef, and nested opacities
                        // multiply. Fading opacity once at this level fades
                        // the whole case — front and back layers together —
                        // at the same visible rate. Floors at 0.15, not 0 —
                        // CaseDisc and SideImage (which have no opacity
                        // tween of their own, only what they inherit from
                        // this wrapper) stay faintly visible in their fully-
                        // receded pose instead of disappearing entirely.
                        // OptionsMenu/the title card aren't touched by this
                        // timeline — they're fixed, always-visible screen
                        // elements, not part of the case's own fly-apart.
                        .to(caseWrapRef.current, { scale: 0.72, z: -380, opacity: 0.15, duration: ACT1_DURATION }, 0)
                        .to(caseImgGroupEl, { z: -520, scale: 0.5, duration: ACT1_DURATION }, 0)
                        .to(discFly, {
                            scale: 1.1, z: 30, angle: 720, duration: ACT1_DURATION,
                            onUpdate: () => {
                                gsap.set(discEl, {
                                    transform: `translateZ(${discFly.z}px) rotate3d(1, 1, 0, ${discFly.angle}deg) scale(${discFly.scale})`,
                                });
                            },
                        }, 0)
                        // the ambient logo gets the same fly-out-and-fade
                        // treatment as the case above — shrinks, recedes,
                        // and fades to nothing right alongside it. Act 2
                        // below then brings it back from that vanished
                        // state to parked-watermark — a full re-emergence,
                        // the "coming forward out of the depths" counterpart
                        // to the case flying away. Rotation is deliberately
                        // left alone — LogoDisc's own tumble already owns
                        // rotationX/Y/Z on this element continuously; adding
                        // more rotation here would fight it for the same
                        // properties.
                        .to(logoEl, { scale: 0.4, opacity: 0, z: -380, duration: ACT1_DURATION }, 0)
                        // act 2 — the ambient logo eases into its parked
                        // position. z continues smoothly from the -380 act 1
                        // left it at, and animates back toward the viewer
                        // (60, past its resting z: 0) — the "coming forward"
                        // counterpart to the case flying away: the case
                        // recedes into the depth, the logo arrives out of
                        // it. restX()/restY() are called once (not passed as
                        // live function references) so only the scroll-
                        // driven scrub moves this — resizing the window
                        // doesn't also re-snap it to a new target mid-drag.
                        .to(logoEl, {
                            scale: 3, x: restX(), y: restY(), opacity: 0.16, z: 60, duration: ACT2_DURATION,
                        }, ACT2_START);

                    // sanity check for future edits to the constants above —
                    // if ACT2 no longer ends at the timeline's own duration,
                    // a dead scroll stretch creeps back in.
                    if (Math.abs(tl.duration() - ACT2_END) > 0.001) {
                        console.warn('Hero: ambient landing no longer matches the timeline\'s end — the fly-apart may end with dead scroll space.');
                    }
                }

                return () => {
                    window.removeEventListener('mousemove', handleMouseMove);
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

            <LogoDisc ref={logoDiscRef} caseRef={caseDiscRef} />

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
