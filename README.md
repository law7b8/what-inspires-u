<!-- BANNER: export a 1280x640 banner to docs/media/banner.png, then uncomment -->
<!-- <p align="center"><img src="docs/media/banner.png" alt="what inspires u?" width="100%"></p> -->

<h1 align="center">what inspires u?</h1>
<p align="center"><i>ホワット・インスパイアズ・ユー</i></p>

<p align="center">
  A creative forum for the images, songs and internet-culture ephemera that shape your taste —<br>
  built like a PS3 menu, a CD booklet and a desktop full of files.
</p>

<p align="center">
  <a href="LIVE_URL_HERE"><b>▶ Live site</b></a> ·
  <a href="#tracklist">Features</a> ·
  <a href="#how-its-built">How it's built</a> ·
  <a href="#run-it-locally">Run it locally</a>
</p>

<p align="center">
  <img alt="React" src="https://img.shields.io/badge/React_18-000?logo=react&logoColor=61DAFB">
  <img alt="Vite" src="https://img.shields.io/badge/Vite-000?logo=vite&logoColor=FFD62E">
  <img alt="GSAP" src="https://img.shields.io/badge/GSAP-000?logo=greensock&logoColor=88CE02">
  <img alt="Supabase" src="https://img.shields.io/badge/Supabase-000?logo=supabase&logoColor=3ECF8E">
  <img alt="Netlify" src="https://img.shields.io/badge/Netlify-000?logo=netlify&logoColor=00C7B7">
</p>

<!-- DEMO GIF: record a ~10s loop (intro → drag a file → open a window → press h), save as docs/media/demo.gif, then uncomment -->
<!-- <p align="center"><img src="docs/media/demo.gif" alt="demo" width="100%"></p> -->

---

## Tracklist

| # | Feature | What it does |
|---|---|---|
| 01 | **Intro veil** | The whole site opens from black and a heavy blur, then resolves into focus. |
| 02 | **PS3 / XMB background** | Glowing wave ribbons, drifting dust and film grain on a hand-written `<canvas>` renderer. Colours come from theme tokens and update live. |
| 03 | **CD case hero** | A 3D CD case with real depth and a spine, tumbling on its own. Scrolling flies the disc out of the case, and moving the mouse fast spins it up. |
| 04 | **+ menu** | An XMB-style menu (arrow keys, scroll wheel, Enter) with a typewriter "about" panel and slide-out sheets for posting. |
| 05 | **post mp3** | Paste a YouTube, SoundCloud or Spotify link. The artist, title and cover are looked up through each service's oEmbed endpoint, with no API keys, and turned into a Finder-style `.mp3` file. |
| 06 | **Drag to launch** | Press and hold to drag the file preview anywhere on the page and drop it there. It becomes a floating, bouncing file. |
| 07 | **File windows** | Click a floating file to open a retro player window. It grows from the file's position, can be dragged from anywhere and resized from any edge, and plays a real embed at the video's true aspect ratio. |
| 08 | **Hide the HUD** | Press `h` to hide every overlay and get a clean screenshot of your space. |
| 09 | **Community feed** | A masonry feed of posts with upvotes, comments, search, and sorting by *newest*, *most inspired* or *random*. |

<!-- SCREENSHOTS: drop 3 stills into docs/media/ and uncomment -->
<!--
<p align="center">
  <img src="docs/media/shot-hero.png" width="32%">
  <img src="docs/media/shot-window.png" width="32%">
  <img src="docs/media/shot-feed.png" width="32%">
</p>
-->

## How it's built

```
src/
├── App.jsx                  routing + global layers (intro, background, HUD)
├── components/
│   ├── IntroOverlay/        fade-in-from-blur veil
│   ├── PS3Background/       canvas wave/particle renderer
│   ├── HudControls/         "h" toggles html[data-hud-hidden]
│   └── Hero/                CD case, logo disc, + menu, floating files, file windows
├── context/PostsContext.jsx Supabase-backed post state
├── pages/                   Home (feed) · CreatePost · PostPage
├── styles/tokens.css        design tokens (colours, wave palette)
└── utils/trackLookup.js     YouTube / SoundCloud / Spotify oEmbed lookup
```

**Stack:** React 18 · React Router · Vite · GSAP + ScrollTrigger · Lenis · Supabase (Postgres) · Netlify

### Notes on the harder parts
- **Smooth dragging without React re-renders.** Floating files, the drag ghost and window drag/resize write directly to `element.style` on every pointer move. That keeps them at full frame rate instead of re-rendering React on every move.
- **Escaping a transformed ancestor.** The drag ghost is portaled into `document.body`. Otherwise the `will-change: transform` on the + menu's sheet would trap a `position: fixed` element inside the sheet.
- **Embeds at their true ratio.** oEmbed returns the embed's native width and height. The window keeps that ratio when present and falls back to a fixed size when a service reports something unusable, like SoundCloud's `"100%"`.
- **The HUD toggle is decoupled.** `HudControls` only flips an attribute on `<html>`. Each component hides itself through its own `:global(html[data-hud-hidden])` rule, so nothing reaches into components it doesn't own.
- **Reduced motion.** Every GSAP animation checks `prefers-reduced-motion` and falls back to a static layout.

## Run it locally

```bash
git clone https://github.com/lawrdong/what-inspires-u.git
cd what-inspires-u
npm install
npm run dev
```

| Script | |
|---|---|
| `npm run dev` | dev server with HMR |
| `npm run build` | production build to `dist/` |
| `npm run preview` | serve the production build locally |

The Supabase client lives in `src/supabaseClient.js`. To point the app at your own project, create `Posts` and `Comments` tables and swap in your project's URL and anon key.

## Deploy

Deploys are configured in `netlify.toml` (build with `npm run build`, publish `dist/`, Node 22). It also has an SPA fallback so direct links like `/post/:id` load correctly. Every push to `main` deploys automatically.

---

<p align="center"><sub>made by law · <a href="https://github.com/lawrdong">@lawrdong</a></sub></p>
