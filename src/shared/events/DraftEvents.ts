type Listener = (payload: { schemaKey: string; setupId: string }) => void;
const listeners: Listener[] = [];

export function onChanged(fn: Listener) {
  listeners.push(fn);
  return () => {
    const idx = listeners.indexOf(fn);
    if (idx >= 0) listeners.splice(idx, 1);
  };
}

export function emitChanged(payload: { schemaKey: string; setupId: string }) {
  for (const l of listeners.slice()) {
    try { l(payload); } catch { /* ignore listener errors */ }
  }
}
