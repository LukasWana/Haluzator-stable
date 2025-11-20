import React from 'react';
import { createRoot } from 'react-dom/client';
import { AppProvider } from './contexts/AppContext';
import { App } from './App';
import { ErrorBoundary } from './components/ErrorBoundary';
import { validateEnvironment } from './utils/envValidation';

// Validate environment variables on startup
validateEnvironment();

// Configure Monaco Editor loader path
if ((window as any).require) {
  (window as any).require.config({ paths: { 'vs': 'https://cdn.jsdelivr.net/npm/monaco-editor@0.49.0/min/vs' } });
}

const container = document.getElementById('root');
if (!container) {
  throw new Error('Root container not found');
}

const root = createRoot(container);
root.render(
  <ErrorBoundary>
    <AppProvider>
      <App />
    </AppProvider>
  </ErrorBoundary>
);