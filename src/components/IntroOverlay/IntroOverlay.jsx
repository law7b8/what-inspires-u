import { useEffect, useRef } from 'react';
import { gsap } from 'gsap';
import styles from './IntroOverlay.module.css';

// The whole site opens from black and blurred, then resolves into focus.
// A single full-viewport veil, fully opaque black at first (hiding
// everything behind it — PS3Background, Header, Hero, all of it), which
// fades its own opacity and backdrop-blur down together on mount. Since
// backdrop-filter blurs whatever is BEHIND this element, the page itself
// never needs its own filter touched (which would've made every fixed-
// position element on the page — the waves canvas, the ambient logo,
// HudControls — suddenly relative to this wrapper instead of the real
// viewport for the animation's duration). Runs once per full page load,
// same as App itself only mounts once.
export default function IntroOverlay() {
    const veilRef = useRef(null);

    useEffect(() => {
        const el = veilRef.current;
        if (!el) return;

        if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
            gsap.set(el, { autoAlpha: 0 });
            return;
        }

        gsap.fromTo(
            el,
            { autoAlpha: 1, backdropFilter: 'blur(428px)', WebkitBackdropFilter: 'blur(528px)' },
            {
                autoAlpha: 0,
                backdropFilter: 'blur(0px)',
                WebkitBackdropFilter: 'blur0px)',
                duration: 1.5,
                delay: 0.15,
                ease: 'power2.out',
            },
        );
    }, []);

    return <div className={styles.veil} ref={veilRef} aria-hidden="true" />;
}
