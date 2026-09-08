import { Routes, Route, useLocation } from 'react-router-dom'
import Home from './pages/Home/Home'
import CreatePost from './pages/CreatePost/CreatePost'
import PostPage from './pages/PostPage/PostPage'
import { PostsProvider } from './context/PostsContext'
import Header from './components/Header/Header'
import Hero from './components/Hero/Hero'
import Footer from './components/Footer/Footer'
import ErrorBoundary from './components/ErrorBoundary/ErrorBoundary'

// App sets up routing and provides the PostsProvider for local state
export default function App() {
  // The Hero is the home-page scroll intro; it must sit above the Header in the
  // DOM because its animation hands the spinning CD off to the Header's #header-logo.
  const isHome = useLocation().pathname === '/'

  return (
    <PostsProvider>
      <div className="app">
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
        <Footer />
      </div>
    </PostsProvider>
  )
}
