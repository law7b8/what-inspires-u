import { useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { gsap } from 'gsap';
import styles from './OptionsMenu.module.css';

// The tmp3o.com/title text block — types itself in on a loop; the two
// lines each orbit the ambient logo's live on-screen position and spin
// independently of each other (different radius/speed/phase/rotation
// period per line), rather than moving as one rigid unit. Fully self-
// contained (owns its refs, its typewriter loop, its own reduced-motion
// handling, its own cleanup) except for one thing it can't own itself: it
// needs to track a DIFFERENT component's (LogoDisc) live position every
// frame for the orbit, so logoRef is passed in as a prop (LogoDisc's own
// forwardRef handle) rather than something this component could discover
// on its own.
export default function OptionsMenu({ logoRef, firstText = 'tmp3o.com', secondText = '+archive.cd' }) {
    const optionsRef = useRef(null);
    const topbarOrbitRef = useRef(null);
    const titleOrbitRef = useRef(null);
    const firstTextRef = useRef(null);
    const secondTextRef = useRef(null);
    const titleBoxRef = useRef(null); // the <h1> wrapping secondTextRef — the bordered box lives here, not on the span itself

    useEffect(() => {
        const ctx = gsap.context(() => {
            // ── typewriter loop — firstText types in, holds, untypes, then
            // secondText does the same, forever (repeat: -1). Runs
            // regardless of the reduced-motion branch below since it's not
            // part of the scroll-hijack experience — but it's still
            // motion, so it's skipped in favor of static finished text
            // when the user has that preference (an infinite loop is
            // exactly the kind of thing reduced-motion is meant to opt out
            // of). aria-label on the <a>/<Link> ancestors (in the JSX
            // below) carries the real, complete text at all times, so
            // screen readers announce each line once rather than replaying
            // every type/untype cycle as textContent gets rewritten.
            //
            // Duration is per-character (not a fixed duration per line),
            // so a longer second line still reads at the same typing
            // *speed* as a shorter first line instead of visibly rushing
            // to fit the same duration.
            const CHAR_TYPE_DURATION = 0.18;
            const CHAR_UNTYPE_DURATION = 0.245;
            const HOLD_DURATION = 1.6;
            const LINE_GAP = 0.35;
            // each character's own reveal/remove takes a randomly jittered
            // duration in this range around the base charDuration, instead
            // of every keystroke landing at an identical, metronomic pace —
            // reads more like an actual person typing. Picked once when
            // each line's timeline is built (not re-rolled every loop), so
            // the same line always has the same "handwriting" rather than
            // reshuffling every repeat.
            const SPEED_VARIANCE_MIN = 0.5;
            const SPEED_VARIANCE_MAX = 1.7;
            const randDuration = (base) => base * (SPEED_VARIANCE_MIN + Math.random() * (SPEED_VARIANCE_MAX - SPEED_VARIANCE_MIN));

            // boxEl defaults to el itself — true for firstTextRef, which IS
            // the bordered .topbarLink element. secondTextRef is just the
            // inner span though (the border lives on its ancestor <h1>,
            // titleBoxRef), so that call passes it explicitly. Toggling
            // data-has-text is what makes the border/background in
            // OptionsMenu.module.css show up only while there's actually
            // text in the line, instead of sitting there as a bare empty
            // box the whole time the other line is typing.
            //
            // Built as a timeline of one step per character (each with its
            // own randomized duration via randDuration) rather than a
            // single continuous tween — that's what makes the variance
            // possible; a single tween interpolating 0→length can only ever
            // move at one constant rate.
            function typeInto(el, text, charDuration, boxEl = el) {
                if (!el) return null;
                const tl = gsap.timeline();
                for (let i = 1; i <= text.length; i += 1) {
                    tl.to({}, {
                        duration: randDuration(charDuration),
                        onComplete: () => {
                            el.textContent = text.slice(0, i);
                            boxEl?.toggleAttribute('data-has-text', i > 0);
                        },
                    });
                }
                return tl;
            }
            function untypeFrom(el, text, charDuration, boxEl = el) {
                if (!el) return null;
                const tl = gsap.timeline();
                for (let i = text.length - 1; i >= 0; i -= 1) {
                    tl.to({}, {
                        duration: randDuration(charDuration),
                        onComplete: () => {
                            el.textContent = text.slice(0, i);
                            boxEl?.toggleAttribute('data-has-text', i > 0);
                        },
                    });
                }
                return tl;
            }

            let typeLoop = null;
            if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
                if (firstTextRef.current) {
                    firstTextRef.current.textContent = firstText;
                    firstTextRef.current.setAttribute('data-has-text', '');
                }
                if (secondTextRef.current) secondTextRef.current.textContent = secondText;
                if (titleBoxRef.current) titleBoxRef.current.setAttribute('data-has-text', '');
            } else {
                if (optionsRef.current) optionsRef.current.setAttribute('data-typing', '');
                typeLoop = gsap.timeline({ repeat: -1, delay: 0.4 })
                    .add(typeInto(firstTextRef.current, firstText, CHAR_TYPE_DURATION))
                    .to({}, { duration: HOLD_DURATION })
                    .add(untypeFrom(firstTextRef.current, firstText, CHAR_UNTYPE_DURATION))
                    .to({}, { duration: LINE_GAP })
                    .add(typeInto(secondTextRef.current, secondText, CHAR_TYPE_DURATION, titleBoxRef.current))
                    .to({}, { duration: HOLD_DURATION })
                    .add(untypeFrom(secondTextRef.current, secondText, CHAR_UNTYPE_DURATION, titleBoxRef.current))
                    .to({}, { duration: LINE_GAP });
            }

            let topbarOrbit = null;
            let titleOrbit = null;
            let topbarSpin = null;
            let titleSpin = null;
            if (!window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
                // deliberately stepped, not smooth — only actually writes
                // the position/opacity below 24 times a second (a "film
                // frame rate" look) instead of on every display-refresh
                // tick GSAP's ticker would otherwise call onUpdate at
                // (typically 60fps+). gsap.ticker.time is a shared,
                // ever-increasing clock (not tied to either tween below),
                // so both hold steady at 24fps regardless of how often
                // onUpdate itself actually fires.
                const ORBIT_FRAME_DURATION = 1 / 24;

                // each line orbits logoRef's actual live on-screen position
                // every frame — not a fixed point, since the logo itself
                // keeps moving (scroll-driven parking, its own mouse
                // parallax) — with its OWN radius/speed/phase/left-offset,
                // so the two lines genuinely move independently instead of
                // as one rigid block. wrapperEl's own natural resting
                // position (its anchor, from the off-screen `left: -90em`
                // in the CSS) is captured once before any GSAP offset is
                // applied, so the orbit target can be expressed as a delta
                // from it (an x/y translate) rather than fighting over the
                // element's actual page position directly — the anchor's
                // exact coordinates don't matter, they cancel out of the
                // math below either way.
                function createOrbit(wrapperEl, { radius, radiusY, offsetX, duration, phase }) {
                    if (!wrapperEl) return null;
                    const anchorRect = wrapperEl.getBoundingClientRect();
                    const anchorCenterX = anchorRect.left + anchorRect.width / 2;
                    const anchorCenterY = anchorRect.top + anchorRect.height / 2;
                    const proxy = { angle: phase };
                    let nextFrameAt = 0;
                    return gsap.to(proxy, {
                        angle: phase + Math.PI * 2,
                        duration,
                        repeat: -1,
                        ease: 'none',
                        onUpdate: () => {
                            if (gsap.ticker.time < nextFrameAt) return;
                            nextFrameAt = gsap.ticker.time + ORBIT_FRAME_DURATION;
                            const logoEl = logoRef?.current?.groupRef?.current;
                            if (!logoEl) return;
                            const logoRect = logoEl.getBoundingClientRect();
                            const logoCenterX = logoRect.left + logoRect.width / 2;
                            const logoCenterY = logoRect.top + logoRect.height / 2;
                            gsap.set(wrapperEl, {
                                x: logoCenterX + Math.cos(proxy.angle) * radius - anchorCenterX + offsetX,
                                y: logoCenterY + Math.sin(proxy.angle) * radiusY - anchorCenterY,
                                // fades to nothing on the far side of this
                                // line's own orbit and back to fully visible
                                // on the near side — tied directly to this
                                // line's own angle, so each line fades on
                                // its own cycle instead of a shared timer.
                                opacity: (1 + Math.cos(proxy.angle)) / 2,
                            });
                        },
                    });
                }

                // same wrapper elements the orbit above already moves —
                // GSAP composes the x/y it sets there with the rotationY
                // set here into one combined transform automatically, no
                // conflict (they're different properties on the same
                // element, not two tweens fighting over the same one).
                // backface-visibility: hidden in the CSS keeps the text
                // from reading mirrored/backwards on the far half of each
                // spin.
                function createSpin(el, seconds) {
                    if (!el) return null;
                    return gsap.to(el, { rotationY: '-=360', duration: seconds, repeat: -1, ease: 'none' });
                }

                topbarOrbit = createOrbit(topbarOrbitRef.current, {
                    radius: 420, radiusY: 420 * 0.45, offsetX: -120, duration: 26, phase: 0,
                });
                titleOrbit = createOrbit(titleOrbitRef.current, {
                    radius: 300, radiusY: 300 * 0.5, offsetX: -40, duration: 19, phase: Math.PI,
                });
                topbarSpin = createSpin(topbarOrbitRef.current, 14);
                titleSpin = createSpin(titleOrbitRef.current, 21);
            }

            return () => {
                typeLoop && typeLoop.kill();
                topbarOrbit && topbarOrbit.kill();
                titleOrbit && titleOrbit.kill();
                topbarSpin && topbarSpin.kill();
                titleSpin && titleSpin.kill();
            };
        });

        return () => ctx.revert();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [firstText, secondText]);

    return (
        <div className={styles.options} ref={optionsRef}>
            <div className={styles.topbarOrbit} ref={topbarOrbitRef}>
                <a
                    href="https://tmp3o.com/"
                    target="_blank"
                    rel="noopener noreferrer"
                    className={styles.topbarLink}
                    aria-label={firstText}
                    ref={firstTextRef}
                />
            </div>

            <div className={styles.titleOrbit} ref={titleOrbitRef}>
                <Link to="/" className={styles.titleLink} aria-label={secondText}>
                    <h1 className={styles.title} ref={titleBoxRef}>
                        <span ref={secondTextRef} /><span className={styles.typingCursor} aria-hidden="true" />
                    </h1>
                </Link>
            </div>
        </div>
    );
}
