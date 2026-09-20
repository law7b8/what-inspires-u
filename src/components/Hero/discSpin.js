import { gsap } from 'gsap';

// The CD case and the tempo logo tumble independently — each has its own
// direction and base speed, not a shared/paired config. Both still spin on
// all 3 axes (X, Y, Z) via the same createTumble helper below, since that
// mechanism (independently-repeating tweens per axis at offset periods) is
// identical for either one — only the numbers differ.
export const CASE_SPIN = { direction: 1, seconds: 40 };
export const LOGO_SPIN = { direction: -1, seconds: 24 };

// A forever 3-axis tumble on `target`. X and Z turn at different multiples
// of `spin.seconds` (not the same duration) — three axes finishing their
// loops in perfect sync would look identical every single lap; offsetting
// them makes the combined motion read as a genuine tumble rather than a
// flat repeating pattern. Each axis is its OWN independently-repeating
// tween (rather than three tweens sharing one repeat: -1 timeline)
// specifically so their different periods never have to resync/seam
// against each other — nesting mismatched-period infinite loops inside one
// shared repeating parent would otherwise clip whichever axis hasn't
// finished when the longest one does. The parent timeline returned here
// never repeats itself; it doesn't need to, its children already loop
// forever, and it exists purely as one controllable handle for
// createSpinBooster's timeScale() and cleanup's kill(). `vars` is merged
// into the parent's config (e.g. an onUpdate).
export function createTumble(target, { direction, seconds }, vars = {}) {
    const sign = direction < 0 ? '-' : '+';
    const tl = gsap.timeline({ defaults: { ease: 'none' }, ...vars });
    tl.to(target, { rotationY: `${sign}=360`, duration: seconds * 1.65, repeat: -1 }, 0);
    tl.to(target, { rotationX: `${sign}=360`, duration: seconds * 2.85, repeat: -1 }, 0);
    tl.to(target, { rotationZ: `${sign}=-360`, duration: seconds * 6.7, repeat: -1 }, 0);
    return tl;
}
