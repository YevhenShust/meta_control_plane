import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import { SetupsProvider } from './setup/SetupsContext';
import { DraftsProvider } from './setup/DraftsContext';

// Dev-only: unregister stray service workers and clear caches to avoid noisy errors
if (import.meta.env.DEV && 'serviceWorker' in navigator) {
  try {
    navigator.serviceWorker.getRegistrations()
      .then(regs => Promise.all(regs.map(r => r.unregister())))
      .catch(() => {});
    if ('caches' in window) {
      caches.keys().then(keys => Promise.all(keys.map(k => caches.delete(k)))).catch(() => {});
    }
  } catch {
    // ignore
  }
}

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <SetupsProvider>
      <DraftsProvider>
        <App />
      </DraftsProvider>
    </SetupsProvider>
  </React.StrictMode>
);
