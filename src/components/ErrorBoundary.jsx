import React from 'react';

export class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, info) {
    console.error('[ManjoCity]', error, info?.componentStack);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div
          style={{
            minHeight: '100dvh',
            padding: '2rem',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '1rem',
            background: 'var(--color-bg, #f9f7f1)',
            color: 'var(--color-text, #2c2a25)',
            textAlign: 'center',
            fontFamily: 'system-ui, sans-serif',
          }}
        >
          <p style={{ fontSize: '1.1rem', maxWidth: '22rem' }}>
            Un problème d’affichage est survenu. Actualiser la page corrige souvent le souci sur mobile.
          </p>
          <button
            type="button"
            onClick={() => window.location.reload()}
            style={{
              padding: '0.75rem 1.5rem',
              borderRadius: '999px',
              border: 'none',
              background: '#2d4a22',
              color: '#fff',
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            Actualiser
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
