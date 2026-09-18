import { gsap } from 'gsap';

// Generalized spin booster — lets a perpetual GSAP timeline be sped up
// temporarily by whatever's currently driving it (scroll velocity, cursor
// speed while it sweeps over the element, ...) via its own independent
// decay-back-to-1 timer, so multiple input sources never need to
// coordinate directly with each other — whichever fires most recently
// just nudges timeScale, and it eases back to 1x a beat after that source
// goes quiet. Shared by CaseDisc, LogoDisc, and Hero's own scroll-velocity
// hookup, so all three spin boosts behave identically.
export function createSpinBooster(timeline) {
    let decayTimer = null;
    function boost(amount) {
        gsap.killTweensOf(timeline);
        timeline.timeScale(1 + amount);
        clearTimeout(decayTimer);
        decayTimer = setTimeout(() => {
            gsap.to(timeline, { timeScale: 1, duration: 1.2, ease: 'power2.out' });
        }, 120);
    }
    boost.cancel = () => clearTimeout(decayTimer);
    return boost;
}
