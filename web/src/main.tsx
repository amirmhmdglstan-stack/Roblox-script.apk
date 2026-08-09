import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';

/**
 * Mount the app.
 * Defensive: if #root is not in the DOM yet (e.g. the page is being loaded in
 * an unusual order), wait for DOMContentLoaded and try again instead of
 * crashing with "Target container is not a DOM element".
 */
function mount() {
  const rootEl = document.getElementById('root');
  if (!rootEl) {
    window.addEventListener('DOMContentLoaded', mount, { once: true });
    return;
  }
  ReactDOM.createRoot(rootEl).render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  );
}

mount();
