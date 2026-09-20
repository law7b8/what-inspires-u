import { Routes, Route, useLocation } from 'react-router-dom'
import Home from './pages/Home/Home'
import CreatePost from './pages/CreatePost/CreatePost'
import PostPage from './pages/PostPage/PostPage'
import { PostsProvider } from './context/PostsContext'
import Header from './components/Header/Header'
import Hero from './components/Hero/Hero'
import ErrorBoundary from './components/ErrorBoundary/ErrorBoundary'
import PS3Background from './components/PS3Background/PS3Background'
import HudControls from './components/HudControls/HudControls'
import IntroOverlay from './components/IntroOverlay/IntroOverlay'

// Background settings — edit these to tune the PS3 waves. Only the ones listed
// here are overridden; the rest use the defaults in PS3Background.jsx (see the
// prop list at the top of that file for every option and its range).
// The wave COLORS are not here: they're in src/styles/tokens.css (section F).
// Turned down to a faint wash — the site is now a single "mostly white/
// airy, slight muted purple-pink" theme, so the waves are meant to read
// as a soft tint behind the page rather than a colored background.
const BACKGROUND = {
  waveSpeed: 0.35,         // animation speed: 0.1 (slow) to 2.0 (fast)
  opacity: 0.14,           // how strongly it shows over the page colour: 0 to 1
  glowIntensity: 0.5,      // ribbon glow: 0 to 1.5
  noise: 0.15              // film-grain strength over the background: 0 (off) to 1 — grayscale by construction (see PS3Background.jsx's NOISE_TILE), so this reads as grey noise, not colored
}

// App sets up routing and provides the PostsProvider for local state
export default function App() {
  // The Hero is the home-page scroll intro; it must sit above the Header in the
  // DOM because its animation hands the spinning CD off to the Header's #header-logo.
  const isHome = useLocation().pathname === '/'

  return (
    <PostsProvider>
      <div className="app">
        <IntroOverlay />
        <PS3Background {...BACKGROUND} />
        <HudControls />
        {isHome && (
          <ErrorBoundary>
            <Hero />
          </ErrorBoundary>
        )}
        <Header />

        <main className="app-container">
          <Routes>
            <Route
              path="/"
              element={
                <ErrorBoundary>
                  <Home />
                </ErrorBoundary>
              }
            />
            <Route
              path="/new"
              element={
                <ErrorBoundary>
                  <CreatePost />
                </ErrorBoundary>
              }
            />
            <Route
              path="/post/:id"
              element={
                <ErrorBoundary>
                  <PostPage />
                </ErrorBoundary>
              }
            />
          </Routes>
        </main>
      </div>
    </PostsProvider>
  )
}
