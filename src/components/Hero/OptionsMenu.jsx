import { forwardRef, useEffect, useImperativeHandle, useRef } from 'react';
import { Link } from 'react-router-dom';
import { gsap } from 'gsap';
import styles from './OptionsMenu.module.css';

// The tmp3o.com/title text block — types itself in on a loop, spins on its
// own axis, and orbits the ambient logo's live on-screen position. Fully
// self-contained (owns its refs, its typewriter loop, its own tumble, its
// own reduced-motion handling, its own cleanup) except for one thing it
// can't own itself: it needs to track a DIFFERENT component's (LogoDisc)
// live position every frame for the orbit, so logoRef is passed in as a
// prop (LogoDisc's own forwardRef handle) rather than something this
// component could discover on its own. Exposes elRef via
// useImperativeHandle so Hero's shared scroll timeline can still fade this
// out during the fly-apart — that one tween has to stay centrally
// orchestrated alongside the case's and logo's own fly-apart tweens for
// all three to move in the same scroll-scrubbed beat.
const OptionsMenu = forwardRef(function OptionsMenu({ logoRef, firstText = 'tmp3o.com', secondText = '+archive.cd' }, ref) {
    const optionsOrbitRef = useRef(null);
    const optionsRef = useRef(null);
    const firstTextRef = useRef(null);
    const secondTextRef = useRef(null);

    useImperativeHandle(ref, () => ({
        elRef: optionsRef,
    }), []);

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

            let typeLoop = null;
            if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
                if (firstTextRef.current) firstTextRef.current.textContent = firstText;
                if (secondTextRef.current) secondTextRef.current.textContent = secondText;
            } else {
                if (optionsRef.current) optionsRef.current.setAttribute('data-typing', '');
                typeLoop = gsap.timeline({ repeat: -1, delay: 0.4 })
                    .add(typeInto(firstTextRef.current, firstText, CHAR_TYPE_DURATION))
                    .to({}, { duration: HOLD_DURATION })
                    .add(untypeFrom(firstTextRef.current, firstText, CHAR_UNTYPE_DURATION))
                    .to({}, { duration: LINE_GAP })
                    .add(typeInto(secondTextRef.current, secondText, CHAR_TYPE_DURATION))
                    .to({}, { duration: HOLD_DURATION })
                    .add(untypeFrom(secondTextRef.current, secondText, CHAR_UNTYPE_DURATION))
                    .to({}, { duration: LINE_GAP });
            }

            let optionsTumble = null;
            let optionsOrbit = null;
            if (!window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
                // self-spin — X axis, i.e. perpendicular to the logo's own
                // Y-axis rotation (a door swinging left-right vs. a flap
                // swinging top-bottom). Hero's scroll timeline only ever
                // touches this element's x/opacity (fading it out during
                // the fly-apart), never rotation, so the two don't fight
                // over the same property. No "back" layer the way the
                // case/logo have, so .options gets backface-visibility:
                // hidden in the CSS instead — it just fades out of view
                // for the far half of each rotation rather than showing
                // the text mirrored/backwards.
                optionsTumble = gsap.timeline({ repeat: -1, defaults: { ease: 'none' } });
                optionsTumble.to(optionsRef.current, { rotationX: '-=360', duration: 24 }, 0);

                // ── orbit — optionsOrbitRef (the outer wrapper, separate
                // from optionsRef so this never fights the scroll
                // timeline's x tween above) circles logoRef's actual live
                // on-screen position every frame — not a fixed point,
                // since the logo itself keeps moving (scroll-driven
                // parking, its own mouse parallax). orbitAnchor is
                // optionsOrbitRef's own natural resting position, captured
                // once before any GSAP offset is applied, so the orbit
                // target below can be expressed as a delta from it (an
                // x/y translate), rather than fighting over the element's
                // actual page position directly.
                const ORBIT_RADIUS = 420;
                const orbitAnchorRect = optionsOrbitRef.current.getBoundingClientRect();
                const orbitAnchorCenterX = orbitAnchorRect.left + orbitAnchorRect.width / 2;
                const orbitAnchorCenterY = orbitAnchorRect.top + orbitAnchorRect.height / 2;
                const orbitProxy = { angle: 0 };
                optionsOrbit = gsap.to(orbitProxy, {
                    angle: Math.PI * 2,
                    duration: 18,
                    repeat: -1,
                    ease: 'none',
                    onUpdate: () => {
                        const logoEl = logoRef?.current?.groupRef?.current;
                        if (!logoEl) return;
                        const logoRect = logoEl.getBoundingClientRect();
                        const logoCenterX = logoRect.left + logoRect.width / 2;
                        const logoCenterY = logoRect.top + logoRect.height / 2;
                        gsap.set(optionsOrbitRef.current, {
                            x: logoCenterX + Math.cos(orbitProxy.angle) * ORBIT_RADIUS - orbitAnchorCenterX,
                            y: logoCenterY + Math.sin(orbitProxy.angle) * ORBIT_RADIUS * 0.45 - orbitAnchorCenterY,
                        });
                    },
                });
            }

            return () => {
                typeLoop && typeLoop.kill();
                optionsTumble && optionsTumble.kill();
                optionsOrbit && optionsOrbit.kill();
            };
        });

        return () => ctx.revert();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [firstText, secondText]);

    return (
        <div className={styles.optionsOrbit} ref={optionsOrbitRef}>
            <div className={styles.options} ref={optionsRef}>
                <a
                    href="https://tmp3o.com/"
                    target="_blank"
                    rel="noopener noreferrer"
                    className={styles.topbarLink}
                    aria-label={firstText}
                    ref={firstTextRef}
                />

                <Link to="/" className={styles.titleLink} aria-label={secondText}>
                    <h1 className={styles.title}>
                        <span ref={secondTextRef} /><span className={styles.typingCursor} aria-hidden="true" />
                    </h1>
                </Link>
            </div>
        </div>
    );
});

export default OptionsMenu;
