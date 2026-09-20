import { useEffect, useState } from 'react';

// Headless — no visible buttons (those were removed; the + menu's own
// "screenshot" option covers that now). All this does is toggle a plain
// attribute on <html> when "h" is pressed (skipped while typing in a
// field) — every HUD piece (PlusMenu, Header, Hero's fixed footer) fades
// itself out via a `:global(html[data-hud-hidden]) .xyz` rule in its own
// module.css, rather than this component reaching into components it
// doesn't own. The footer's own "press h to hide hud" text is what tells
// people this exists, since there's nothing on screen for it otherwise.
export default function HudControls() {
    const [hidden, setHidden] = useState(false);

    useEffect(() => {
        document.documentElement.toggleAttribute('data-hud-hidden', hidden);
        return () => document.documentElement.removeAttribute('data-hud-hidden');
    }, [hidden]);

    useEffect(() => {
        const onKey = (e) => {
            if (e.metaKey || e.ctrlKey || e.altKey) return;
            const tag = e.target.tagName;
            if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || e.target.isContentEditable) return;
            if (e.key.toLowerCase() === 'h') setHidden((h) => !h);
        };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, []);

    return null;
}
