import React, { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import ErrorBoundary from './ErrorBoundary.jsx'

const rootElement = document.getElementById('root');

if (!rootElement) {
  document.body.innerHTML = '<h1 style="padding: 20px; color: red;">Error: Root element not found</h1>';
} else {
  try {
    const root = createRoot(rootElement);
    root.render(
      <StrictMode>
        <ErrorBoundary>
          <App />
        </ErrorBoundary>
      </StrictMode>
    );
  } catch (error) {
    console.error('Failed to render app:', error);
    rootElement.innerHTML = `
      <div style="padding: 20px; text-align: center; font-family: sans-serif; color: red;">
        <h1>Application Error</h1>
        <p><strong>${error.message}</strong></p>
        <p>Please check the console for more details.</p>
        <pre style="text-align: left; background: #f5f5f5; padding: 10px; border-radius: 4px; margin-top: 20px; overflow: auto;">${error.stack}</pre>
      </div>
    `;
  }
}
