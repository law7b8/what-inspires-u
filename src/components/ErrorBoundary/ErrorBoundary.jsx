import React from 'react'

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error }
  }

  componentDidCatch(error, errorInfo) {
    console.error('[ErrorBoundary] Caught error:', error, errorInfo)
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null })
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          padding: '2rem',
          margin: '2rem auto',
          maxWidth: 600,
          border: '3px solid #000',
          borderRadius: 12,
          background: '#fff3cd',
          textAlign: 'center',
          fontFamily: 'system-ui, sans-serif',
        }}>
          <h2 style={{ marginTop: 0, fontSize: '1.6rem' }}>Something went wrong</h2>
          <pre style={{
            background: '#f8f9fa',
            padding: '1rem',
            borderRadius: 8,
            textAlign: 'left',
            overflow: 'auto',
            maxHeight: 200,
            fontSize: '0.85rem',
            border: '2px solid #dee2e6',
          }}>
            {this.state.error?.message || 'Unknown error'}
          </pre>
          <button
            onClick={this.handleReset}
            style={{
              marginTop: '1rem',
              padding: '0.6rem 1.5rem',
              fontSize: '1rem',
              cursor: 'pointer',
              background: '#000',
              color: '#fff',
              border: 'none',
              borderRadius: 8,
              fontWeight: 700,
            }}
          >
            Try again
          </button>
        </div>
      )
    }

    return this.props.children
  }
}
