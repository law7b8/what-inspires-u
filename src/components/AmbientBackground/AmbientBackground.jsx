import styles from './AmbientBackground.module.css';

// Whole-site ambient backdrop — soft lavender light drifting behind
// everything, plus a fine dust-speck texture crawling slowly across it.
// Pure CSS (no GSAP/JS): nothing here needs per-frame JS control, just
// looping keyframes, so this stays a static, zero-JS layer instead of
// carrying an effect/cleanup like Hero's own components do.
export default function AmbientBackground() {
    return (
        <div className={styles.ambientBackground} aria-hidden="true">
            <div className={styles.blobOne} />
            <div className={styles.blobTwo} />
            <div className={styles.blobThree} />
            <div className={styles.dust} />
        </div>
    );
}
