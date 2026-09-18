import { useEffect, useRef } from 'react';

// PS3 / XMB-style animated background: glowing wave ribbons plus drifting
// dust particles, drawn on a fixed full-screen <canvas>.
//
// COLORS are not props: they come from the theme in src/styles/tokens.css
// (section F, --wiy-wave-*), so the waves change with the theme and update
// live when that file is saved.
//
// Every prop is read live from a ref, so changing one (e.g. dragging a speed
// slider) applies on the next frame without restarting the animation or
// resetting the particles.
//
//   waveSpeed      0.1–2.0   ribbon animation speed
//   waveAmplitude  0.2–2.0   how tall the waves are
//   ribbonCount    1–5      (one per --wiy-wave-N color)
//   glowIntensity  0–1.5     ribbon glow
//   particleAmount 0–150
//   particleSpeed  0.1–1.5
//   opacity        0–1       the whole canvas, blended over the page's own background
//   noise          0–1       film-grain strength laid over the background (0 = off)
//   quality        0.25–1    render scale; the glow is soft, so 0.5 looks the same at ~1/4 the cost

// Used only if a --wiy-wave-* variable is missing from the theme.
const FALLBACK = {
    top: '#0a0314',
    bottom: '#280a3f',
    ribbons: ['#6c1db2', '#8d21d9', '#461580', '#aa4ae2', '#2f0f5c'],
    dust: '220, 180, 255',
};

// Reads the wave palette from the active theme's CSS variables. Any CSS color
// is accepted: the canvas normalizes it to #rrggbb, which is what withAlpha
// needs. An unparseable value keeps the fallback.
function readPalette(ctx) {
    const cs = getComputedStyle(document.documentElement);
    const get = (name, fallback) => cs.getPropertyValue(name).trim() || fallback;
    const hex = (css, fallback) => {
        ctx.fillStyle = fallback; // if css is invalid the assignment is ignored, leaving this
        ctx.fillStyle = css;
        return String(ctx.fillStyle);
    };
    return {
        bgTop: hex(get('--wiy-wave-top', FALLBACK.top), FALLBACK.top),
        bgBottom: hex(get('--wiy-wave-bottom', FALLBACK.bottom), FALLBACK.bottom),
        ribbons: FALLBACK.ribbons.map((fb, i) => hex(get(`--wiy-wave-${i + 1}`, fb), fb)),
        particles: get('--wiy-wave-dust', FALLBACK.dust),
    };
}

// '#rrggbb' -> 'rgba(r, g, b, a)'. Used so gradients fade to the same color at
// alpha 0 instead of 'transparent' (black at alpha 0), which can leave a
// gray fringe on some browsers' gradient interpolation. Non-hex input (e.g. a
// color with its own alpha) just gets a transparent black end stop.
function withAlpha(hex, a) {
    if (hex[0] !== '#') return 'rgba(0, 0, 0, 0)';
    const n = parseInt(hex.slice(1), 16);
    return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${a})`;
}

const MAX_PARTICLES = 150;

// Film grain: a tiny SVG fractal-noise tile repeated across the screen. Pure
// CSS — no per-frame cost, unlike drawing noise into the canvas. Raw
// feTurbulence is a pale, half-transparent veil, so the filter re-tones it:
// grayscale, stretched contrast, centered on mid-gray and fully opaque —
// which is what mix-blend-mode: overlay wants (mid-gray = no change, lighter
// and darker specks = grain). sRGB keeps those numbers predictable.
const NOISE_TILE =
    "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='220' height='220'%3E" +
    "%3Cfilter id='n' color-interpolation-filters='sRGB'%3E" +
    "%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='3' stitchTiles='stitch'/%3E" +
    "%3CfeColorMatrix type='saturate' values='0'/%3E" +
    "%3CfeComponentTransfer%3E" +
    "%3CfeFuncR type='linear' slope='3' intercept='-1.03'/%3E" +
    "%3CfeFuncG type='linear' slope='3' intercept='-1.03'/%3E" +
    "%3CfeFuncB type='linear' slope='3' intercept='-1.03'/%3E" +
    "%3CfeFuncA type='linear' slope='0' intercept='1'/%3E" +
    "%3C/feComponentTransfer%3E%3C/filter%3E" +
    "%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")";

export default function PS3Background({
    waveSpeed = 0.5,
    waveAmplitude = 1.0,
    ribbonCount = 4,
    glowIntensity = 0.8,
    particleAmount = 60,
    particleSpeed = 0.4,
    opacity = 0.3,
    noise = 0.35,
    quality = 0.5,
}) {
    const canvasRef = useRef(null);

    // latest props, read inside the animation loop every frame
    const live = useRef({});
    live.current = { waveSpeed, waveAmplitude, ribbonCount, glowIntensity, particleAmount, particleSpeed, quality };

    useEffect(() => {
        const canvas = canvasRef.current;
        const ctx = canvas?.getContext('2d');
        if (!canvas || !ctx) return;

        const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        let width = 0;
        let height = 0;
        let scale = 1;
        let raf = 0;
        let time = 0;
        let last = performance.now();
        let palette = readPalette(ctx);
        let lastPaletteRead = last;
        const refreshPalette = () => {
            palette = readPalette(ctx);
            lastPaletteRead = performance.now();
        };

        const particles = Array.from({ length: MAX_PARTICLES }, () => ({
            x: Math.random() * window.innerWidth,
            y: Math.random() * window.innerHeight,
            size: Math.random() * 2.5 + 0.8,
            speedX: (Math.random() - 0.5) * 0.3,
            speedY: -Math.random() * 0.4 - 0.1,
            baseAlpha: Math.random() * 0.6 + 0.2,
            pulsePhase: Math.random() * Math.PI * 2,
        }));

        const resize = () => {
            scale = live.current.quality;
            width = window.innerWidth;
            height = window.innerHeight;
            canvas.width = Math.round(width * scale);
            canvas.height = Math.round(height * scale);
            // draw in CSS-pixel units; the backing store is just smaller
            ctx.setTransform(scale, 0, 0, scale, 0, 0);
            if (reduced) draw(0);
        };

        // dt is in seconds. The original stepped per frame at 60fps, so
        // (0.008 * 60) per second keeps the same feel at any frame rate.
        function draw(dt) {
            const p = live.current;
            // re-read the theme colors at most twice a second: cheap, and it
            // picks up an edited tokens.css without a reload
            const now = performance.now();
            if (now - lastPaletteRead > 500) refreshPalette();
            time += 0.48 * p.waveSpeed * dt;

            // 1. background gradient
            const bg = ctx.createLinearGradient(0, 0, 0, height);
            bg.addColorStop(0, palette.bgTop);
            bg.addColorStop(1, palette.bgBottom);
            ctx.globalAlpha = 1;
            ctx.globalCompositeOperation = 'source-over';
            ctx.fillStyle = bg;
            ctx.fillRect(0, 0, width, height);

            // 2. glowing ribbons
            const numRibbons = Math.min(p.ribbonCount, palette.ribbons.length);
            ctx.globalCompositeOperation = 'screen';

            for (let r = 0; r < numRibbons; r++) {
                const color = palette.ribbons[r % palette.ribbons.length];
                const layerOffset = r * 1.3;
                const segments = 80;
                const step = width / segments;

                ctx.beginPath();
                for (let i = 0; i <= segments; i++) {
                    const x = i * step;
                    const normX = x / width;
                    const wave1 = Math.sin(normX * 3.5 + time + layerOffset) * 90 * p.waveAmplitude;
                    const wave2 = Math.cos(normX * 1.8 - time * 0.7 + layerOffset * 2) * 60 * p.waveAmplitude;
                    const wave3 = Math.sin(normX * 7.0 + time * 1.4) * 20 * p.waveAmplitude;
                    const y = height * 0.52 + wave1 + wave2 + wave3 + (r - numRibbons / 2) * 35;
                    if (i === 0) ctx.moveTo(x, y);
                    else ctx.lineTo(x, y);
                }
                ctx.lineTo(width, height + 100);
                ctx.lineTo(0, height + 100);
                ctx.closePath();

                const grad = ctx.createLinearGradient(0, height * 0.2, 0, height);
                grad.addColorStop(0, color);
                grad.addColorStop(1, withAlpha(color, 0));

                ctx.fillStyle = grad;
                ctx.shadowColor = color;
                // shadowBlur is in backing-store pixels, not affected by the
                // transform, so it scales with the render scale by hand
                ctx.shadowBlur = 40 * p.glowIntensity * scale;
                ctx.globalAlpha = 0.35 + Math.sin(time + r) * 0.08;
                ctx.fill();
            }

            ctx.shadowBlur = 0;

            // 3. particles
            const count = Math.min(p.particleAmount, MAX_PARTICLES);
            const frames = dt * 60; // per-frame step at 60fps
            ctx.globalAlpha = 1;
            for (let i = 0; i < count; i++) {
                const pt = particles[i];
                pt.x += pt.speedX * p.particleSpeed * frames;
                pt.y += pt.speedY * p.particleSpeed * frames;
                pt.pulsePhase += 0.02 * frames;

                if (pt.y < -10) {
                    pt.y = height + 10;
                    pt.x = Math.random() * width;
                }
                if (pt.x < -10) pt.x = width + 10;
                if (pt.x > width + 10) pt.x = -10;

                const alpha = Math.max(0.05, Math.min(0.9, pt.baseAlpha + Math.sin(pt.pulsePhase) * 0.2));
                ctx.beginPath();
                ctx.arc(pt.x, pt.y, pt.size, 0, Math.PI * 2);
                ctx.fillStyle = `rgba(${palette.particles}, ${alpha})`;
                ctx.fill();
            }

            ctx.globalCompositeOperation = 'source-over';
        }

        const loop = (now) => {
            const dt = Math.min((now - last) / 1000, 0.05); // clamp so a stalled tab doesn't jump
            last = now;
            draw(dt);
            raf = requestAnimationFrame(loop);
        };

        // switching theme repaints the waves in the new colors right away
        const themeObserver = new MutationObserver(() => {
            refreshPalette();
            if (reduced) draw(0);
        });
        themeObserver.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });

        resize();
        window.addEventListener('resize', resize);
        // reduced motion: a single still frame, no loop
        if (reduced) draw(0);
        else raf = requestAnimationFrame(loop);

        return () => {
            window.removeEventListener('resize', resize);
            themeObserver.disconnect();
            cancelAnimationFrame(raf);
        };
    }, []);

    return (
        <>
            <canvas
                ref={canvasRef}
                aria-hidden="true"
                style={{
                    // z-index 0, not -1: .app has its own opaque background, and a
                    // negative z-index would slip behind it and disappear. At 0 it
                    // paints after that background but before every later sibling.
                    position: 'fixed',
                    inset: 0,
                    width: '100vw',
                    height: '100vh',
                    zIndex: 0,
                    pointerEvents: 'none',
                    opacity,
                }}
            />
            {noise > 0 && (
                // grain sits just above the canvas (later in the DOM at the same
                // z-index) and below all page content; overlay blend lets it
                // texture both the waves and the page colour underneath
                <div
                    aria-hidden="true"
                    style={{
                        position: 'fixed',
                        inset: 0,
                        zIndex: 0,
                        pointerEvents: 'none',
                        backgroundImage: NOISE_TILE,
                        backgroundSize: '220px 220px',
                        mixBlendMode: 'overlay',
                        opacity: noise,
                    }}
                />
            )}
        </>
    );
}
