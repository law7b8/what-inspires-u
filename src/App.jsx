import { Routes, Route, useLocation } from 'react-router-dom'
import Home from './pages/Home/Home'
import CreatePost from './pages/CreatePost/CreatePost'
import PostPage from './pages/PostPage/PostPage'
import { PostsProvider } from './context/PostsContext'
import Header from './components/Header/Header'
import Hero from './components/Hero/Hero'
import ErrorBoundary from './components/ErrorBoundary/ErrorBoundary'
import PS3Background from './components/PS3Background/PS3Background'
import ThemeSwitcher from './components/ThemeSwitcher/ThemeSwitcher'

// Background settings — edit these to tune the PS3 waves. Only the ones listed
// here are overridden; the rest use the defaults in PS3Background.jsx (see the
// prop list at the top of that file for every option and its range).
// The wave COLORS are not here: they're in src/styles/tokens.css (section F).
const BACKGROUND = {
  waveSpeed: 0.5,          // animation speed: 0.1 (slow) to 2.0 (fast)
  opacity: 0.42,           // how strongly it shows over the page colour: 0 to 1
  glowIntensity: 1.1,      // ribbon glow: 0 to 1.5
  noise: 0                 // film-grain strength over the background: 0 (off) to 1
}

// App sets up routing and provides the PostsProvider for local state
export default function App() {
  // The Hero is the home-page scroll intro; it must sit above the Header in the
  // DOM because its animation hands the spinning CD off to the Header's #header-logo.
  const isHome = useLocation().pathname === '/'

  return (
    <PostsProvider>
      <div className="app">
        <PS3Background {...BACKGROUND} />
        <ThemeSwitcher />
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
