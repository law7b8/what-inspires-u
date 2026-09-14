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
                const PARALLAX_EASE = 'power3';
                const CASE_PARALLAX_DURATION = 0.9;    // foreground case — heavier, slower to catch up
                const AMBIENT_PARALLAX_DURATION = 0.6; // background watermark — a touch snappier
                const PARALLAX_RANGE = 44;             // px of max drift at full cursor travel from center — shared by both

                const caseParallaxX = gsap.quickTo(caseWrapRef.current, 'x', { duration: CASE_PARALLAX_DURATION, ease: PARALLAX_EASE });
                const caseParallaxY = gsap.quickTo(caseWrapRef.current, 'y', { duration: CASE_PARALLAX_DURATION, ease: PARALLAX_EASE });
                const ambientParallaxX = gsap.quickTo(ambientParallaxRef.current, 'x', { duration: AMBIENT_PARALLAX_DURATION, ease: PARALLAX_EASE });
                const ambientParallaxY = gsap.quickTo(ambientParallaxRef.current, 'y', { duration: AMBIENT_PARALLAX_DURATION, ease: PARALLAX_EASE });

                function handleMouseMove(e) {
                    const offsetX = gsap.utils.clamp(-1, 1, (e.clientX - window.innerWidth / 2) / (window.innerWidth / 2));
                    const offsetY = gsap.utils.clamp(-1, 1, (e.clientY - window.innerHeight / 2) / (window.innerHeight / 2));
                    caseParallaxX(offsetX * PARALLAX_RANGE);
                    caseParallaxY(offsetY * PARALLAX_RANGE);
                    ambientParallaxX(offsetX * PARALLAX_RANGE);
                    ambientParallaxY(offsetY * PARALLAX_RANGE);
                }
                window.addEventListener('mousemove', handleMouseMove, { passive: true });

                // makes scrolling itself visibly spin the disc faster, without
                // competing with ambientTumble for the same rotation properties
                // (two tweens fighting over rotationX/Y/Z would jitter) — instead
                // this just speeds up ambientTumble's own playback rate based on
                // scroll speed. Doesn't rely on onUpdate firing again to settle
                // back down (it may not, once real scrolling actually stops) —
                // explicitly eases timeScale back to 1 a beat after the last
                // update, debounced so a burst of scroll events during active
                // scrolling doesn't pile up competing decay tweens.
                let spinDecayTimer = null;
                function boostSpinFromScroll(velocity) {
                    const boost = gsap.utils.clamp(0, 6, Math.abs(velocity) / 500);
                    gsap.killTweensOf(ambientTumble);
                    ambientTumble.timeScale(1 + boost);
                    clearTimeout(spinDecayTimer);
                    spinDecayTimer = setTimeout(() => {
                        gsap.to(ambientTumble, { timeScale: 1, duration: 1.2, ease: 'power2.out' });
                    }, 120);
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
                //
                // ACT2 is back to running right after ACT1 (not overlapping deep
                // into it, like the previous pass) — starting the disc's move to
                // its resting spot while the case artwork was still fully on
                // screen made the two visually mismatch/desync, since they're
                // supposed to read as one object (the disc "inside" the case)
                // until the case is actually gone. "Show sooner" instead comes
                // from shrinking BOTH acts' own durations and the physical scroll
                // distance by the same ratio (~0.63 tl-units per viewport-height,
                // same as the last "slow it down" pass) — that needs less total
                // scrolling without changing how steep/rushed any single tween
                // feels per pixel scrolled, and keeps the handoff between case and
                // disc sequential instead of overlapping.
                const ACT1_DURATION = 0.05;
                const ACT2_START = 0.0;       // small gap after ACT1, same as the original design
                const ACT2_DURATION = 0.10;
                const ACT2_END = ACT2_START + ACT2_DURATION; // = 0.47, the timeline's total duration

                const tl = gsap.timeline({
                    defaults: { ease: 'none' },
                    scrollTrigger: {
                        trigger: hero,
                        start: 'top top',
                        // shrunk in the same proportion as the act durations above,
                        // so scroll-pixels-per-unit-of-motion stays the same as the
                        // "slow it down" pass — less total scrolling needed, same
                        // pace throughout.
                        end: () => '+=' + Math.round(window.innerHeight * 0.8),
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
                    clearTimeout(spinDecayTimer);
                    window.removeEventListener('mousemove', handleMouseMove);
                    caseTumble.kill();
                    ambientTumble.kill();
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

                    {/* options — left side */}
                    <div className={styles.options} ref={optionsRef}>
                        <a
                            href="https://tmp3o.com/"
                            target="_blank"
                            rel="noopener noreferrer"
                            className={styles.topbarLink}
                        >
                            tmp3o.com
                        </a>

                        <Link to="/" className={styles.titleLink}>
                            <h1 className={styles.title}>
                                WHAT INSPIRES <span>U?</span>
                            </h1>
                        </Link>
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
