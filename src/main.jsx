import React from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './App'
import './index.css'
import Lenis from '@studio-freight/lenis'
import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'

gsap.registerPlugin(ScrollTrigger)

// Browsers try to restore the previous scroll position on refresh by default
// (history.scrollRestoration === 'auto'). Since Lenis keeps its own virtual
// scroll state layered on top of native scroll, a restored position can leave
// the two out of sync — and either way, refreshing should land back at the
// top of the site, not wherever you'd scrolled to. Must run before the Lenis
// instance below is created, so it reads a scroll position of 0.
if ('scrollRestoration' in window.history) {
  window.history.scrollRestoration = 'manual'
}
window.scrollTo(0, 0)

const lenis = new Lenis({
  duration: 1.2,
  easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
  smooth: true,
  syncTouch: true,
})

// Keep ScrollTrigger (used by the Hero pin/scrub animation) in sync with Lenis'
// virtual scroll position, and drive Lenis off gsap's ticker so they share a clock.
lenis.on('scroll', ScrollTrigger.update)
gsap.ticker.add((time) => lenis.raf(time * 1000))
gsap.ticker.lagSmoothing(0)


createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </React.StrictMode>
)
