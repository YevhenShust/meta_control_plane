import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import { Provider } from 'react-redux';
import { store } from './store';
import { SetupsProvider } from './setup/SetupsContext';
import { Classes } from '@blueprintjs/core';
import "@blueprintjs/core/lib/css/blueprint.css";
import "@blueprintjs/icons/lib/css/blueprint-icons.css";
import "./index.css";
import { clearDescriptorOptionsCache } from './hooks/useDescriptorOptions';

// Dev-only: unregister stray service workers and clear caches to avoid noisy errors
if (import.meta.env.DEV) {
  try {
    // Clear web caches and unregister service workers (if any)
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.getRegistrations()
        .then(regs => Promise.all(regs.map(r => r.unregister())))
        .catch(() => {});
    }
    if ('caches' in window) {
      caches.keys().then(keys => Promise.all(keys.map(k => caches.delete(k)))).catch(() => {});
    }
    // Clear in-memory descriptor caches to avoid stale options after HMR or data changes
    clearDescriptorOptionsCache();
  } catch {
    // ignore
  }
}

document.body.classList.add(Classes.DARK);

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <Provider store={store}>
      <SetupsProvider>
        <App />
      </SetupsProvider>
    </Provider>
  </React.StrictMode>
);