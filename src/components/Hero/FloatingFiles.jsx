import { useLayoutEffect, useRef } from 'react';
import { gsap } from 'gsap';
import Mp3File from '../Mp3File/Mp3File';
import styles from './FloatingFiles.module.css';

const LAUNCH_SPEED = 1500;   // px/s the file leaves the sheet at
const LAUNCH_DRAG = 1.6;     // how fast that speed bleeds off (1/s)
const SPIN_DRAG = 2.2;
const rand = (min, max) => min + Math.random() * (max - min);

// The .mp3 files "shot" into the hero. Each one is fired from the on-screen
// spot it was launched from (file.origin, viewport coords) toward a random
// point in the hero, then drifts around forever, bouncing off the hero's
// edges. One shared ticker steps every file; positions are written straight
// to element transforms (never React state) so it stays smooth.
export default function FloatingFiles({ files }) {
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
            const sim = { el, w, h, rot: 0, vr: 0, cvr: 0, vx: 0, vy: 0, cruise: rand(40, 75) };

            if (reduced) {
                // no flying: just settle somewhere in the hero
                sim.x = rand(0, Math.max(0, bounds.width - w));
                sim.y = rand(0, Math.max(0, bounds.height - h));
            } else {
                sim.x = f.origin.x - bounds.left - w / 2;
                sim.y = f.origin.y - bounds.top - h / 2;
                const tx = rand(bounds.width * 0.3, bounds.width * 0.85);
                const ty = rand(bounds.height * 0.15, bounds.height * 0.85);
                const angle = Math.atan2(ty - (sim.y + h / 2), tx - (sim.x + w / 2));
                sim.vx = Math.cos(angle) * LAUNCH_SPEED;
                sim.vy = Math.sin(angle) * LAUNCH_SPEED;
                sim.cvr = (Math.random() < 0.5 ? -1 : 1) * rand(4, 10);
                sim.vr = (Math.random() < 0.5 ? -1 : 1) * rand(500, 800);
                sim.rot = rand(-25, 25);

                // the "shot" landing — pops in from small
                gsap.fromTo(el.firstChild, { scale: 0.35, opacity: 0.4 }, { scale: 1, opacity: 1, duration: 0.5, ease: 'back.out(2)' });
            }
            el.style.opacity = '1';
            el.style.transform = `translate3d(${sim.x}px, ${sim.y}px, 0) rotate(${sim.rot}deg)`;
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
                // bleed the launch speed down to a slow cruise, keeping direction
                const speed = Math.hypot(s.vx, s.vy) || 1;
                const next = s.cruise + (speed - s.cruise) * Math.exp(-LAUNCH_DRAG * dt);
                s.vx *= next / speed;
                s.vy *= next / speed;
                s.vr = s.cvr + (s.vr - s.cvr) * Math.exp(-SPIN_DRAG * dt);

                s.x += s.vx * dt;
                s.y += s.vy * dt;
                s.rot += s.vr * dt;

                // bounce off the hero's edges (clamped, so a resize or a
                // launch from outside the box pulls it back in)
                if (s.x < 0) { s.x = 0; s.vx = Math.abs(s.vx); s.vr += rand(-40, 40); }
                else if (s.x + s.w > W) { s.x = Math.max(0, W - s.w); s.vx = -Math.abs(s.vx); s.vr += rand(-40, 40); }
                if (s.y < 0) { s.y = 0; s.vy = Math.abs(s.vy); s.vr += rand(-40, 40); }
                else if (s.y + s.h > H) { s.y = Math.max(0, H - s.h); s.vy = -Math.abs(s.vy); s.vr += rand(-40, 40); }

                s.el.style.transform = `translate3d(${s.x}px, ${s.y}px, 0) rotate(${s.rot}deg)`;
            }
        };

        gsap.ticker.add(tick);
        return () => gsap.ticker.remove(tick);
    }, []);

    return (
        <div className={styles.layer} ref={layerRef} aria-hidden="true">
            {files.map((f) => (
                <div
                    key={f.id}
                    className={styles.floater}
                    ref={(el) => { if (el) els.current.set(f.id, el); else els.current.delete(f.id); }}
                >
                    <Mp3File cover={f.cover} source={f.source} fileName={f.fileName} />
                </div>
            ))}
        </div>
    );
}
