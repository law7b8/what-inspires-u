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
                    duration: 70, ease: 'none', repeat: -1,
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

                const tl = gsap.timeline({
                    defaults: { ease: 'none' },
                    scrollTrigger: {
                        trigger: hero,
                        start: 'top top',
                        end: () => '+=' + Math.round(window.innerHeight * 0.8),
                        // pin an inner element (not the <section> React owns) so the
                        // pin-spacer wrapper never fights React on unmount
                        pin: pinEl,
                        pinSpacing: true,
                        scrub: 1,
                        invalidateOnRefresh: true,
                        // once the user stops scrolling mid-transition, ease the
                        // rest of the way to whichever end (hero or page) is closer
                        snap: {
                            snapTo: [0, 1],
                            duration: { min: 0.1, max: 0.3 },
                            ease: 'power1.inOut',
                        },
                        // "fully completes animation from scroll" — onLeave fires
                        // right as the pin releases past progress 1; onEnterBack
                        // hides the header again if the user scrolls back up.
                        onLeave: popInHeader,
                        onEnterBack: hideHeaderAgain,
                    },
                });

                tl
                    // act 1 — the case opens and drops away in 3D. Compressed into
                    // the first 30% of the scroll (was 50%) so act 2 kicks in sooner.
                    .to(caseWrapRef.current, { scale: 0.72, z: -380, opacity: 0, duration: 0.3 }, 0)
                    .to(caseImgGroupRef.current, { z: -520, scale: 0.5, opacity: 0, duration: 0.3 }, 0)
                    // scale/z toned down (was 1.35/240 — ballooned into an
                    // unrecognizable close-up under perspective) and duration
                    // brought back to 0.3 to match the rest of act 1 instead of
                    // dragging on past when everything else already finished.
                    .to(discRef.current, { scale: 1.1, z: 30, opacity: 0, rotationX: 160, rotationY: 160, duration: 0.3 }, 0)
                    .to(optionsRef.current, { x: 0, opacity: 0, duration: 0.33 }, 0)
                    .to(hintRef.current, { opacity: 0, duration: 0.07 }, 0)
                    // the disc — comes forward and blooms into the big faint
                    // background watermark; rotation is ambientTumble's job the
                    // whole time, so this only ever drives position/scale/opacity.
                    // this first bloom step mirrors caseImgGroupRef's { z: -520,
                    // scale: 0.5, opacity: 0 } in the opposite direction: comes
                    // toward the viewer instead of receding, grows instead of
                    // shrinking, and gets more opaque instead of fading out.
                    .to(ambientGroup, { scale: 1.4, z: 520, opacity: 1, duration: 0.15 }, 0)
                    // act 2 — now finishes at 33% of the scroll (was 100%), landing
                    // at the same moment optionsRef finishes fading out above,
                    // instead of the disc taking the whole scroll to park.
                    // scale capped at 1.5 (was 2.15) — big enough to read as parked
                    // in the background, not so big it blows past legibility.
                    .to(ambientGroup, { scale: 1.2, x: restX, y: restY, opacity: 0.16, duration: 0.18 }, 0.33);

                return () => {
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
                                      <span className={styles.spineText}>+TEMPO | what inspires u</span>
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
        </>
    );
}
