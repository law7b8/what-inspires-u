import { forwardRef, useEffect, useImperativeHandle, useRef } from 'react';
import { gsap } from 'gsap';
import { createSpinBooster } from './spinBooster';
import { LOGO_SPIN, createTumble } from './discSpin';
import styles from './LogoDisc.module.css';

// where the disc parks once it becomes the background watermark — also
// duplicated (as a trivial one-liner) in Hero.jsx, which needs the same
// values for its Act 2 scroll tween target.
const restX = () => window.innerWidth * 0.15;
const restY = () => -window.innerHeight * -0.08;

// The tempoLogo "disc" — front+back layers with real Z-depth, its own
// perpetual 3D tumble, its own cursor-parallax drift, and a soft glow
// shadow that orbits in sync with whatever rotation is currently spinning
// it. Self-contained like SideImage/CaseDisc, but still a target of
// Hero's shared scroll timeline (the fly-out-and-fade + landing) and the
// shared mouse-speed spin boost, plus the options-orbit effect needs its
// live on-screen position — all three genuinely need to stay orchestrated
// from Hero, so this exposes exactly what's needed via useImperativeHandle:
// the raw group ref the scroll timeline animates directly and reads the
// position of, and a boostSpin(amount) function for the mouse-speed
// feature to call into.
const LogoDisc = forwardRef(function LogoDisc({ caseRef } = {}, ref) {
    const ambientGroupRef = useRef(null);
    const ambientShadowRef = useRef(null);
    const ambientParallaxRef = useRef(null);
    const boosterRef = useRef(null);

    useImperativeHandle(ref, () => ({
        groupRef: ambientGroupRef,
        boostSpin: (amount) => boosterRef.current && boosterRef.current(amount),
    }), []);

    useEffect(() => {
        const ambientGroup = ambientGroupRef.current;
        const ambientShadow = ambientShadowRef.current;
        if (!ambientGroup) return;
        let idleSpin = null;

        const ctx = gsap.context(() => {
            // tracks wherever the logo currently is (its live x/y/scale/
            // opacity — whether that's mid-scroll-bloom or parked as the
            // background watermark) and adds a small orbiting wobble
            // driven by whatever rotationX/rotationY is currently spinning
            // it, so the shadow reads as cast by that same tumble instead
            // of sitting there inert.
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

            const mm = gsap.matchMedia();

            // ── reduced motion: no scroll hijack, just a slow XYZ tumble ──
            mm.add('(prefers-reduced-motion: reduce)', () => {
                gsap.set(ambientGroup, { opacity: 0.12, scale: 1, x: restX(), y: restY() });
                idleSpin = gsap.to(ambientGroup, {
                    rotationX: '+=360', rotationY: '+=360', rotationZ: '+=360',
                    duration: 48, ease: 'none', repeat: -1,
                });
                return () => idleSpin && idleSpin.kill();
            });

            // ── full experience ──
            mm.add('(prefers-reduced-motion: no-preference)', () => {
                gsap.set(ambientGroup, {
                    opacity: .74, scale: 1, rotation: 0, rotationX: 0, rotationY: 0, rotationZ: 0, x: 0, y: 0, z: 0,
                });

                // aligns this element's own resting spot with wherever
                // CaseDisc actually renders, measured live via
                // getBoundingClientRect rather than assumed through a fixed
                // CSS percentage (this element's own top: 53%; left: 42.5%
                // in LogoDisc.module.css, which is a percentage of the full
                // viewport). The case's real position depends on flex
                // layout (OptionsMenu/SideImage/CaseDisc's own widths,
                // which change non-uniformly across breakpoints — SideImage
                // disappears below 1100px, for one) plus a flat -50px nudge
                // on .caseWrap, none of which a percentage on THIS element
                // can predict — the two drifted apart by 70px+ at some
                // sizes before this. Measured once on mount (same
                // resize-tolerance the scroll timeline below already has —
                // restX()/restY() are also baked in once, not live — rather
                // than a continuous resize listener, which would fight the
                // scroll timeline's own x/y once scrolling has parked this
                // element elsewhere). Reads imgGroupRef (.discCaseGroup),
                // NOT discRef (.disc) — .disc is a fixed-size box that
                // doesn't actually contain the visible case artwork:
                // .discCaseGroup is position: absolute inside it with
                // left: 24% + translate(-50%), which (combined with
                // .disc's own overflow: visible) puts it sitting mostly to
                // .disc's LEFT rather than filling it, so .disc's own rect
                // center is nowhere near where the case actually renders.
                const caseEl = caseRef?.current?.imgGroupRef?.current;
                if (caseEl) {
                    const caseRect = caseEl.getBoundingClientRect();
                    const caseCenterX = caseRect.left + caseRect.width / 2;
                    const caseCenterY = caseRect.top + caseRect.height / 2;
                    const groupRect = ambientGroup.getBoundingClientRect();
                    const anchorCenterX = groupRect.left + groupRect.width / 2;
                    const anchorCenterY = groupRect.top + groupRect.height / 2;
                    gsap.set(ambientGroup, { x: caseCenterX - anchorCenterX, y: caseCenterY - anchorCenterY });
                }

                // the logo's own forever tumble — 3-axis (X/Y/Z), its own
                // independent direction/rate from discSpin.js's LOGO_SPIN
                // (separate from the case's own CASE_SPIN, not a shared
                // pair). Spins continuously from mount, independent of
                // scroll. Hero's shared scroll timeline only ever touches
                // scale/z/x/y/opacity on this same element (never
                // rotation), so the two never fight over the same
                // property.
                const ambientTumble = createTumble(ambientGroup, LOGO_SPIN);

                boosterRef.current = createSpinBooster(ambientTumble);

                // ── mouse parallax — drifts gently toward the cursor,
                // measured from true viewport center. Only ever touches
                // x/y (translate) on ambientParallaxRef — a separate
                // wrapper from ambientGroup, since ambientGroup's x/y are
                // already driven by Hero's scroll timeline (parking it as
                // the background watermark) — so the two offsets add
                // together in screen space instead of racing. Own local
                // listener, independent of CaseDisc's/Hero's — cheap
                // enough to have one per self-contained piece.
                const PARALLAX_EASE = 'power2.out';
                const PARALLAX_DURATION = 0.6;
                const PARALLAX_RANGE = 8;
                const parallaxX = gsap.quickTo(ambientParallaxRef.current, 'x', { duration: PARALLAX_DURATION, ease: PARALLAX_EASE });
                const parallaxY = gsap.quickTo(ambientParallaxRef.current, 'y', { duration: PARALLAX_DURATION, ease: PARALLAX_EASE });
                function handleMouseMove(e) {
                    const offsetX = gsap.utils.clamp(-1, 1, (e.clientX - window.innerWidth / 2) / (window.innerWidth / 2));
                    const offsetY = gsap.utils.clamp(-1, 1, (e.clientY - window.innerHeight / 2) / (window.innerHeight / 2));
                    parallaxX(offsetX * PARALLAX_RANGE);
                    parallaxY(offsetY * PARALLAX_RANGE);
                }
                window.addEventListener('mousemove', handleMouseMove, { passive: true });

                return () => {
                    boosterRef.current.cancel();
                    window.removeEventListener('mousemove', handleMouseMove);
                    ambientTumble.kill();
                };
            });
        }, ambientGroup);

        return () => ctx.revert();
    }, []);

    return (
        <div className={styles.ambientFloat}>
            {/* cursor-drift wrapper — see the mouse parallax block above.
                Kept separate from .ambientGroup so this translate and
                Hero's scroll timeline's own x/y on the group add together
                instead of fighting over the same property. */}
            <div className={styles.ambientParallax} ref={ambientParallaxRef}>
                {/* orbits in sync with the logo's own spin — see
                    syncShadowToSpin above */}
                <div className={styles.ambientShadow} ref={ambientShadowRef} />
                {/* front + back layers, same real-depth approach as
                    CaseDisc's discCaseGroup — see .ambientGroup */}
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
    );
});

export default LogoDisc;
