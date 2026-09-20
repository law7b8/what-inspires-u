import { useEffect, useState } from 'react';
import styles from './Mp3File.module.css';

// A macOS Finder/QuickLook-style media preview: the album cover itself IS
// the icon — a plain rounded-square thumbnail with a soft drop shadow, a
// small "mp3" badge overlaid in the corner, and the file name underneath in
// the selected-label blue. (No folded-page-document frame — that look is
// for blank text files in Finder, not media with real artwork to show.)
// Purely presentational — used for the preview in the sheet and for the
// files floating in the hero.
export default function Mp3File({ cover, fileName, source, className = '' }) {
    const [failed, setFailed] = useState(false);
    useEffect(() => setFailed(false), [cover]);

    return (
        <div className={`${styles.file} ${className}`.trim()}>
            <div className={styles.thumbWrap}>
                {cover && !failed ? (
                    // YouTube thumbnails are letterboxed 4:3 — zooming in
                    // crops the black bars, leaving the centered square
                    <div className={`${styles.thumb} ${source === 'youtube' ? styles.zoom : ''}`}>
                        <img src={cover} alt="" draggable={false} onError={() => setFailed(true)} />
                    </div>
                ) : (
                    <div className={`${styles.thumb} ${styles.noCover}`} aria-hidden="true">♪</div>
                )}
                <span className={styles.badge}>mp3</span>
            </div>
            <div className={styles.label}>{fileName}</div>
        </div>
    );
}
