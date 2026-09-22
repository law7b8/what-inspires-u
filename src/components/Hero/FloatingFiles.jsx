import { useLayoutEffect, useRef } from 'react';
import { gsap } from 'gsap';
import Mp3File from './Mp3File';
import ImgFile from './ImgFile';
import styles from './FloatingFiles.module.css';

const rand = (min, max) => min + Math.random() * (max - min);
const reducedMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;

const CLICK_MOVE_THRESHOLD = 6; // px of pointer travel before a press counts as a drag, not a tap
const HOLD_SCALE = 1.18;
const TOSS_MAX_SPEED = 900; // px/s — caps how hard a fast flick can throw one
const TOSS_MIN_SPEED = 20;  // a near-zero-velocity release (picked up, set back down) still needs to drift off, not sit dead
// friction — every tick, speed eases back toward the file's own resting
// cruise speed (never all the way to 0; they're meant to drift forever,
// just not to keep cruising at whatever speed a toss or a bounce left them
// at). Exponential decay, so it's frame-rate independent and reads as a
// natural, gradually-fading slowdown rather than a linear one — most
// noticeable right after a hard toss (capped at TOSS_MAX_SPEED above),
// which calms back down to a normal float within a second or two instead
// of cruising fast indefinitely.
const FRICTION = 1.6; // higher = settles to cruise speed faster

// The .mp3/.img files dropped into the hero (via DragToLaunch, in
// ImgForm/Mp3Form) — one shared pool, kind-tagged per file
// (f.kind: 'mp3' | 'img') so they coexist and bounce off the same edges in
// the same space. Each one starts exactly where it was dropped
// (file.origin, viewport coords) already cruising in a random direction,
// then drifts around forever, bouncing off the screen's edges. One shared
// ticker steps every file; positions are written straight to element
// transforms (never React state) so it stays smooth.
//
// Holdable, Wii-Mii-Channel style: press and hold one and it stops
// floating, lifts/tilts like it's been picked up out of the crowd, and
// follows the pointer exactly while held (sim.held pauses the ticker's own
// physics for just that file — see the tick loop below). Let go after
// dragging it and it's tossed back into the crowd carrying the release
// velocity, same bounce physics as ever from there. Let go without ever
// dragging it (a plain tap) and it opens instead — onOpen(f) is the host
// (Hero) deciding what "open" means (a FileWindow); this component only
// fires the file's own data upward.
export default function FloatingFiles({ files, onOpen }) {
    const layerRef = useRef(null);
    const els = useRef(new Map());  // id -> element
    const sims = useRef(new Map()); // id -> simulation state
    const drags = useRef(new Map()); // id -> in-progress hold/drag state

    // start a simulation for each newly added file, drop ones that are gone
    useLayoutEffect(() => {
        const layer = layerRef.current;
        const bounds = layer.getBoundingClientRect();
        const reduced = reducedMotion();

        for (const f of files) {
            if (sims.current.has(f.id)) continue;
            const el = els.current.get(f.id);
            if (!el) continue;
            const w = el.offsetWidth;
            const h = el.offsetHeight;
            const sim = { el, w, h, vx: 0, vy: 0, cruise: rand(40, 75), held: false };

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
        if (reducedMotion()) return;
        const layer = layerRef.current;

        const tick = (time, deltaMs) => {
            const dt = Math.min(deltaMs, 50) / 1000;
            const W = layer.clientWidth;
            const H = layer.clientHeight;

            for (const s of sims.current.values()) {
                // held ones are being positioned directly by the pointer
                // handlers below instead — the physics sit out until it's
                // let go again
                if (s.held) continue;

                // friction — ease this tick's speed back toward the file's
                // own resting cruise speed, direction untouched. A no-op
                // once it's already cruising at that speed (the common
                // case), so this only really does anything right after a
                // bounce or a toss left it moving faster (or slower) than normal.
                const speed = Math.hypot(s.vx, s.vy);
                if (speed > 0.01) {
                    const decay = Math.exp(-FRICTION * dt);
                    const nextSpeed = s.cruise + (speed - s.cruise) * decay;
                    const pull = nextSpeed / speed;
                    s.vx *= pull;
                    s.vy *= pull;
                }

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

    // picked up — stops floating immediately and lifts/tilts like it's
    // been plucked out of the crowd. Doesn't yet know if this'll end up a
    // drag or a plain tap; that's decided on release, by whether it ever
    // crossed CLICK_MOVE_THRESHOLD.
    const onPickUp = (f) => (e) => {
        const sim = sims.current.get(f.id);
        const el = els.current.get(f.id);
        if (!sim || !el) return;
        el.setPointerCapture(e.pointerId);
        const bounds = layerRef.current.getBoundingClientRect();
        const px = e.clientX - bounds.left;
        const py = e.clientY - bounds.top;
        sim.held = true;
        drags.current.set(f.id, {
            // offset from the sim's own x/y to the exact point grabbed, so
            // it doesn't re-center under the pointer the instant it's picked up
            grabDX: px - sim.x, grabDY: py - sim.y,
            moved: false, lastX: px, lastY: py, lastT: performance.now(), vx: 0, vy: 0,
        });
        if (!reducedMotion()) {
            gsap.to(el.firstChild, {
                scale: HOLD_SCALE, rotation: rand(-6, 6), duration: 0.18, ease: 'back.out(2)',
            });
        }
    };

    const onHoldMove = (f) => (e) => {
        const drag = drags.current.get(f.id);
        const sim = sims.current.get(f.id);
        if (!drag || !sim) return;
        const bounds = layerRef.current.getBoundingClientRect();
        const px = e.clientX - bounds.left;
        const py = e.clientY - bounds.top;

        if (!drag.moved && (Math.abs(px - drag.lastX) > CLICK_MOVE_THRESHOLD || Math.abs(py - drag.lastY) > CLICK_MOVE_THRESHOLD)) {
            drag.moved = true;
        }

        // velocity from just this move, in px/s — what it'll be tossed
        // with if released right now
        const now = performance.now();
        const dt = Math.max(1, now - drag.lastT);
        drag.vx = (px - drag.lastX) / (dt / 1000);
        drag.vy = (py - drag.lastY) / (dt / 1000);
        drag.lastX = px; drag.lastY = py; drag.lastT = now;

        sim.x = gsap.utils.clamp(0, Math.max(0, layerRef.current.clientWidth - sim.w), px - drag.grabDX);
        sim.y = gsap.utils.clamp(0, Math.max(0, layerRef.current.clientHeight - sim.h), py - drag.grabDY);
        sim.el.style.transform = `translate3d(${sim.x}px, ${sim.y}px, 0)`;
    };

    // released — either tossed (carries the last move's velocity back into
    // the physics sim, same bounce behavior as ever from there) or, if it
    // never actually moved, treated as a plain tap that opens the file.
    const onLetGo = (f) => (e) => {
        const drag = drags.current.get(f.id);
        const sim = sims.current.get(f.id);
        const el = els.current.get(f.id);
        drags.current.delete(f.id);
        if (!drag || !sim) return;
        sim.held = false;
        if (!reducedMotion() && el) {
            gsap.to(el.firstChild, { scale: 1, rotation: 0, duration: 0.3, ease: 'back.out(2)' });
        }

        if (drag.moved) {
            const speed = Math.hypot(drag.vx, drag.vy);
            const clampScale = speed > TOSS_MAX_SPEED ? TOSS_MAX_SPEED / speed : 1;
            sim.vx = drag.vx * clampScale;
            sim.vy = drag.vy * clampScale;
            if (Math.hypot(sim.vx, sim.vy) < TOSS_MIN_SPEED) {
                const angle = rand(0, Math.PI * 2);
                sim.vx = Math.cos(angle) * sim.cruise;
                sim.vy = Math.sin(angle) * sim.cruise;
            }
        } else if (el) {
            onOpen?.(f, el.getBoundingClientRect());
        }
    };

    // a cancelled pointer (e.g. an OS gesture stealing it) just drops it
    // back into the crowd — never opens the file
    const onHoldCancel = (f) => () => {
        const drag = drags.current.get(f.id);
        const sim = sims.current.get(f.id);
        const el = els.current.get(f.id);
        drags.current.delete(f.id);
        if (!sim) return;
        sim.held = false;
        if (!reducedMotion() && el) {
            gsap.to(el.firstChild, { scale: 1, rotation: 0, duration: 0.3, ease: 'back.out(2)' });
        }
        if (drag?.moved) {
            const angle = rand(0, Math.PI * 2);
            sim.vx = Math.cos(angle) * sim.cruise;
            sim.vy = Math.sin(angle) * sim.cruise;
        }
    };

    return (
        <div className={styles.layer} ref={layerRef}>
            {files.map((f) => (
                <button
                    type="button"
                    key={f.id}
                    className={styles.floater}
                    onPointerDown={onPickUp(f)}
                    onPointerMove={onHoldMove(f)}
                    onPointerUp={onLetGo(f)}
                    onPointerCancel={onHoldCancel(f)}
                    // real pointer taps are handled by onLetGo above (it
                    // knows whether the press ever turned into a drag,
                    // which a plain click event can't tell); this only
                    // ever catches keyboard activation (Enter/Space on a
                    // focused button), same distinction DragToLaunch makes
                    onClick={(e) => { if (e.detail === 0) onOpen?.(f, e.currentTarget.getBoundingClientRect()); }}
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
