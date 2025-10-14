import { OverlayToaster, Position } from '@blueprintjs/core';
import type { Toaster } from '@blueprintjs/core';
import React from 'react';
import { createRoot, type Root } from 'react-dom/client';

/**
 * AppToaster — centralized, async toaster helper for the app.
 *
 * Why async? React 18 requires portals to be created through the new createRoot
 * API. Blueprint's `OverlayToaster.createAsync()` returns a Promise that resolves
 * when the underlying DOM portal / root is ready. By centralizing creation and
 * caching the promise/instance, callers can safely call `AppToaster.show(...)`
 * even if the portal hasn't been created yet; the call will wait for the
 * toaster to be ready and then display the toast.
 *
 * Benefits:
 * - Avoids creating multiple overlay/toaster instances across the app.
 * - Provides in-flight dedupe: concurrent calls will reuse the same creation promise.
 * - Keeps a small, consistent API surface (show/dismiss/clear/getToasts).
 *
 * Usage examples:
 *   // show a toast (no need to await unless you need confirmation)
 *   AppToaster.show({ message: 'Saved', intent: 'success' });
 *
 *   // await if you need to ensure the toast was scheduled/shown
 *   await AppToaster.show({ message: 'Saved', intent: 'success' });
 */

let toasterInstance: Toaster | null = null;
let mountPromise: Promise<Toaster> | null = null;
let root: Root | null = null;

function ensureContainer(): HTMLElement {
  const id = 'bp-toaster-root';
  let el = document.getElementById(id);
  if (!el) {
    el = document.createElement('div');
    el.id = id;
    document.body.appendChild(el);
  }
  return el;
}

function mountToaster(): Promise<Toaster> {
  if (toasterInstance) return Promise.resolve(toasterInstance);
  if (mountPromise) return mountPromise;
  mountPromise = new Promise<Toaster>((resolve) => {
    const container = ensureContainer();
    root = createRoot(container);
    const element = React.createElement(OverlayToaster, {
      position: Position.TOP,
      maxToasts: 3,
      // ref receives the public Toaster API instance
      ref: (ref: Toaster | null) => {
        if (ref) {
          toasterInstance = ref;
          resolve(ref);
        }
      },
    } as unknown as React.ComponentProps<typeof OverlayToaster>);
    root.render(element);
  });
  return mountPromise;
}

function getToaster(): Promise<Toaster> {
  return mountToaster();
}

export const AppToaster = {
  show: async (...args: Parameters<Toaster['show']>) => {
    const toaster = await getToaster();
    return toaster.show(...args);
  },
  dismiss: async (...args: Parameters<Toaster['dismiss']>) => {
    const toaster = await getToaster();
    return toaster.dismiss(...args);
  },
  clear: async () => {
    const toaster = await getToaster();
    return toaster.clear();
  },
  getToasts: async () => {
    const toaster = await getToaster();
    return toaster.getToasts();
  },
};
