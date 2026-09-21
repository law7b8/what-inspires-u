import { useLayoutEffect, useRef } from 'react';
import { gsap } from 'gsap';
import Mp3File from './Mp3File';
import ImgFile from './ImgFile';
import styles from './FloatingFiles.module.css';

const rand = (min, max) => min + Math.random() * (max - min);

// The .mp3/.img files dropped into the hero (via DragToLaunch, in
// ImgForm/Mp3Form) — one shared pool, kind-tagged per file
// (f.kind: 'mp3' | 'img') so they coexist and bounce off the same edges in
// the same space. Each one starts exactly where it was dropped
// (file.origin, viewport coords) already cruising in a random direction,
// then drifts around forever, bouncing off the screen's edges. One shared
// ticker steps every file; positions are written straight to element
// transforms (never React state) so it stays smooth. Clicking one calls
// onOpen(f) — the host (Hero) decides what "open" means (a FileWindow),
// this component only fires the file's own data upward.
export default function FloatingFiles({ files, onOpen }) {
    const layerRef = useRef(null);
    const els = useRef(new Map());  // id -> element
    const sims = useRef(new Map()); // id -> simulation state

    // start a simulation for each newly added file, drop ones that are gone
    useLayoutEffect(() => {
        const layer = layerRef.current;
        const bounds = layer.getBoundingClientRect();
        const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

        for (const f of files) {
            if (sims.current.has(f.id)) continue;
            const el = els.current.get(f.id);
            if (!el) continue;
            const w = el.offsetWidth;
            const h = el.offsetHeight;
            const sim = { el, w, h, vx: 0, vy: 0, cruise: rand(40, 75) };

            if (reduced) {
                // no flying: just settle somewhere in the hero
                sim.x = rand(0, Math.max(0, bounds.width - w));
                sim.y = rand(0, Math.max(0, bounds.height - h));
            } else {
                // starts exactly at the drop point, immediately cruising
                // off in a random direction — no separate "shot" phase
                // (there's no fixed launch spot to shoot from anymore now
                // that DragToLaunch lets it get dropped anywhere)
                sim.x = f.origin.x - bounds.left - w / 2;
                sim.y = f.origin.y - bounds.top - h / 2;
                const angle = rand(0, Math.PI * 2);
                sim.vx = Math.cos(angle) * sim.cruise;
                sim.vy = Math.sin(angle) * sim.cruise;

                // pops in from small right where it was dropped
                gsap.fromTo(el.firstChild, { scale: 0.35, opacity: 0.4 }, { scale: 1, opacity: 1, duration: 0.5, ease: 'back.out(2)' });
            }
            el.style.opacity = '1';
            el.style.transform = `translate3d(${sim.x}px, ${sim.y}px, 0)`;
            sims.current.set(f.id, sim);
        }

        const live = new Set(files.map((f) => f.id));
        for (const id of [...sims.current.keys()]) if (!live.has(id)) sims.current.delete(id);
    }, [files]);

    useLayoutEffect(() => {
        if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
        const layer = layerRef.current;

        const tick = (time, deltaMs) => {
            const dt = Math.min(deltaMs, 50) / 1000;
            const W = layer.clientWidth;
            const H = layer.clientHeight;

            for (const s of sims.current.values()) {
                s.x += s.vx * dt;
                s.y += s.vy * dt;

                // bounce off the hero's edges (clamped, so a resize or a
                // launch from outside the box pulls it back in)
                if (s.x < 0) { s.x = 0; s.vx = Math.abs(s.vx); }
                else if (s.x + s.w > W) { s.x = Math.max(0, W - s.w); s.vx = -Math.abs(s.vx); }
                if (s.y < 0) { s.y = 0; s.vy = Math.abs(s.vy); }
                else if (s.y + s.h > H) { s.y = Math.max(0, H - s.h); s.vy = -Math.abs(s.vy); }

                s.el.style.transform = `translate3d(${s.x}px, ${s.y}px, 0)`;
            }
        };

        gsap.ticker.add(tick);
        return () => gsap.ticker.remove(tick);
    }, []);

    return (
        <div className={styles.layer} ref={layerRef}>
            {files.map((f) => (
                <button
                    type="button"
                    key={f.id}
                    className={styles.floater}
                    onClick={() => onOpen?.(f)}
                    aria-label={`open ${f.fileName}`}
                    ref={(el) => { if (el) els.current.set(f.id, el); else els.current.delete(f.id); }}
                >
                    {f.kind === 'img'
                        ? <ImgFile cover={f.cover} fileName={f.fileName} />
                        : <Mp3File cover={f.cover} source={f.source} fileName={f.fileName} />}
                </button>
            ))}
        </div>
    );
}
