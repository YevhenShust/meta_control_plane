type Listener = (payload: { schemaKey: string; setupId: string }) => void;
const listeners: Listener[] = [];

export function onChanged(fn: Listener) {
  listeners.push(fn);
  if (import.meta.env.DEV) console.debug('[DraftEvents] onChanged: listener added (count)', listeners.length);
  return () => {
    const idx = listeners.indexOf(fn);
    if (idx >= 0) listeners.splice(idx, 1);
    if (import.meta.env.DEV) console.debug('[DraftEvents] onChanged: listener removed (count)', listeners.length);
  };
}

export function emitChanged(payload: { schemaKey: string; setupId: string }) {
  if (import.meta.env.DEV) console.debug('[DraftEvents] emitChanged', payload, 'listeners=', listeners.length);
  for (const l of listeners.slice()) {
    try { l(payload); } catch { /* ignore listener errors */ }
  }
}
