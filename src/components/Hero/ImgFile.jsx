import { useEffect, useState } from 'react';
// Reuses Mp3File's stylesheet rather than duplicating it — same Mac-Finder-
// style square icon treatment (rounded thumbnail, corner badge, frosted
// name pill), just with an "img" badge and a picture-frame fallback glyph
// instead of a music note. Any future tweak to that look (radius, size,
// label color) applies to both file kinds for free.
import styles from './Mp3File.module.css';

// The img counterpart to Mp3File — a dropped/pasted image shot into the
// hero from the "post img" sheet. Purely presentational, same as Mp3File.
export default function ImgFile({ cover, fileName, className = '' }) {
    const [failed, setFailed] = useState(false);
    useEffect(() => setFailed(false), [cover]);

    return (
        <div className={`${styles.file} ${className}`.trim()}>
            <div className={styles.thumbWrap}>
                {cover && !failed ? (
                    <div className={styles.thumb}>
                        <img src={cover} alt="" draggable={false} onError={() => setFailed(true)} />
                    </div>
                ) : (
                    <div className={`${styles.thumb} ${styles.noCover}`} aria-hidden="true">🖼</div>
                )}
                <span className={styles.badge}>img</span>
            </div>
            <div className={styles.label}>{fileName}</div>
        </div>
    );
}
