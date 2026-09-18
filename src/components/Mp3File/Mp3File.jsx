import { useEffect, useState } from 'react';
import styles from './Mp3File.module.css';

// A Finder-style file icon: a page with a folded corner holding the album
// cover as a square, an "mp3" tag, and the file name underneath in the
// selected-label blue. Purely presentational — used for the preview in the
// sheet and for the files floating in the hero.
export default function Mp3File({ cover, fileName, source, className = '' }) {
    const [failed, setFailed] = useState(false);
    useEffect(() => setFailed(false), [cover]);

    return (
        <div className={`${styles.file} ${className}`.trim()}>
            <div className={styles.pageWrap}>
                <div className={styles.page}>
                    {cover && !failed ? (
                        // YouTube thumbnails are letterboxed 4:3 — zooming in
                        // crops the black bars, leaving the centered square
                        <div className={`${styles.cover} ${source === 'youtube' ? styles.zoom : ''}`}>
                            <img src={cover} alt="" draggable={false} onError={() => setFailed(true)} />
                        </div>
                    ) : (
                        <div className={`${styles.cover} ${styles.noCover}`} aria-hidden="true">♪</div>
                    )}
                    <span className={styles.tag}>mp3</span>
                </div>
            </div>
            <div className={styles.label}>{fileName}</div>
        </div>
    );
}
