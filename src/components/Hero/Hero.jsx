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

const MAX_FLOATING_FILES = 8;
const MAX_OPEN_WINDOWS = 4;

// where the disc parks once it becomes the background watermark — also
// duplicated (as a trivial one-liner) in LogoDisc.jsx, which needs the
// same values for its own reduced-motion parked state.
const restX = () => window.innerWidth * 0.15;
const restY = () => -window.innerHeight * -0.08;

// Hero is now the orchestrator, not the owner, of the case/logo/options
// blocks — each of those is its own self-contained component
// (CaseDisc/LogoDisc/OptionsMenu/SideImage), with its own refs, its own
// perpetual tumble, its own reduced-motion handling. What's left here is
// only what genuinely has to stay centralized: the one shared scroll
// timeline that flies all three apart together in the same scroll-scrubbed
// beat, and the mouse-speed spin boost, which needs to hit-test against
// multiple components' elements to decide which one(s) to spin up. Both
// reach into the child components via the small imperative handles each
// one exposes (a couple of raw refs + a boostSpin function) rather than
// owning those elements directly.
export default function Hero() {
    const heroRef = useRef(null);
    const pinRef = useRef(null);
    const caseWrapRef = useRef(null);
    const hintRef = useRef(null);

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

    const openFileWindow = (file) => {
        setOpenWindows((wins) => {
            if (wins.some((w) => w.id === file.id)) {
                // already open — bring it to front instead of duplicating
                return wins.map((w) => (w.id === file.id ? { ...w, z: nextZRef.current++ } : w));
            }
            const slot = wins.length % MAX_OPEN_WINDOWS;
            const spawned = {
                ...file,
                x: window.innerWidth - 312 - slot * 28,
                y: 96 + slot * 28,
                z: nextZRef.current++,
            };
            return [...wins, spawned].slice(-MAX_OPEN_WINDOWS);
        });
    };
    const closeFileWindow = (id) => setOpenWindows((wins) => wins.filter((w) => w.id !== id));
    const focusFileWindow = (id) => setOpenWindows((wins) => wins.map((w) => (w.id === id ? { ...w, z: nextZRef.current++ } : w)));

    const caseDiscRef = useRef(null);    // CaseDisc's imperative handle: { discRef, imgGroupRef, boostSpin }
    const logoDiscRef = useRef(null);    // LogoDisc's imperative handle: { groupRef, boostSpin }

    useEffect(() => {
        const hero = heroRef.current;
        const pinEl = pinRef.current;
        if (!hero || !pinEl) return;

        const ctx = gsap.context(() => {
            const mm = gsap.matchMedia();

            // ── full experience — the pin/scroll-hijack, the mouse
            // features, and the header handoff only ever exist under this
            // branch, matching the original design: under reduced motion
            // there's no scroll-triggered fly-apart at all, and each child
            // component already falls back to its own static/slow-idle
            // state on its own (see CaseDisc/LogoDisc/OptionsMenu), so
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

                // makes scrolling itself visibly spin the logo faster —
                // routes through the same boostSpin LogoDisc exposes, so
                // scroll and cursor speed never fight over its tumble's
                // timeScale directly; they just both nudge the one
                // booster LogoDisc owns internally.
                function boostSpinFromScroll(velocity) {
                    if (logoDiscRef.current) {
                        logoDiscRef.current.boostSpin(gsap.utils.clamp(0, 6, Math.abs(velocity) / 500));
                    }
                }

                // hands the reveal off to the Header once the disc's
                // scroll animation is fully done — the ids are Header's
                // own hooks for this (see the comment in App.jsx).
                // #header-logo is deliberately NOT part of this handoff:
                // it's a second, separate spinning disc (logo.jpeg, its
                // own CSS spin) that duplicated the Hero's own tempo-logo
                // watermark once revealed. LogoDisc's own disc IS the one
                // that's supposed to carry through into the page below —
                // it's already position:fixed and keeps tumbling the
                // whole time, so it doesn't need a separate reveal at
                // all. header-logo stays hidden at its default opacity: 0
                // (Header.jsx). "header-share" (the + button) used to be
                // part of this group too, but it's now its own
                // persistent, always-visible fixed button rendered in
                // Hero itself (see .shareFab below) rather than something
                // that waits for the pop-in reveal.
                const headerPopEls = ['header-title', 'header-tmp3o']
                    .map((id) => document.getElementById(id))
                    .filter(Boolean);

                if (headerPopEls.length) {
                    gsap.set(headerPopEls, { opacity: 0, scale: 0.85, transformOrigin: '50% 50%' });
                }

                function popInHeader() {
                    if (headerPopEls.length) {
                        gsap.to(headerPopEls, {
                            opacity: 1, scale: 1, duration: 0.45, ease: 'back.out(1.8)', stagger: 0.05,
                        });
                    }
                }
                function hideHeaderAgain() {
                    if (headerPopEls.length) gsap.set(headerPopEls, { opacity: 0, scale: 0.85 });
                }

                // act timings, as fractions of the timeline below — named
                // so act 1's length, act 2's start/length, and the total
                // all stay obviously in sync instead of relying on magic
                // numbers that happen to add up. ACT2_START/ACT2_DURATION
                // are chosen so ACT2 finishes exactly at the timeline's
                // own total duration: there's no extra runway of scroll
                // after the disc lands where nothing is visibly changing
                // (that dead stretch was the "have to scroll more to get
                // it" gap).
                const ACT1_DURATION = 0.05;
                const ACT2_START = 0.0;
                const ACT2_DURATION = 0.10;
                const ACT2_END = ACT2_START + ACT2_DURATION;

                const tl = gsap.timeline({
                    defaults: { ease: 'none' },
                    scrollTrigger: {
                        trigger: hero,
                        start: 'top top',
                        // ScrollTrigger always maps scroll progress 0→1
                        // onto the timeline's own duration (ACT2_END) no
                        // matter what physical distance is set here — so
                        // bigger number here = less visual change per
                        // pixel scrolled = slower, more gradual feel;
                        // smaller = faster/snappier. This is also literally
                        // how much blank scroll space (the pin-spacer) sits
                        // between the Hero unpinning and the real page
                        // content starting — was 0.5 (half a viewport),
                        // which read as leftover dead space once the
                        // header/options had already popped in.
                        end: () => '+=' + Math.round(window.innerHeight * 0.3),
                        // pin an inner element (not the <section> React
                        // owns) so the pin-spacer wrapper never fights
                        // React on unmount
                        pin: pinEl,
                        pinSpacing: true,
                        // ScrollTrigger's default pin technique in modern
                        // browsers applies a CSS transform to the pinned
                        // element rather than position: fixed — but a
                        // transform on an ancestor becomes the containing
                        // block for any position: fixed descendant (CSS
                        // spec behavior), which was trapping FloatingFiles'
                        // .layer (position: fixed, meant to span the true
                        // viewport) inside pinEl's own narrower box the
                        // moment pinning kicked in. Forcing the fixed
                        // technique here avoids introducing that transform
                        // at all.
                        pinType: 'fixed',
                        scrub: 0.3,
                        invalidateOnRefresh: true,
                        // once the user stops scrolling mid-transition,
                        // ease the rest of the way to whichever end (hero
                        // or page) is closer
                        snap: {
                            snapTo: [0, 1],
                            duration: { min: 0.1, max: 0.3 },
                            ease: 'power1.inOut',
                        },
                        // ties the disc's spin rate to how fast you're
                        // scrolling
                        onUpdate: (self) => boostSpinFromScroll(self.getVelocity()),
                    },
                });

                const caseImgGroupEl = caseDiscRef.current.imgGroupRef.current;
                const discEl = caseDiscRef.current.discRef.current;
                const logoEl = logoDiscRef.current.groupRef.current;

                tl
                    // act 1 — the case opens and drops away in 3D. Opacity
                    // is faded ONLY here, on the outermost wrapper —
                    // caseImgGroupEl and discEl are both descendants of
                    // caseWrapRef, and nested opacities multiply. Fading
                    // opacity once at this level fades the whole case —
                    // front and back layers together — at the same
                    // visible rate, so the shadow layer stays through the
                    // full fly-apart instead of vanishing early. Floors at
                    // 0.15, not 0 — CaseDisc and SideImage (which have no
                    // opacity tween of their own, only what they inherit
                    // from this wrapper) stay faintly visible in their
                    // fully-receded pose instead of disappearing entirely.
                    // OptionsMenu (the title card) isn't touched by this
                    // timeline at all anymore — it's now a fixed, always-
                    // visible screen element like the + toggle, not part
                    // of the case's own fly-apart.
                    .to(caseWrapRef.current, { scale: 0.72, z: -380, opacity: 0.15, duration: ACT1_DURATION }, 0)
                    .to(caseImgGroupEl, { z: -520, scale: 0.5, duration: ACT1_DURATION }, 0)
                    .to(discEl, { scale: 1.1, z: 30, rotationX: 160, rotationY: 160, duration: ACT1_DURATION }, 0)
                    .to(hintRef.current, { opacity: 0, duration: 0.08 }, 0)
                    // the ambient logo gets the same fly-out-and-fade
                    // treatment as the case above — shrinks, recedes, and
                    // fades to nothing right alongside it. Act 2 below
                    // then brings it back from that vanished state to
                    // parked-watermark — a full re-emergence, the "coming
                    // forward out of the depths" counterpart to the case
                    // flying away. Rotation is deliberately left alone —
                    // LogoDisc's own tumble already owns rotationX/Y/Z on
                    // this element continuously; adding more rotation
                    // here would fight it for the same properties.
                    .to(logoEl, { scale: 0.4, opacity: 0, z: -380, duration: ACT1_DURATION }, 0)
                    // act 2 — the ambient logo eases into its parked
                    // position. Its onComplete/onReverseComplete — not
                    // ScrollTrigger's own onLeave/onEnterBack — are what
                    // reveal/hide the header's tmp3o.com + WHAT INSPIRES
                    // U. onLeave fires off the *raw* scroll position,
                    // which (with scrub smoothing lag) can land well
                    // before or after this tween has actually finished
                    // animating; tying the reveal to this tween's own
                    // completion means the header always pops in at the
                    // exact moment the disc visually finishes arriving.
                    // z here continues smoothly from the -380 the tween
                    // above left it at, and animates back toward the
                    // viewer (60, past its resting z: 0) — the "coming
                    // forward" counterpart to the case flying away: the
                    // case recedes into the depth, the logo arrives out
                    // of it. Plain .to() (no explicit "from"), so there's
                    // no jump — it just continues from wherever act 1's
                    // tween left z.
                    .to(logoEl, {
                        scale: 1.2, x: restX, y: restY, opacity: 0.16, z: 60, duration: ACT2_DURATION,
                        onComplete: popInHeader,
                        onReverseComplete: hideHeaderAgain,
                    }, ACT2_START);

                // sanity check for future edits to the constants above —
                // if ACT2 no longer ends at the timeline's own duration, a
                // dead scroll stretch (or a premature reveal) creeps back
                // in.
                if (Math.abs(tl.duration() - ACT2_END) > 0.001) {
                    console.warn('Hero: ambient landing no longer matches the timeline\'s end — header reveal may drift out of sync with scroll again.');
                }

                return () => {
                    window.removeEventListener('mousemove', handleMouseMove);
                    // don't leave the Header's own elements stuck
                    // invisible if Hero unmounts (e.g. navigating away)
                    // before the handoff fired
                    if (headerPopEls.length) gsap.set(headerPopEls, { opacity: 1, scale: 1 });
                };
            });
        }, hero);

        // make sure ScrollTrigger measured the pin after layout/fonts settle
        const refresh = setTimeout(() => ScrollTrigger.refresh(), 200);

        return () => {
            clearTimeout(refresh);
            ctx.revert();
        };
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

            <section className={styles.hero} id="hero" ref={heroRef}>
                <div className={styles.pinInner} ref={pinRef}>

                    {/* + toggle, its cascading options down the left side,
                        and the post-img/post-mp3 fill-out sheets — all
                        self-contained in PlusMenu. Deliberately independent
                        of OptionsMenu (the orbiting text block). */}
                    <PlusMenu onLaunchMp3={launchMp3} onLaunchImg={launchImg} />

                    {/* the title card image — top-left, above the + toggle.
                        Fixed screen position, same "hovering" approach as
                        PlusMenu — not part of .caseWrap's layout or the
                        scroll fly-apart. Lower z-index than PlusMenu's menu
                        (see Hero.module.css) so the toggle always paints on
                        top if the two ever overlap. */}
                    <img src="/titlecard.png" alt="" className={styles.titleCardImg} />

                    {/* .mp3/.img files shot in from the sheets — one shared
                        pool, floating and bouncing off the screen's edges
                        together. Clicking one opens its FileWindow below. */}
                    <FloatingFiles files={floatingFiles} onOpen={openFileWindow} />

                    <div className={styles.floatCase}>
                        <div className={styles.caseWrap} ref={caseWrapRef}>
                            <OptionsMenu logoRef={logoDiscRef} />
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
                    zIndex={w.z}
                    onClose={() => closeFileWindow(w.id)}
                    onFocus={() => focusFileWindow(w.id)}
                />
            ))}
        </>
    );
}
