import { useEffect, useRef, useState } from 'react';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { Link } from 'react-router-dom';
import CaseDisc from './CaseDisc';
import LogoDisc from './LogoDisc';
import OptionsMenu from './OptionsMenu';
import SideImage from './SideImage';
import Footer from '../Footer/Footer';
import AmbientBackground from '../AmbientBackground/AmbientBackground';
import styles from './Hero.module.css';

gsap.registerPlugin(ScrollTrigger);

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
    const postHudRef = useRef(null); // separate popup near the + button, holds only the "post" link — the orbiting options block is untouched by the + entirely
    const [optionsOpen, setOptionsOpen] = useState(false);

    const caseDiscRef = useRef(null);    // CaseDisc's imperative handle: { discRef, imgGroupRef, boostSpin }
    const logoDiscRef = useRef(null);    // LogoDisc's imperative handle: { groupRef, boostSpin }
    const optionsMenuRef = useRef(null); // OptionsMenu's imperative handle: { elRef }

    useEffect(() => {
        const hero = heroRef.current;
        const pinEl = pinRef.current;
        if (!hero || !pinEl) return;

        const ctx = gsap.context(() => {
            // centers .postHud on its top/right anchor point — set here,
            // unconditionally (not inside the mm.add branch below), so
            // it's correct even under reduced motion, where the open/close
            // effect (further below) only ever touches opacity, never
            // xPercent/yPercent.
            if (postHudRef.current) gsap.set(postHudRef.current, { xPercent: -50, yPercent: -50 });

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
                        // smaller = faster/snappier.
                        end: () => '+=' + Math.round(window.innerHeight * 0.5),
                        // pin an inner element (not the <section> React
                        // owns) so the pin-spacer wrapper never fights
                        // React on unmount
                        pin: pinEl,
                        pinSpacing: true,
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
                const optionsEl = optionsMenuRef.current.elRef.current;
                const logoEl = logoDiscRef.current.groupRef.current;

                tl
                    // act 1 — the case opens and drops away in 3D. Opacity
                    // is faded ONLY here, on the outermost wrapper —
                    // caseImgGroupEl and discEl are both descendants of
                    // caseWrapRef, and nested opacities multiply. Fading
                    // opacity once at this level fades the whole case —
                    // front and back layers together — at the same
                    // visible rate, so the shadow layer stays through the
                    // full fly-apart instead of vanishing early.
                    .to(caseWrapRef.current, { scale: 0.72, z: -380, opacity: 0, duration: ACT1_DURATION }, 0)
                    .to(caseImgGroupEl, { z: -520, scale: 0.5, duration: ACT1_DURATION }, 0)
                    .to(discEl, { scale: 1.1, z: 30, rotationX: 160, rotationY: 160, duration: ACT1_DURATION }, 0)
                    .to(optionsEl, { x: 0, opacity: 0, duration: ACT1_DURATION }, 0)
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

    // ── + toggle — pressing the + reveals postHudRef only: a standalone
    // popup next to the + button holding just the "post" link, its own
    // separate HUD. The orbiting/rotating options block (OptionsMenu) is a
    // completely different, always-visible thing — the + doesn't touch it
    // at all, on purpose (it shouldn't hide/show along with a button
    // toggle it has nothing to do with). Kept as its own effect, separate
    // from the big intro effect above, since it just reacts to
    // optionsOpen rather than running once on mount. postHudRef stays
    // mounted the whole time (never conditionally rendered) so GSAP can
    // animate it in and out smoothly instead of popping abruptly;
    // pointer-events/aria-hidden track the open state so it's not
    // clickable or announced while closed.
    useEffect(() => {
        if (!postHudRef.current) return;
        if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
            gsap.set(postHudRef.current, { opacity: optionsOpen ? 1 : 0 });
            return;
        }
        if (optionsOpen) {
            gsap.to(postHudRef.current, {
                opacity: 1, y: 0, scale: 1, duration: 0.4, ease: 'back.out(1.7)',
            });
        } else {
            gsap.to(postHudRef.current, {
                opacity: 0, y: -10, scale: 0.9, duration: 0.25, ease: 'power2.in',
            });
        }
    }, [optionsOpen]);

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
                    {/* .pinInner's own background is a flat opaque color
                        (by design — see its comment above), which would
                        otherwise completely hide the site-wide ambient
                        layer behind this pinned, full-viewport section.
                        Rendered again here, in front of that flat color but
                        behind the real content, riding the isolation:
                        isolate stacking context .pinInner already sets up
                        for exactly this. */}
                    <AmbientBackground />

                    <div className={styles.floatCase}>
                        {/* no longer navigates directly — pressing it
                            toggles postHudRef, its own separate popup
                            right here next to the button, open/closed.
                            Doesn't touch OptionsMenu at all. data-open
                            drives the +/× rotation in CSS. */}
                        <button
                            type="button"
                            className={styles.shareFab}
                            onClick={() => setOptionsOpen((open) => !open)}
                            aria-expanded={optionsOpen}
                            aria-label={optionsOpen ? 'close create post' : 'create a post'}
                            data-open={optionsOpen || undefined}
                        >
                            +
                        </button>

                        {/* separate HUD, deliberately not nested inside
                            OptionsMenu — just the "post" link, popping out
                            right next to the + button. Stays mounted the
                            whole time so GSAP can animate it in/out
                            smoothly; pointer-events/aria-hidden track
                            optionsOpen so it's inert while closed. */}
                        <Link
                            to="/new"
                            className={`${styles.opt} ${styles.postHud}`}
                            ref={postHudRef}
                            style={{ pointerEvents: optionsOpen ? 'auto' : 'none' }}
                            aria-hidden={!optionsOpen}
                            tabIndex={optionsOpen ? 0 : -1}
                        >
                            post
                        </Link>

                        <div className={styles.caseWrap} ref={caseWrapRef}>
                            <OptionsMenu ref={optionsMenuRef} logoRef={logoDiscRef} />
                            <SideImage />
                            <CaseDisc ref={caseDiscRef} />
                        </div>
                    </div>
                </div>
            </section>

            <LogoDisc ref={logoDiscRef} />
        </>
    );
}
