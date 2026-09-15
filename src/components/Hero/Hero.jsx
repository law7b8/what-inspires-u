import { useEffect, useRef } from 'react';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { Link } from 'react-router-dom';
import styles from './Hero.module.css';

gsap.registerPlugin(ScrollTrigger);

export default function Hero() {
    const heroRef = useRef(null);
    const pinRef = useRef(null);
    const caseWrapRef = useRef(null);
    const caseImgGroupRef = useRef(null); // cd1.png front+back layers — the jewel case, flies away
    const discRef = useRef(null);      // case body wrapper (spine + case)
    const optionsRef = useRef(null);
    const tmp3oTextRef = useRef(null); // typed in on mount — see the typewriter effect below
    const titleTextRef = useRef(null); // "what inspires u?" — same typewriter loop, one plain span (no separate accent styling)
    const sideImageGroupRef = useRef(null);  // your inserted image — spins like the case/logo
    const sideImageShadowRef = useRef(null);  // separate element, spins on Y only, no z-offset
    const sideImageShadow2Ref = useRef(null); // a second one, same idea, own independent phase
    const hintRef = useRef(null);
    const ambientGroupRef = useRef(null);  // tempoLogo.png front+back layers — the disc that keeps spinning
    const ambientShadowRef = useRef(null); // soft shadow that orbits in sync with it
    const ambientParallaxRef = useRef(null); // cursor-drift wrapper around the shadow+group above

    useEffect(() => {
        const ambientGroup = ambientGroupRef.current;
        const ambientShadow = ambientShadowRef.current;
        const hero = heroRef.current;
        const pinEl = pinRef.current;
        if (!ambientGroup || !hero || !pinEl) return;
        let idleSpin = null;

        const ctx = gsap.context(() => {
            // where the disc parks once it becomes the background watermark
            const restX = () => window.innerWidth * 0.15;
            const restY = () => -window.innerHeight * -0.08;

            // tracks wherever the logo currently is (its live x/y/scale/opacity —
            // whether that's mid-scroll-bloom or parked as the background
            // watermark) and adds a small orbiting wobble driven by whatever
            // rotationX/rotationY is currently spinning it, so the shadow reads
            // as cast by that same tumble instead of sitting there inert.
            const SHADOW_ORBIT_X = 26;
            const SHADOW_ORBIT_Y = 16;
            function syncShadowToSpin() {
                if (!ambientShadow) return;
                const rx = gsap.getProperty(ambientGroup, 'rotationX') * Math.PI / 180;
                const ry = gsap.getProperty(ambientGroup, 'rotationY') * Math.PI / 180;
                const baseX = gsap.getProperty(ambientGroup, 'x');
                const baseY = gsap.getProperty(ambientGroup, 'y');
                const baseScale = gsap.getProperty(ambientGroup, 'scale');
                const baseOpacity = gsap.getProperty(ambientGroup, 'opacity');
                gsap.set(ambientShadow, {
                    x: baseX + Math.sin(ry) * SHADOW_ORBIT_X * baseScale,
                    y: baseY + Math.sin(rx) * SHADOW_ORBIT_Y * baseScale,
                    scale: baseScale * (0.85 + 0.15 * Math.cos(ry)),
                    opacity: baseOpacity * (0.35 + 0.15 * Math.cos(rx)),
                });
            }

            gsap.set(ambientGroup, { xPercent: -50, yPercent: -50, transformPerspective: 900 });
            if (ambientShadow) gsap.set(ambientShadow, { xPercent: -50, yPercent: -50, opacity: 0.3 });

            // ── typewriter loop for the options text — "tmp3o.com" types
            // in, holds, untypes, then "what inspires u?" does the same,
            // forever (repeat: -1). Runs regardless of the reduced-motion
            // branches below since it's not part of the scroll-hijack
            // experience — but it's still motion, so it's skipped in favor
            // of static finished text when the user has that preference
            // (an infinite loop is exactly the kind of thing reduced-motion
            // is meant to opt out of). aria-label on the <a>/<Link>
            // ancestors (in the JSX below) carries the real, complete text
            // at all times, so screen readers announce "tmp3o.com" / "what
            // inspires u?" once rather than replaying every type/untype
            // cycle as textContent gets rewritten.
            //
            // Duration is per-character (not a fixed duration per line), so
            // the longer title text still reads at the same typing *speed*
            // as the shorter tmp3o.com line instead of visibly rushing to
            // fit the same duration.
            const CHAR_TYPE_DURATION = 0.145;   // seconds per character while typing
            const CHAR_UNTYPE_DURATION = 0.245; // untyping reads better a little quicker
            const HOLD_DURATION = 1.6;          // pause once a line is fully typed
            const LINE_GAP = 0.35;              // pause on the empty state before the next line starts

            function typeInto(el, text, charDuration) {
                if (!el) return null;
                const proxy = { chars: 0 };
                return gsap.to(proxy, {
                    chars: text.length,
                    duration: text.length * charDuration,
                    ease: 'none',
                    onUpdate: () => { el.textContent = text.slice(0, Math.round(proxy.chars)); },
                });
            }
            function untypeFrom(el, text, charDuration) {
                if (!el) return null;
                const proxy = { chars: text.length };
                return gsap.to(proxy, {
                    chars: 0,
                    duration: text.length * charDuration,
                    ease: 'none',
                    onUpdate: () => { el.textContent = text.slice(0, Math.round(proxy.chars)); },
                });
            }

            if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
                if (tmp3oTextRef.current) tmp3oTextRef.current.textContent = 'tmp3o.com';
                if (titleTextRef.current) titleTextRef.current.textContent = '+archive.cd';
            } else {
                if (optionsRef.current) optionsRef.current.setAttribute('data-typing', '');
                gsap.timeline({ repeat: -1, delay: 0.4 })
                    .add(typeInto(tmp3oTextRef.current, 'tmp3o.com', CHAR_TYPE_DURATION))
                    .to({}, { duration: HOLD_DURATION })
                    .add(untypeFrom(tmp3oTextRef.current, 'tmp3o.com', CHAR_UNTYPE_DURATION))
                    .to({}, { duration: LINE_GAP })
                    .add(typeInto(titleTextRef.current, '+archive.cd', CHAR_TYPE_DURATION))
                    .to({}, { duration: HOLD_DURATION })
                    .add(untypeFrom(titleTextRef.current, '+archive.cd', CHAR_UNTYPE_DURATION))
                    .to({}, { duration: LINE_GAP });
            }

            const mm = gsap.matchMedia();

            // ── reduced motion: no scroll hijack, just a slow XYZ tumble ──
            mm.add('(prefers-reduced-motion: reduce)', () => {
                gsap.set(ambientGroup, { opacity: 0.12, scale: 2.15, x: restX(), y: restY() });
                idleSpin = gsap.to(ambientGroup, {
                    rotationX: '-=360', rotationY: '-=360', rotationZ: '-=360',
                    duration: 7, ease: 'none', repeat: -1,
                    onUpdate: syncShadowToSpin,
                });
                return () => idleSpin && idleSpin.kill();
            });

            // ── full experience ──
            mm.add('(prefers-reduced-motion: no-preference)', () => {
                gsap.set(caseWrapRef.current, { transformPerspective: 900 });
                gsap.set(caseImgGroupRef.current, { transformPerspective: 900 });
                gsap.set(sideImageGroupRef.current, { transformPerspective: 900 });
                gsap.set(sideImageShadowRef.current, { transformPerspective: 900 });
                gsap.set(sideImageShadow2Ref.current, { transformPerspective: 900 });
                gsap.set(ambientGroup, {
                    opacity: 0.85, scale: 1, rotation: 0, rotationX: 0, rotationY: 0, x: 0, y: 0, z: 0,
                });

                // the case's own idle tumble — runs the whole time, independent of
                // the CSS bob on the wrapper divs. caseWrap/caseImgGroup spin freely
                // on all three axes since the scroll timeline below never touches
                // their rotation (only scale/z/opacity); discRef only gets rotationZ
                // since the fly-off already owns its rotationX/rotationY.
                const caseTumble = gsap.timeline({ repeat: -1, defaults: { ease: 'none' } });
                caseTumble
                    .to(caseImgGroupRef.current, { rotationX: '+=360', rotationY: '+=360', rotationZ: '+=360', duration: 240 }, 0)
                    .to(discRef.current, { rotationZ: '+=360', duration: 360 }, 0);

                // the ambient logo's own forever tumble — same idea as caseTumble:
                // it spins continuously from mount, independent of scroll. The
                // scroll timeline below only ever touches its scale/z/x/y/opacity
                // (never rotation), so the two never fight over the same property.
                const ambientTumble = gsap.timeline({ repeat: -1, defaults: { ease: 'none' }, onUpdate: syncShadowToSpin });
                ambientTumble
                    .to(ambientGroup, { rotationX: '-=360', rotationY: '-=360', rotationZ: '+=360', duration: 70 }, 0);

                // the side image's own forever tumble — same idea again: spins
                // continuously from mount, nothing else ever touches its
                // rotation, so there's nothing for it to fight with.
                const sideImageTumble = gsap.timeline({ repeat: -1, defaults: { ease: 'none' } });
                sideImageTumble
                    .to(sideImageGroupRef.current, { rotationY: '+=360', duration: 900 }, 0)
                    .to(sideImageGroupRef.current, { rotationZ: '-=360', duration: 900 }, 0)
                    .to(sideImageGroupRef.current, { rotationX: '-=360', duration: 200 }, 0);

                // the shadow layer is a separate element now, not a child of
                // sideImageGroupRef (same reasoning as ambientShadow being a
                // sibling of ambientGroup, not nested inside it) — spinning it
                // the opposite way on Y only, at the same speed, needs its own
                // independent rotation rather than inheriting the front
                // layer's, which a nested child can't do (it would just
                // compose on top of whatever the parent is doing, not counter
                // it).
                const sideImageShadowTumble = gsap.timeline({ repeat: -1, defaults: { ease: 'none' } });
                sideImageShadowTumble
                    .to(sideImageShadowRef.current, { rotationY: '-=360', duration: 40 }, 0);
                sideImageShadowTumble.progress(0.25); // starts already halfway through its cycle, out of phase with the front layer instead of both beginning aligned at mount

                // a second shadow layer, same idea again — its own independent
                // tumble at a different phase again (0.6, vs. the first
                // shadow's 0.25) so the two shadows don't just sit stacked on
                // top of each other; between the front layer and both
                // shadows, all three are now out of phase with one another.
                const sideImageShadow2Tumble = gsap.timeline({ repeat: -1, defaults: { ease: 'none' } });
                sideImageShadow2Tumble
                    .to(sideImageShadow2Ref.current, { rotationY: '-=360', duration: 20 }, 0);
                sideImageShadow2Tumble.progress(0.6);

                // ── spin boosters — both perpetual tumbles (caseTumble,
                // ambientTumble) can be sped up temporarily by whatever's
                // currently driving them: scroll speed, or cursor speed while it
                // sweeps over the element (both further below). Each timeline
                // gets its own booster with its own independent decay-back-to-1
                // timer, so the two input sources never need to coordinate —
                // whichever fires most recently just nudges timeScale, and it
                // eases back to 1x a beat after that source goes quiet.
                function createSpinBooster(timeline) {
                    let decayTimer = null;
                    function boost(amount) {
                        gsap.killTweensOf(timeline);
                        timeline.timeScale(1 + amount);
                        clearTimeout(decayTimer);
                        decayTimer = setTimeout(() => {
                            gsap.to(timeline, { timeScale: 1, duration: 1.2, ease: 'power2.out' });
                        }, 120);
                    }
                    boost.cancel = () => clearTimeout(decayTimer);
                    return boost;
                }
                const boostAmbientSpin = createSpinBooster(ambientTumble);
                const boostCaseSpin = createSpinBooster(caseTumble);

                // ── mouse parallax — the case and the ambient disc/logo drift
                // gently toward the cursor, measured from true viewport center
                // (0,0 dead-center, ±1 at the edges). Nothing moves until the
                // page actually receives a mousemove — the scene sits exactly at
                // its CSS-default centered position until then — but from the
                // very first one, the offset reflects the cursor's real position
                // relative to center, the same way any standard cursor-parallax
                // effect works, rather than being calibrated off wherever the
                // cursor happened to start.
                //
                // quickTo gives each mousemove a smooth, eased tween instead of
                // snapping straight to the pointer, and it only ever touches x/y
                // (translate) — never rotation/scale/opacity — so it can't fight
                // caseTumble, ambientTumble, or the scroll timeline for the same
                // property on the same element. The ambient logo gets its own
                // wrapper (ambientParallaxRef) rather than being applied to
                // ambientGroup directly, since ambientGroup's x/y are already
                // driven by the scroll timeline (parking it as the background
                // watermark) — a separate wrapper lets the two offsets add
                // together in screen space instead of racing.
                const PARALLAX_EASE = 'power2.out';
                const CASE_PARALLAX_DURATION = 0.9;    // foreground case — heavier, slower to catch up
                const AMBIENT_PARALLAX_DURATION = 0.6; // background watermark — a touch snappier
                const PARALLAX_RANGE = 8;             // px of max drift at full cursor travel from center — shared by both

                const caseParallaxX = gsap.quickTo(caseWrapRef.current, 'x', { duration: CASE_PARALLAX_DURATION, ease: PARALLAX_EASE });
                const caseParallaxY = gsap.quickTo(caseWrapRef.current, 'y', { duration: CASE_PARALLAX_DURATION, ease: PARALLAX_EASE });
                const ambientParallaxX = gsap.quickTo(ambientParallaxRef.current, 'x', { duration: AMBIENT_PARALLAX_DURATION, ease: PARALLAX_EASE });
                const ambientParallaxY = gsap.quickTo(ambientParallaxRef.current, 'y', { duration: AMBIENT_PARALLAX_DURATION, ease: PARALLAX_EASE });

                // ── mouse-speed spin — sweeping the cursor across the case or
                // the ambient logo spins that element's own tumble faster,
                // scaled to how fast the cursor is actually moving at that
                // instant (not merely "is it hovering"). Hit-tested by hand via
                // getBoundingClientRect rather than native pointerenter/leave on
                // the elements themselves, because .ambientGroup/.ambient/
                // .ambientFloat are deliberately pointer-events: none (so the
                // fixed, page-spanning watermark logo never blocks clicks on
                // real content once it's parked there) — an element with
                // pointer-events: none can never be a hover/pointer target, so
                // native hover events would simply never fire on it. A plain
                // global mousemove + rect math isn't blocked by that, and works
                // identically for the case (which carries no such restriction).
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
                                if (isPointInRect(e.clientX, e.clientY, discRef.current)) boostCaseSpin(boost);
                                if (isPointInRect(e.clientX, e.clientY, ambientGroupRef.current)) boostAmbientSpin(boost);
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
                    ambientParallaxX(offsetX * PARALLAX_RANGE);
                    ambientParallaxY(offsetY * PARALLAX_RANGE);
                    boostSpinFromMouseSpeed(e);
                }
                window.addEventListener('mousemove', handleMouseMove, { passive: true });

                // makes scrolling itself visibly spin the disc faster — routes
                // through the same booster mouse-speed uses above, so scroll and
                // cursor speed never fight over ambientTumble's timeScale
                // directly; they just both nudge the one shared booster.
                function boostSpinFromScroll(velocity) {
                    boostAmbientSpin(gsap.utils.clamp(0, 6, Math.abs(velocity) / 500));
                }

                // hands the reveal off to the Header once the disc's scroll
                // animation is fully done — the ids are Header's own hooks for
                // this (see the comment in App.jsx). #header-logo is deliberately
                // NOT part of this handoff: it's a second, separate spinning disc
                // (logo.jpeg, its own CSS spin) that duplicated the Hero's own
                // tempo-logo watermark once revealed. The ambientGroup disc IS
                // the one that's supposed to carry through into the page below —
                // it's already position:fixed and keeps tumbling via ambientTumble
                // the whole time, so it doesn't need a separate reveal at all.
                // header-logo stays hidden at its default opacity: 0 (Header.jsx).
                const headerPopEls = ['header-title', 'header-tmp3o', 'header-share']
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

                // act timings, as fractions of the timeline below — named so act 1's
                // length, act 2's start/length, and the total all stay obviously in
                // sync instead of relying on magic numbers that happen to add up.
                // ACT2_START/ACT2_DURATION are chosen so ACT2 finishes exactly at
                // the timeline's own total duration: there's no extra runway of
                // scroll after the disc lands where nothing is visibly changing
                // (that dead stretch was the "have to scroll more to get it" gap).
                const ACT1_DURATION = 0.05;
                const ACT2_START = 0.0;       // small gap after ACT1, same as the original design
                const ACT2_DURATION = 0.10;
                const ACT2_END = ACT2_START + ACT2_DURATION; // = 0.10, the timeline's total duration

                const tl = gsap.timeline({
                    defaults: { ease: 'none' },
                    scrollTrigger: {
                        trigger: hero,
                        start: 'top top',
                        // ScrollTrigger always maps scroll progress 0→1 onto the
                        // timeline's own duration (ACT2_END, 0.10) no matter what
                        // physical distance is set here — so this distance and
                        // ACT2_END need to stay in proportion. This was still
                        // '0.8' from when the acts above were much longer
                        // (ACT2_END used to be ~0.47-0.88); now that they're
                        // 0.10 total, that same 0.8 stretched nearly the whole
                        // scroll into a "dead" runway with barely any visible
                        // motion per pixel before the header reveal finally
                        // fired at the very end — that was the "scroll down
                        // more to reveal them" gap. 0.15 restores roughly the
                        // same pace (tl-units per viewport-height) the acts
                        // above are actually tuned for.
                        end: () => '+=' + Math.round(window.innerHeight * 0.15),
                        // pin an inner element (not the <section> React owns) so the
                        // pin-spacer wrapper never fights React on unmount
                        pin: pinEl,
                        pinSpacing: true,
                        scrub: 0.3,
                        invalidateOnRefresh: true,
                        // once the user stops scrolling mid-transition, ease the
                        // rest of the way to whichever end (hero or page) is closer
                        snap: {
                            snapTo: [0, 1],
                            duration: { min: 0.1, max: 0.3 },
                            ease: 'power1.inOut',
                        },
                        // ties the disc's spin rate to how fast you're scrolling
                        onUpdate: (self) => boostSpinFromScroll(self.getVelocity()),
                    },
                });

                tl
                    // act 1 — the case opens and drops away in 3D. Opacity is
                    // faded ONLY here, on the outermost wrapper — caseImgGroupRef
                    // and discRef are both descendants of caseWrapRef, and nested
                    // opacities multiply. All three used to fade 1→0 independently
                    // over the same span, so the combined visible opacity crashed
                    // to near-zero roughly like (1-p)³ instead of a plain (1-p) —
                    // way faster than intended. The discCaseBack duplicate (the
                    // darker "shadow" layer, already dimmed by its own brightness
                    // filter) dropped below visibility first, reading as if it
                    // disappeared on its own while the brighter front layer was
                    // still faintly there. Fading opacity once at this level fades
                    // the whole case — front and back layers together — at the
                    // same visible rate, so the shadow layer stays through the
                    // full fly-apart instead of vanishing early.
                    .to(caseWrapRef.current, { scale: 0.72, z: -380, opacity: 0, duration: ACT1_DURATION }, 0)
                    .to(caseImgGroupRef.current, { z: -520, scale: 0.5, duration: ACT1_DURATION }, 0)
                    // scale/z toned down (was 1.35/240 — ballooned into an
                    // unrecognizable close-up under perspective).
                    .to(discRef.current, { scale: 1.1, z: 30, rotationX: 160, rotationY: 160, duration: ACT1_DURATION }, 0)
                    .to(optionsRef.current, { x: 0, opacity: 0, duration: ACT1_DURATION}, 0)
                    .to(hintRef.current, { opacity: 0, duration: 0.08 }, 0)
                    // the ambient logo gets the same real-depth (z) treatment the
                    // case gets above, mirrored: while the case recedes away from
                    // the viewer (z going more negative), the logo also drifts back
                    // slightly here — a companion depth cue, not a fly-off, so it
                    // stays subtle and the logo never leaves view. Rotation is
                    // deliberately left alone — ambientTumble already owns
                    // rotationX/Y/Z on this element continuously (see above); adding
                    // more rotation here would fight it for the same properties.
                    .to(ambientGroup, { z: -180, duration: ACT1_DURATION }, 0)
                    // act 2 — the ambient logo eases into its parked position. Its
                    // onComplete/onReverseComplete — not the ScrollTrigger's own
                    // onLeave/onEnterBack — are what reveal/hide the header's
                    // tmp3o.com + WHAT INSPIRES U. onLeave fires off the *raw*
                    // scroll position, which (with scrub smoothing lag) can land
                    // well before or after this tween has actually finished
                    // animating; tying the reveal to this tween's own completion
                    // means the header always pops in at the exact moment the disc
                    // visually finishes arriving, never before or after.
                    // scale capped at 1.5 (was 2.15) — big enough to read as parked
                    // in the background, not so big it blows past legibility.
                    // z here continues smoothly from the -180 the tween above left
                    // it at, and animates back toward the viewer (60, past its
                    // resting z:0) — the "coming forward" counterpart to the case
                    // flying away: the case recedes into the depth, the logo arrives
                    // out of it. Plain .to() (no explicit "from"), so there's no
                    // jump — it just continues from wherever act 1's tween left z.
                    .to(ambientGroup, {
                        scale: 1.2, x: restX, y: restY, opacity: 0.16, z: 60, duration: ACT2_DURATION,
                        onComplete: popInHeader,
                        onReverseComplete: hideHeaderAgain,
                    }, ACT2_START);

                // sanity check for future edits to the constants above — if ACT2
                // no longer ends at the timeline's own duration, a dead scroll
                // stretch (or a premature reveal) creeps back in.
                if (Math.abs(tl.duration() - ACT2_END) > 0.001) {
                    console.warn('Hero: ambient landing no longer matches the timeline\'s end — header reveal may drift out of sync with scroll again.');
                }

                return () => {
                    boostAmbientSpin.cancel();
                    boostCaseSpin.cancel();
                    window.removeEventListener('mousemove', handleMouseMove);
                    caseTumble.kill();
                    ambientTumble.kill();
                    sideImageTumble.kill();
                    sideImageShadowTumble.kill();
                    sideImageShadow2Tumble.kill();
                    // don't leave the Header's own elements stuck invisible if
                    // Hero unmounts (e.g. navigating away) before the handoff fired
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
            <section className={styles.hero} id="hero" ref={heroRef}>
              <div className={styles.pinInner} ref={pinRef}>

                <div className={styles.floatCase}>
                  <div className={styles.caseWrap} ref={caseWrapRef}>

                    {/* options — left side. Text is typed in on mount (see
                        the typewriter effect near the top of the effect
                        above) — aria-label carries the real, complete text
                        so screen readers get it immediately rather than the
                        animated fragments. */}
                    <div className={styles.options} ref={optionsRef}>
                        <a
                            href="https://tmp3o.com/"
                            target="_blank"
                            rel="noopener noreferrer"
                            className={styles.topbarLink}
                            aria-label="tmp3o.com"
                            ref={tmp3oTextRef}
                        />

                        <Link to="/" className={styles.titleLink} aria-label="what inspires u?">
                            <h1 className={styles.title}>
                                <span ref={titleTextRef} /><span className={styles.typingCursor} aria-hidden="true" />
                            </h1>
                        </Link>
                    </div>

                    {/* side image — right side, mirroring .options on the left
                        (also balances the composition, since options alone
                        had nothing on the right side to weigh against it).
                        Swap the src below for your own image — .sideImage's
                        brightness is a CSS variable (--side-image-brightness,
                        default 1) you can override per-use via an inline
                        style, e.g. style={{ '--side-image-brightness': 1.3 }}
                        on this wrapper div, or just edit the default in
                        Hero.module.css. Decorative, so both are aria-hidden. */}
                    <div className={`${styles.sideImageGroup} ${styles.sideImageShadow}`} ref={sideImageShadowRef} aria-hidden="true">
                        <img src="/skully.png" className={`${styles.sideImage} ${styles.sideImageShadowImg}`} alt="" />
                    </div>
                    <div className={`${styles.sideImageGroup} ${styles.sideImageShadow}`} ref={sideImageShadow2Ref} aria-hidden="true">
                        <img src="/skully.png" className={`${styles.sideImage} ${styles.sideImageShadowImg}`} alt="" />
                    </div>
                    <div className={styles.sideImageGroup} ref={sideImageGroupRef} aria-hidden="true">
                        <img src="/skully.png" className={styles.sideImage} alt="" />
                    </div>

                    {/* cd case body */}
                    <div className={styles.caseBody}>
                        <div className={styles.floatDisc}>
                          <div className={styles.discSlot}>
                              <div className={styles.disc} ref={discRef}>
                                  {/* cd spine */}
                                  <div className={styles.spine}>
                                      <span className={styles.spineText}></span>
                                  </div>
                                  {/* front + back layers give the case real Z-depth
                                      instead of a flat drop-shadow, so it holds up
                                      as it tumbles in 3D — see .discCaseGroup */}
                                  <div className={styles.discCaseGroup} ref={caseImgGroupRef}>
                                      <img
                                          src="/cd1.png"
                                          className={styles.discCase}
                                          alt=""
                                          aria-hidden="true"
                                      />
                                      <img
                                          src="/cd1.png"
                                          className={`${styles.discCase} ${styles.discCaseBack}`}
                                          alt=""
                                          aria-hidden="true"
                                      />
                                  </div>
                              </div>
                          </div>
                        </div>
                        {/* soft ps3-style contact shadow, pulses with .floatDisc */}
                        <div className={styles.caseShadow} />
                    </div>

                  </div>
                </div>

              </div>
            </section>

            {/* the disc: sits in the case during the intro, then keeps spinning
                behind the page as a faint watermark. Fixed positioning lives on
                the wrapper so it can bob independently of GSAP's transforms
                on the group below. */}
            <div className={styles.ambientFloat}>
                {/* cursor-drift wrapper — see the mouse parallax block in the
                    effect above. Kept separate from .ambientGroup so this
                    translate and the scroll timeline's own x/y on the group
                    add together instead of fighting over the same property. */}
                <div className={styles.ambientParallax} ref={ambientParallaxRef}>
                    {/* orbits in sync with the logo's own spin — see ambientTumble's
                        onUpdate in the effect above */}
                    <div className={styles.ambientShadow} ref={ambientShadowRef} />
                    {/* front + back layers, same real-depth approach as the case's
                        discCaseGroup — see .ambientGroup */}
                    <div className={styles.ambientGroup} ref={ambientGroupRef}>
                        <img
                            src="/tempoLogo.png"
                            className={styles.ambient}
                            alt=""
                            aria-hidden="true"
                        />
                        <img
                            src="/tempoLogo.png"
                            className={`${styles.ambient} ${styles.ambientBack}`}
                            alt=""
                            aria-hidden="true"
                        />
                    </div>
                </div>
            </div>
        </>
    );
}
