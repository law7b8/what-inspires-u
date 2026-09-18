import { forwardRef, useEffect, useImperativeHandle, useRef } from 'react';
import { gsap } from 'gsap';
import { createSpinBooster } from './spinBooster';
import { DISC_SPIN, createYSpin } from './discSpin';
import styles from './CaseDisc.module.css';

// The CD case/disc — front+back case artwork with real Z-depth, a spine,
// and its own perpetual 3D tumble. Self-contained like SideImage (owns its
// refs, its own tumble, its own reduced-motion check, its own cleanup),
// but unlike SideImage it's also a target of Hero's shared scroll timeline
// (the fly-apart) and its shared mouse-speed spin boost — those genuinely
// need to stay orchestrated centrally, so this exposes exactly what Hero
// needs for that via useImperativeHandle: the two raw ref objects the
// scroll timeline animates directly (imgGroupRef, discRef), and a
// boostSpin(amount) function for the mouse-speed feature to call into.
// Everything else about how this element tumbles/renders lives here.
const CaseDisc = forwardRef(function CaseDisc(_props, ref) {
    const discRef = useRef(null);
    const caseImgGroupRef = useRef(null);
    const boosterRef = useRef(null);

    useImperativeHandle(ref, () => ({
        discRef,
        imgGroupRef: caseImgGroupRef,
        boostSpin: (amount) => boosterRef.current && boosterRef.current(amount),
    }), []);

    useEffect(() => {
        // matches the rest of Hero: no perpetual tumble under reduced
        // motion, just the static artwork.
        if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

        const ctx = gsap.context(() => {
            gsap.set(caseImgGroupRef.current, { transformPerspective: 900 });

            // the case's own idle spin — Y axis only, at the case's rate
            // from discSpin.js (paired with the logo's, which turns at a
            // different rate). Runs the whole time, independent of the CSS
            // bob on the wrapper divs and of Hero's scroll timeline, which
            // only ever touches scale/z/opacity on the image group (and
            // rotationX/Y on discRef, a different element) during the
            // fly-apart.
            const caseTumble = createYSpin(caseImgGroupRef.current, DISC_SPIN.case.seconds);

            boosterRef.current = createSpinBooster(caseTumble);

            return () => {
                boosterRef.current.cancel();
                caseTumble.kill();
            };
        });

        return () => ctx.revert();
    }, []);

    return (
        <div className={styles.caseBody}>
            <div className={styles.floatDisc}>
                <div className={styles.discSlot}>
                    <div className={styles.disc} ref={discRef}>
                        {/* cd spine */}
                        <div className={styles.spine}>
                            <span className={styles.spineText}></span>
                        </div>
                        {/* front + back layers give the case real Z-depth
                            instead of a flat drop-shadow, so it holds up as
                            it tumbles in 3D — see .discCaseGroup */}
                        <div className={styles.discCaseGroup} ref={caseImgGroupRef}>
                            {/* a two-sided slab: each face has its own
                                dark shadow layer behind it, so the case has
                                depth from the front AND after it flips.
                                Front view: face (z 0) over its shadow (z -35).
                                Rear view (rotated 180): rear face (at -35)
                                over its shadow (at 0). Every layer hides its
                                own backface, so only the side facing you
                                draws. The shadows are wrapper divs so their
                                blur/darken filter never sits on the same
                                element as backface-visibility. */}
                            <img
                                src="/cd1.png"
                                className={styles.discCase}
                                alt=""
                                aria-hidden="true"
                            />
                            <div className={`${styles.layer} ${styles.shadowFront}`}>
                                <img src="/cd1.png" alt="" aria-hidden="true" />
                            </div>
                            <img
                                src="/cd1.png"
                                className={`${styles.discCase} ${styles.discCaseRear}`}
                                alt=""
                                aria-hidden="true"
                            />
                            <div className={`${styles.layer} ${styles.shadowRear}`}>
                                <img src="/cd1.png" alt="" aria-hidden="true" />
                            </div>
                        </div>
                    </div>
                </div>
            </div>
            {/* soft ps3-style contact shadow, pulses with .floatDisc */}
            <div className={styles.caseShadow} />
        </div>
    );
});

export default CaseDisc;
