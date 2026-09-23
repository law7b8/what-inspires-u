import { useEffect, useRef, useState } from 'react';
import ImgFile from './ImgFile';
import DragToLaunch from './DragToLaunch';
import styles from './ImgForm.module.css';

// "artist - title.mp3"'s counterpart for a plain name: strips characters
// filesystems reject, falls back to "untitled" — same rule trackLookup.js
// uses for mp3 names, just without the artist/title split.
function imgFileName(name) {
    const safe = name.replace(/[\\/:*?"<>|]+/g, '').replace(/\s+/g, ' ').trim();
    return `${safe || 'untitled'}.img`;
}

// The "post img" sheet: drag an image in, or paste its URL, give it a name
// (and optional context), preview it as a Mac-style file icon, then press
// and hold DragToLaunch's handle to drag that preview anywhere on the page
// and drop it there — hands the drop point to the host via
// onLaunch(file, dropPoint), the same shape post-mp3's Mp3Form uses, so
// both land in one shared FloatingFiles layer. Entirely in-memory: a
// dropped file becomes a local object URL (never uploaded anywhere), same
// as mp3 files never touching a server.
export default function ImgForm({ className = '', onLaunch, onCancel }) {
    const objectUrlRef = useRef(null); // tracks the current blob: URL so it can be revoked when replaced
    const [cover, setCover] = useState('');
    const [urlInput, setUrlInput] = useState('');
    const [name, setName] = useState('');
    const [context, setContext] = useState('');
    const [dragOver, setDragOver] = useState(false);
    // the cover's own natural pixel size, once known — mirrors mp3's
    // embedWidth/embedHeight (from trackLookup.js's oEmbed read): Hero.jsx
    // uses it to open the enlarged window at 2x the image's real size
    // instead of always the flat 560px (2x the generic window width).
    const [naturalSize, setNaturalSize] = useState(null);

    useEffect(() => {
        if (!cover) { setNaturalSize(null); return; }
        let cancelled = false;
        const img = new Image();
        img.onload = () => { if (!cancelled) setNaturalSize({ width: img.naturalWidth, height: img.naturalHeight }); };
        img.src = cover;
        return () => { cancelled = true; };
    }, [cover]);

    const setCoverFromFile = (file) => {
        if (!file || !file.type.startsWith('image/')) return;
        if (objectUrlRef.current) URL.revokeObjectURL(objectUrlRef.current);
        const url = URL.createObjectURL(file);
        objectUrlRef.current = url;
        setCover(url);
    };

    const handleDrop = (e) => {
        e.preventDefault();
        setDragOver(false);
        setCoverFromFile(e.dataTransfer.files?.[0]);
    };

    const useUrl = () => {
        if (!urlInput.trim()) return;
        // switching to a pasted link — any local blob: URL from a dropped
        // file is no longer referenced, so release it
        if (objectUrlRef.current) {
            URL.revokeObjectURL(objectUrlRef.current);
            objectUrlRef.current = null;
        }
        setCover(urlInput.trim());
    };

    const canLaunch = Boolean(cover) && name.trim().length > 0;

    const launch = (dropPoint) => {
        onLaunch({
            cover, fileName: imgFileName(name), context: context.trim(),
            imgWidth: naturalSize?.width, imgHeight: naturalSize?.height,
        }, dropPoint);
        // ownership of the blob: URL (if any) passes to the floating file
        // that now renders it — don't revoke it out from under that <img>
        objectUrlRef.current = null;
        setCover('');
        setUrlInput('');
        setName('');
        setContext('');
        setNaturalSize(null);
    };

    return (
        <form onSubmit={(e) => e.preventDefault()} className={`polaroid ${className}`.trim()}>
            <div
                className={`${styles.dropzone} ${dragOver ? styles.dragOver : ''}`}
                onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                onDragLeave={() => setDragOver(false)}
                onDrop={handleDrop}
            >
                {cover ? 'drop to replace' : 'drag an image here'}
            </div>

            <div className={styles.urlRow}>
                <input
                    value={urlInput}
                    onChange={(e) => setUrlInput(e.target.value)}
                    placeholder="…or paste an image link"
                    inputMode="url"
                />
                <button type="button" className="btn" onClick={useUrl} disabled={!urlInput.trim()}>use</button>
            </div>

            <label>Name</label>
            <input value={name} onChange={(e) => setName(e.target.value)} placeholder="required" />

            <label>Context (optional)</label>
            <textarea value={context} onChange={(e) => setContext(e.target.value)} />

            {cover && (
                <div className={styles.preview}>
                    <ImgFile cover={cover} fileName={imgFileName(name)} />
                </div>
            )}

            <div style={{ display: 'flex', gap: '0.75rem' }}>
                <DragToLaunch
                    className="btn btn-success"
                    label="Post"
                    disabled={!canLaunch}
                    onDrop={launch}
                >
                    <ImgFile cover={cover} fileName={imgFileName(name)} />
                </DragToLaunch>
                {onCancel && (
                    <button type="button" className="btn" onClick={onCancel}>Cancel</button>
                )}
            </div>
        </form>
    );
}
