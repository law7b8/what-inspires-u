import { useEffect, useRef } from 'react';
import { gsap } from 'gsap';
import styles from './SideImage.module.css';

// Self-contained "chunk" pulled out of Hero.jsx — none of this (refs, the
// perpetual tumbles below, cleanup) is touched by or touches Hero's scroll
// timeline, its mouse-speed spin boosters, or anything else in Hero's own
// effect, so it manages its own GSAP context and cleanup entirely
// independently instead of living inside Hero's.
export default function SideImage() {
    const groupRef = useRef(null);
    const shadowRef = useRef(null);
    const shadow2Ref = useRef(null);

    useEffect(() => {
        // matches Hero's own reduced-motion handling: the JSX below still
        // renders (a static, unrotated instance), just without any of the
        // tumbles this effect would otherwise set up.
        if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

        const ctx = gsap.context(() => {
            gsap.set(groupRef.current, { transformPerspective: 900 });
            gsap.set(shadowRef.current, { transformPerspective: 900 });
            gsap.set(shadow2Ref.current, { transformPerspective: 900 });

            // the side image's own forever tumble — spins continuously from
            // mount, nothing else ever touches its rotation, so there's
            // nothing for it to fight with.
            const tumble = gsap.timeline({ repeat: -1, defaults: { ease: 'none' } });
            tumble
                .to(groupRef.current, { rotationY: '+=360', duration: 900 }, 0)
                .to(groupRef.current, { rotationZ: '-=360', duration: 900 }, 0)
                .to(groupRef.current, { rotationX: '-=360', duration: 200 }, 0);

            // the shadow layers are separate elements, not children of
            // groupRef (same reasoning as ambientShadow being a sibling of
            // ambientGroup in Hero.jsx, not nested inside it) — spinning
            // them independently needs their own rotation rather than
            // inheriting the front layer's, which a nested child can't do
            // (it would just compose on top of whatever the parent is
            // doing, not counter it).
            const shadowTumble = gsap.timeline({ repeat: -1, defaults: { ease: 'none' } });
            shadowTumble.to(shadowRef.current, { rotationY: '-=360', duration: 40 }, 0);
            shadowTumble.progress(0.25); // starts already partway through its cycle, out of phase with the front layer

            // a second shadow layer, same idea again — its own independent
            // tumble at a different phase (0.6, vs. the first shadow's
            // 0.25) so the two shadows don't just sit stacked on top of
            // each other; between the front layer and both shadows, all
            // three are out of phase with one another.
            const shadow2Tumble = gsap.timeline({ repeat: -1, defaults: { ease: 'none' } });
            shadow2Tumble.to(shadow2Ref.current, { rotationY: '-=360', duration: 20 }, 0);
            shadow2Tumble.progress(0.6);

            return () => {
                tumble.kill();
                shadowTumble.kill();
                shadow2Tumble.kill();
            };
        });

        return () => ctx.revert();
    }, []);

    return (
        <>
            {/* side image — right side, mirroring .options on the left in
                Hero (also balances the composition, since options alone had
                nothing on the right side to weigh against it). Swap the src
                below for your own image — .sideImage's brightness is a CSS
                variable (--side-image-brightness, default 1) you can
                override per-use via an inline style, e.g.
                style={{ '--side-image-brightness': 1.3 }} on this wrapper
                div, or just edit the default in SideImage.module.css.
                Decorative, so all three are aria-hidden. */}
            <div className={`${styles.sideImageGroup} ${styles.sideImageShadow}`} ref={shadowRef} aria-hidden="true">
                <img src="/skully.png" className={`${styles.sideImage} ${styles.sideImageShadowImg}`} alt="" />
            </div>
            <div className={`${styles.sideImageGroup} ${styles.sideImageShadow}`} ref={shadow2Ref} aria-hidden="true">
                <img src="/skully.png" className={`${styles.sideImage} ${styles.sideImageShadowImg}`} alt="" />
            </div>
            <div className={styles.sideImageGroup} ref={groupRef} aria-hidden="true">
                <img src="/skully.png" className={styles.sideImage} alt="" />
            </div>
        </>
    );
}
