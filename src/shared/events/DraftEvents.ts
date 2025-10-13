type Listener = (payload: { schemaKey: string; setupId: string }) => void;
const listeners: Listener[] = [];

export function onChanged(fn: Listener) {
  listeners.push(fn);
  console.debug('[DraftEvents] onChanged: listener added (count)', listeners.length);
  return () => {
    const idx = listeners.indexOf(fn);
    if (idx >= 0) listeners.splice(idx, 1);
    console.debug('[DraftEvents] onChanged: listener removed (count)', listeners.length);
  };
}

export function emitChanged(payload: { schemaKey: string; setupId: string }) {
  console.debug('[DraftEvents] emitChanged', payload, 'listeners=', listeners.length);
  for (const l of listeners.slice()) {
    try { l(payload); } catch { /* ignore listener errors */ }
  }
}
