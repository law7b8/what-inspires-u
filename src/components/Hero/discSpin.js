import { gsap } from 'gsap';

// The CD case and the tempo logo spin as a pair: both turn on the Y axis
// only, in the same direction, at different rates. Keeping both numbers (and
// the direction) here means they're tuned together in one place. OptionsMenu
// is deliberately not part of this — it keeps its own separate tumble.
export const DISC_SPIN = {
    direction: -1,               // -1 = negative rotation, 1 = positive
    case: { seconds: 40 },       // seconds per full turn
    logo: { seconds: 24 },
};

// A forever Y-axis turn on `target`. Returns the timeline so callers can hand
// it to createSpinBooster and kill it on cleanup. `vars` is merged into the
// timeline config (e.g. an onUpdate).
export function createYSpin(target, seconds, vars = {}) {
    const sign = DISC_SPIN.direction < 0 ? '-' : '+';
    return gsap
        .timeline({ repeat: -1, defaults: { ease: 'none' }, ...vars })
        .to(target, { rotationY: `${sign}=360`, duration: seconds }, 0);
}
