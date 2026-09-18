import { useRef, useState } from 'react';
import Mp3File from '../Mp3File/Mp3File';
import { lookupTrack, mp3FileName } from '../../utils/trackLookup';
import styles from './Mp3Form.module.css';

// The "post mp3" sheet: paste a YouTube / SoundCloud / Spotify link, the
// track's artist/title/cover are looked up (and stay editable — Spotify
// doesn't supply an artist), a Finder-style .mp3 file preview appears, and
// "shoot into hero" hands it to the host via onLaunch(track, origin), where
// origin is the preview's on-screen center so the file can fire from there.
export default function Mp3Form({ className = '', onLaunch, onCancel }) {
    const previewRef = useRef(null);
    const [url, setUrl] = useState('');
    const [track, setTrack] = useState(null); // { artist, title, cover, source }
    const [status, setStatus] = useState('idle'); // idle | loading | error
    const [error, setError] = useState('');

    const fileName = track ? mp3FileName(track.artist, track.title) : '';

    const find = async () => {
        if (!url.trim()) return;
        setStatus('loading');
        setError('');
        try {
            setTrack(await lookupTrack(url));
            setStatus('idle');
        } catch (err) {
            setTrack(null);
            setError(err.message);
            setStatus('error');
        }
    };

    const launch = () => {
        const rect = previewRef.current.getBoundingClientRect();
        onLaunch({ ...track, fileName }, { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 });
        setUrl('');
        setTrack(null);
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        if (track) launch();
        else find();
    };

    const edit = (field) => (e) => setTrack((t) => ({ ...t, [field]: e.target.value }));

    return (
        <form onSubmit={handleSubmit} className={`polaroid ${className}`.trim()}>
            <label>Link (youtube, soundcloud or spotify)</label>
            <input
                value={url}
                onChange={(e) => { setUrl(e.target.value); setTrack(null); setStatus('idle'); }}
                placeholder="https://…"
                inputMode="url"
            />
            {status === 'error' && <p className={styles.error} role="alert">{error}</p>}

            {track && (
                <>
                    <label>Artist</label>
                    <input value={track.artist} onChange={edit('artist')} />
                    <label>Title</label>
                    <input value={track.title} onChange={edit('title')} />
                    <div className={styles.preview} ref={previewRef}>
                        <Mp3File cover={track.cover} source={track.source} fileName={fileName} />
                    </div>
                </>
            )}

            <div style={{ display: 'flex', gap: '0.75rem' }}>
                <button type="submit" className="btn btn-success" disabled={status === 'loading' || (!track && !url.trim())}>
                    {status === 'loading' ? 'Finding...' : track ? 'Shoot into hero' : 'Find'}
                </button>
                {onCancel && (
                    <button type="button" className="btn" onClick={onCancel}>Cancel</button>
                )}
            </div>
        </form>
    );
}
