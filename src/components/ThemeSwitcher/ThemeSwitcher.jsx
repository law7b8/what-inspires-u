import { useEffect, useState } from 'react';
import styles from './ThemeSwitcher.module.css';

// Palette picker (themes live in tokens.css). Sets data-theme on <html>;
// press 1 / 2 or click a chip. Paper is the default (and what :root in
// tokens.css already is, so there's no flash); dusk is the secondary.
// Remembered in localStorage.
const DEFAULT = 'paper';
const THEMES = [
    { id: 'paper', label: '1 paper' },
    { id: 'dusk', label: '2 dusk' },
];
const KEY = 'wiy-theme-v3'; // bumped so a saved choice from before the default changed doesn't override paper

function readSaved() {
    try {
        const saved = localStorage.getItem(KEY);
        return THEMES.some((t) => t.id === saved) ? saved : DEFAULT;
    } catch {
        return DEFAULT;
    }
}

export default function ThemeSwitcher() {
    const [theme, setTheme] = useState(readSaved);

    useEffect(() => {
        document.documentElement.dataset.theme = theme;
        try { localStorage.setItem(KEY, theme); } catch { /* storage blocked — fine */ }
    }, [theme]);

    useEffect(() => {
        const onKey = (e) => {
            if (e.metaKey || e.ctrlKey || e.altKey) return;
            const tag = e.target.tagName;
            if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || e.target.isContentEditable) return;
            const next = THEMES[Number(e.key) - 1];
            if (next) setTheme(next.id);
        };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, []);

    return (
        <div className={styles.switcher} role="group" aria-label="color theme">
            {THEMES.map((t) => (
                <button
                    key={t.id}
                    type="button"
                    className={`${styles.chip} ${theme === t.id ? styles.on : ''}`}
                    onClick={() => setTheme(t.id)}
                    aria-pressed={theme === t.id}
                >
                    {t.label}
                </button>
            ))}
        </div>
    );
}
