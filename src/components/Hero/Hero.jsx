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
    const caseImgRef = useRef(null);   // cd1.png — the jewel case, flies away
    const discRef = useRef(null);      // case body wrapper (spine + case)
    const optionsRef = useRef(null);
    const hintRef = useRef(null);
    const ambientRef = useRef(null);   // tempoLogo.png — the disc that keeps spinning

    useEffect(() => {
        const ambient = ambientRef.current;
        const hero = heroRef.current;
        const pinEl = pinRef.current;
        if (!ambient || !hero || !pinEl) return;
        let idleSpin = null;

        const ctx = gsap.context(() => {
            // where the disc parks once it becomes the background watermark
            const restX = () => window.innerWidth * 0.27;
            const restY = () => -window.innerHeight * 0.05;

            gsap.set(ambient, { xPercent: -50, yPercent: -50, transformPerspective: 900 });

            const mm = gsap.matchMedia();

            // ── reduced motion: no scroll hijack, just a slow XYZ tumble ──
            mm.add('(prefers-reduced-motion: reduce)', () => {
                gsap.set(ambient, { opacity: 0.12, scale: 2.15, x: restX(), y: restY() });
                idleSpin = gsap.to(ambient, {
                    rotationX: '+=360', rotationY: '+=360', rotationZ: '+=360',
                    duration: 40, ease: 'none', repeat: -1,
                });
                return () => idleSpin && idleSpin.kill();
            });

            // ── full experience ──
            mm.add('(prefers-reduced-motion: no-preference)', () => {
                gsap.set(caseWrapRef.current, { transformPerspective: 900 });
                gsap.set(caseImgRef.current, { transformPerspective: 1500 });
                gsap.set(ambient, {
                    opacity: 0.85, scale: 1, rotation: 0, rotationX: 0, rotationY: 0, x: 0, y: 0, z: 0,
                });

                // the disc's forever tumble on all three axes (the old animation).
                // hands off seamlessly from the scroll: it starts fast — matching
                // whatever fling the scroll gave it — then eases to its resting speed.
                function startIdleSpin(scrollV = 0) {
                    if (idleSpin) return;
                    idleSpin = gsap.to(ambient, {
                        rotationX: '+=360', rotationY: '+=360', rotationZ: '+=360',
                        duration: 15, ease: 'none', repeat: -1,
                    });
                    const boost = gsap.utils.clamp(0, 6, Math.abs(scrollV) / 500);
                    if (boost > 0.1) {
                        idleSpin.timeScale(1 + boost);
                        gsap.to(idleSpin, { timeScale: 1, duration: 3, ease: 'power2.out' });
                    }
                }

                // scrubbing back up into the hero — stop the tumble and re-sync the
                // disc to where the scroll timeline expects it, so the scrub resumes clean
                function reclaim() {
                    if (idleSpin) { gsap.killTweensOf(idleSpin); idleSpin.kill(); idleSpin = null; }
                    gsap.set(ambient, { rotationX: 18, rotationY: 16, rotationZ: 340 });
                }

                // the case's own idle tumble — runs the whole time, independent of
                // the CSS bob on the wrapper divs. caseWrap/caseImg spin freely on
                // all three axes since the scroll timeline below never touches their
                // rotation (only scale/z/opacity); discRef only gets rotationZ since
                // the fly-off already owns its rotationX/rotationY.
                const caseTumble = gsap.timeline({ repeat: -1, defaults: { ease: 'none' } });
                caseTumble
                    .to(caseImgRef.current, { rotationX: '+=360', rotationY: '+=360', rotationZ: '+=360', duration: 240 }, 0)
                    .to(discRef.current, { rotationZ: '+=360', duration: 360 }, 0);

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
                            duration: { min: 0.25, max: 0.6 },
                            ease: 'power1.inOut',
                        },
                        onLeave: (self) => startIdleSpin(self.getVelocity()),
                        onEnterBack: reclaim,
                        onLeaveBack: reclaim,
                    },
                });

                tl
                    // act 1 — the case opens and drops away in 3D
                    .to(caseWrapRef.current, { scale: 0.72, z: -380, opacity: 0 }, 0)
                    .to(caseImgRef.current, { z: -520, scale: 0.5, opacity: 0 }, 0)
                    .to(discRef.current, { scale: 1.35, z: 240, opacity: 0, rotationX: 160, rotationY: 200 }, 0)
                    .to(optionsRef.current, { x: -70, opacity: 0, duration: 0.55 }, 0)
                    .to(hintRef.current, { opacity: 0, duration: 0.12 }, 0)
                    // the disc — spins with the scroll and tilts in 3D as it comes
                    // forward (never edge-on, so the intro never goes blank), then
                    // blooms into the big faint background watermark, where it picks
                    // up the full XYZ tumble
                    .to(ambient, { rotationZ: 340, duration: 1 }, 0)
                    .to(ambient, { scale: 1.5, z: 170, rotationX: 34, rotationY: -28, opacity: 0.58, duration: 0.5 }, 0)
                    .to(ambient, { scale: 2.15, x: restX, y: restY, rotationX: 18, rotationY: 16, opacity: 0.16, duration: 0.5 }, 0.5);

                return () => { reclaim(); caseTumble.kill(); };
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
                                      <span className={styles.spineText}>+TEMPO · what inspires u</span>
                                  </div>
                                  <img
                                      src="/cd1.png"
                                      className={styles.discCase}
                                      ref={caseImgRef}
                                      alt=""
                                      aria-hidden="true"
                                  />
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
                on the image itself. */}
            <div className={styles.ambientFloat}>
                <img
                    src="/tempoLogo.png"
                    className={styles.ambient}
                    ref={ambientRef}
                    alt=""
                    aria-hidden="true"
                />
            </div>
        </>
    );
}
