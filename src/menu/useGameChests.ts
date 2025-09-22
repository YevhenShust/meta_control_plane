import { useCallback, useEffect, useRef, useState } from 'react';
import { listDraftsV1, type DraftDto } from '../shared/api/drafts';
import useSetups from '../setup/useSetups';

export type ChestMenuItem = { title: string; kind: 'chest-editor'; params: { entityId: string } };

// module-level caches shared by all hook instances
const CACHE = new Map<string, ChestMenuItem[]>();
const INFLIGHT = new Map<string, Promise<void>>();
const LISTENERS = new Set<() => void>();
function notifyAll() { LISTENERS.forEach(l => l()); }

async function loadForId(setupId: string, force = false): Promise<void> {
  if (!setupId) return;
  if (!force && CACHE.has(setupId)) return;
  const existing = INFLIGHT.get(setupId);
  if (existing) return existing;
  const p = (async () => {
    try {
      const drafts = await listDraftsV1(setupId);
      const mapped: ChestMenuItem[] = (Array.isArray(drafts) ? drafts : []).map((d: DraftDto) => {
        let title = d.id as string;
        try {
          const c = typeof d.content === 'string' ? JSON.parse(d.content) : (d.content as unknown) || {};
          if (c && (c.Id || c.id)) title = (c.Id ?? c.id) as string;
        } catch {
          // ignore parse errors
        }
        return { title, kind: 'chest-editor', params: { entityId: d.id as string } };
      });
      CACHE.set(setupId, mapped);
      notifyAll();
    } catch (e) {
      // propagate error via cache removal and notify listeners to allow hooks to pick up
      CACHE.delete(setupId);
      notifyAll();
      throw e;
    } finally {
      INFLIGHT.delete(setupId);
    }
  })();
  INFLIGHT.set(setupId, p);
  return p;
}

export default function useGameChests() {
  const { selectedId } = useSetups();
  const [, setTick] = useState(0);
  const mountedRef = useRef(true);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    mountedRef.current = true;
    const listener = () => { if (mountedRef.current) setTick(x => x + 1); };
    LISTENERS.add(listener);
    return () => { mountedRef.current = false; LISTENERS.delete(listener); };
  }, []);

  const items = selectedId ? (CACHE.get(selectedId) || []) : [];

  const ensureLoaded = useCallback(() => {
    if (!selectedId) return;
    setIsLoading(true);
    void loadForId(selectedId, false).then(() => {
      if (mountedRef.current) setIsLoading(false);
      setError(null);
    }).catch(e => {
      if (mountedRef.current) setIsLoading(false);
      let msg = String(e);
      if (e && typeof e === 'object' && 'message' in e) {
        try { msg = (e as { message?: unknown }).message as string || msg; } catch { /* ignore */ }
      }
      if (mountedRef.current) setError(msg);
    });
  }, [selectedId]);

  const refresh = useCallback(async () => {
    if (!selectedId) return;
    CACHE.delete(selectedId);
    setIsLoading(true);
    try {
      await loadForId(selectedId, true);
      setError(null);
    } catch (e) {
      let msg = String(e);
      if (e && typeof e === 'object' && 'message' in e) {
        try { msg = (e as { message?: unknown }).message as string || msg; } catch { /* ignore */ }
      }
      setError(msg);
    } finally {
      setIsLoading(false);
    }
  }, [selectedId]);

  return { items, loading: isLoading, error, ensureLoaded, refresh };
}

export function useRefreshGameChests(): () => Promise<void> {
  const { selectedId } = useSetups();
  return useCallback(async () => {
    if (!selectedId) return;
    CACHE.delete(selectedId);
    await loadForId(selectedId, true);
  }, [selectedId]);
}
