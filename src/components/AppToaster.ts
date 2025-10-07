import { OverlayToaster, Position } from '@blueprintjs/core';
import type { Toaster } from '@blueprintjs/core';

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
let toasterPromise: Promise<Toaster> | null = null;

function getToaster(): Promise<Toaster> {
  if (toasterInstance) return Promise.resolve(toasterInstance);

  if (!toasterPromise) {
    toasterPromise = OverlayToaster.createAsync({
      position: Position.TOP,
      maxToasts: 3,
    }).then(instance => {
      toasterInstance = instance;
      return instance;
    });
  }

  return toasterPromise;
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
