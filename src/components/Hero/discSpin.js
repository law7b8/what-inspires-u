import { gsap } from 'gsap';

// The CD case and the tempo logo tumble as a pair: full 3-axis rotation
// (X, Y, Z), same direction, at different rates from each other. Keeping
// both numbers (and the direction) here means they're tuned together in one
// place. OptionsMenu is deliberately not part of this — it keeps its own
// separate tumble (currently none at all — see OptionsMenu.jsx).
export const DISC_SPIN = {
    direction: -1,               // -1 = negative rotation, 1 = positive
    case: { seconds: 40 },       // seconds per full Y turn — X/Z derive off this, see createTumble
    logo: { seconds: 24 },
};

// A forever 3-axis tumble on `target`. X and Z turn at different multiples
// of `seconds` (not the same duration) — three axes finishing their loops in
// perfect sync would look identical every single lap; offsetting them makes
// the combined motion read as a genuine tumble rather than a flat repeating
// pattern. Each axis is its OWN independently-repeating tween (rather than
// three tweens sharing one repeat: -1 timeline) specifically so their
// different periods never have to resync/seam against each other — nesting
// mismatched-period infinite loops inside one shared repeating parent would
// otherwise clip whichever axis hasn't finished when the longest one does.
// The parent timeline returned here never repeats itself; it doesn't need
// to, its children already loop forever, and it exists purely as one
// controllable handle for createSpinBooster's timeScale() and cleanup's
// kill(). `vars` is merged into the parent's config (e.g. an onUpdate).
export function createTumble(target, seconds, vars = {}) {
    const sign = DISC_SPIN.direction < 0 ? '-' : '+';
    const tl = gsap.timeline({ defaults: { ease: 'none' }, ...vars });
    tl.to(target, { rotationY: `${sign}=360`, duration: seconds, repeat: -1 }, 0);
    tl.to(target, { rotationX: `${sign}=360`, duration: seconds * 1.35, repeat: -1 }, 0);
    tl.to(target, { rotationZ: `${sign}=360`, duration: seconds * 0.7, repeat: -1 }, 0);
    return tl;
}
