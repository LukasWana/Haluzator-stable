import React from 'react';
import { createRoot } from 'react-dom/client';
import { AppProvider } from './contexts/AppContext';
import { App } from './App';

// Configure Monaco Editor loader path
if ((window as any).require) {
  (window as any).require.config({ paths: { 'vs': 'https://cdn.jsdelivr.net/npm/monaco-editor@0.49.0/min/vs' } });
}

const container = document.getElementById('root');
const root = createRoot(container!);
root.render(
  <AppProvider>
    <App />
  </AppProvider>
);