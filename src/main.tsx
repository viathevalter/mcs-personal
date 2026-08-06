import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { RouterProvider } from 'react-router-dom'
import { Providers } from './app/providers'
import { router } from './app/router'
import './index.css'
import './i18n/config';

import React from 'react';

if (typeof window !== 'undefined') {
  window.addEventListener('error', (e) => {
    if (e.message && (e.message.includes('ResizeObserver') || e.message.includes('Script error'))) {
      e.stopImmediatePropagation();
    }
  });
}

class GlobalErrorBoundary extends React.Component<{children: React.ReactNode}> {
  state = { hasError: false, error: null };
  static getDerivedStateFromError(error: any) { 
    if (error && String(error).includes('ResizeObserver')) {
      return { hasError: false, error: null };
    }
    return { hasError: true, error }; 
  }
  componentDidCatch(error: any, info: any) { console.error("GLOBAL CRASH:", error, info); }
  render() {
    if (this.state.hasError) {
      return <div style={{color:'red'}}><h1>GLOBAL CRASH</h1><pre>{String(this.state.error)}</pre></div>;
    }
    return this.props.children;
  }
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <GlobalErrorBoundary>
      <Providers>
        <RouterProvider router={router} />
      </Providers>
    </GlobalErrorBoundary>
  </StrictMode>,
)
