import React, { useState } from 'react'
import { Routes, Route } from 'react-router-dom'
import Home from './pages/Home/Home'
import CreatePost from './pages/CreatePost/CreatePost'
import PostPage from './pages/PostPage/PostPage'
import { PostsProvider } from './context/PostsContext'
import Footer from './components/Footer/Footer'
import ErrorBoundary from './components/ErrorBoundary/ErrorBoundary'

// App sets up routing and provides the PostsProvider for local state
export default function App() {
  return (
    <PostsProvider>
      <div className="app">
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
