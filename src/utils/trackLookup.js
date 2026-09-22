// Resolves a YouTube / SoundCloud / Spotify link to { artist, title, cover,
// source } using each service's public oEmbed endpoint — free, no API key,
// CORS-enabled. This only reads metadata; nothing is downloaded or converted
// (the ".mp3" the UI shows is a visual, not a real audio file).
//
// Spotify's oEmbed returns the track name but not the artist, so `artist`
// comes back empty there — the form lets the user fill it in.

const ENDPOINTS = [
    { source: 'youtube', match: /(^|\.)youtube\.com$|^youtu\.be$/, url: (u) => `https://www.youtube.com/oembed?format=json&url=${u}` },
    { source: 'soundcloud', match: /(^|\.)soundcloud\.com$/, url: (u) => `https://soundcloud.com/oembed?format=json&url=${u}` },
    { source: 'spotify', match: /^open\.spotify\.com$/, url: (u) => `https://open.spotify.com/oembed?url=${u}` },
];

// noise YouTube titles carry: "(Official Video)", "[4K Remaster]", …
const NOISE = /\s*[([][^)\]]*(official|video|audio|lyric|visuali[sz]er|remaster|hd|4k)[^)\]]*[)\]]/gi;

function clean(text) {
    return text.replace(NOISE, '').replace(/\s+/g, ' ').trim();
}

function parse(source, data) {
    const author = (data.author_name || '').replace(/\s*-\s*Topic$/i, '').replace(/VEVO$/i, '').trim();
    let title = clean(data.title || '');
    let artist = author;

    if (source === 'youtube') {
        // "Artist - Title" is the common upload convention
        const split = title.split(/\s+[-–—]\s+/);
        if (split.length >= 2) {
            artist = split[0].trim();
            title = split.slice(1).join(' - ').trim();
        }
    } else if (source === 'soundcloud') {
        // oEmbed titles are "Track by Artist"
        const suffix = ` by ${data.author_name}`;
        if (data.author_name && title.endsWith(suffix)) title = title.slice(0, -suffix.length).trim();
    } else if (source === 'spotify') {
        artist = '';
    }

    // oEmbed's whole point is providing ready-to-insert embeddable HTML —
    // an <iframe> from the source service itself, complete with real
    // playback controls. Safe to trust here specifically because it only
    // ever comes from one of the 3 hardcoded ENDPOINTS above (never an
    // arbitrary URL the visitor could smuggle in) and is rendered nowhere
    // but the file's own "open" window.
    //
    // oEmbed also hands back the embed's own native width/height as plain
    // JSON fields (separate from the html string) — a YouTube video's real
    // aspect ratio, not necessarily 16:9. Only kept when both are actual
    // finite numbers: YouTube always supplies them; SoundCloud sometimes
    // reports width as "100%" (a string) rather than a pixel value, which
    // isn't a usable ratio, so embedWidth/embedHeight just come back
    // undefined there and the enlarged window falls back to its normal
    // fixed size instead of trying to force a ratio out of nothing.
    const width = Number(data.width);
    const height = Number(data.height);
    const hasRatio = Number.isFinite(width) && Number.isFinite(height) && width > 0 && height > 0;

    return {
        artist, title, cover: data.thumbnail_url || '', source, embed: data.html || '',
        ...(hasRatio && { embedWidth: width, embedHeight: height }),
    };
}

export async function lookupTrack(rawUrl) {
    let parsed;
    try {
        parsed = new URL(rawUrl.trim());
    } catch {
        throw new Error('that doesn’t look like a link');
    }
    const endpoint = ENDPOINTS.find((e) => e.match.test(parsed.hostname));
    if (!endpoint) throw new Error('paste a youtube, soundcloud or spotify link');

    let res;
    try {
        res = await fetch(endpoint.url(encodeURIComponent(parsed.href)));
    } catch {
        throw new Error('couldn’t reach ' + endpoint.source);
    }
    if (!res.ok) throw new Error('couldn’t find that track');
    return parse(endpoint.source, await res.json());
}

// "artist - title.mp3", with characters filesystems reject stripped out
export function mp3FileName(artist, title) {
    const safe = (s) => s.replace(/[\\/:*?"<>|]+/g, '').replace(/\s+/g, ' ').trim();
    const parts = [safe(artist), safe(title)].filter(Boolean);
    return `${parts.join(' - ') || 'untitled'}.mp3`;
}
