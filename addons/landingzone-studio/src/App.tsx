/**
 * App.tsx — Landing Zone Studio router for the statically hosted browser application.
 */

import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Disclaimer, { DISCLAIMER_KEY, DISCLAIMER_VERSION } from './components/Disclaimer';
import { getRouterBasename } from './services/pagesBase';
import './index.css';

const Dashboard = React.lazy(() => import('./pages/Dashboard'));
const WizardShell = React.lazy(() => import('./pages/WizardShell'));

const routeFallback = (
  <div role="status" style={{ minHeight: '100vh', display: 'grid', placeItems: 'center', fontFamily: 'system-ui, sans-serif' }}>
    Loading…
  </div>
);

interface ErrorBoundaryState {
  hasError: boolean;
}

class AppErrorBoundary extends React.Component<React.PropsWithChildren, ErrorBoundaryState> {
  constructor(props: React.PropsWithChildren) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(): ErrorBoundaryState {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error('App crash:', error, info);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div role="alert" style={{ padding: 40, fontFamily: 'system-ui, sans-serif', color: '#7b1e17', background: '#fdf0ef', minHeight: '100vh' }}>
          <h2>Something went wrong</h2>
          <p>Reload the page and try again. Your work remains in this browser when storage is available.</p>
          <button onClick={() => window.location.reload()} style={{ marginTop: 16, padding: '8px 16px', cursor: 'pointer' }}>
            Reload Page
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

export default function App() {
  const [accepted, setAccepted] = React.useState<boolean>(() => {
    try { return window.localStorage.getItem(DISCLAIMER_KEY) === DISCLAIMER_VERSION; } catch { return false; }
  });

  function acceptDisclaimer() {
    try { window.localStorage.setItem(DISCLAIMER_KEY, DISCLAIMER_VERSION); } catch { /* ignore quota */ }
    setAccepted(true);
  }

  return (
    <AppErrorBoundary>
      {accepted ? (
        <Router basename={getRouterBasename(import.meta.env.BASE_URL)}>
          <React.Suspense fallback={routeFallback}>
            <Routes>
              <Route path="/"       element={<Dashboard />} />
              <Route path="/lz/:id" element={<WizardShell />} />
              <Route path="*"       element={<Navigate to="/" replace />} />
            </Routes>
          </React.Suspense>
        </Router>
      ) : (
        <Disclaimer onAccept={acceptDisclaimer} />
      )}
    </AppErrorBoundary>
  );
}
