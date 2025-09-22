import { useCallback, useEffect, useRef, useState } from 'react';
import { listDraftsV1, type DraftDto } from '../shared/api/drafts';
import useSetups from '../setup/useSetups';

export type ChestMenuItem = { title: string; kind: 'chest-editor'; params: { entityId: string } };

export default function useGameChests() {
  const { selectedId } = useSetups();
  const cache = useRef<Map<string, ChestMenuItem[]>>(new Map());
  const loading = useRef<Map<string, Promise<void>>>(new Map());
  const [items, setItems] = useState<ChestMenuItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // when selectedId changes, show cached value if any but do not auto-fetch
  useEffect(() => {
    if (!selectedId) {
      setItems([]);
      setIsLoading(false);
      setError(null);
      return;
    }
    const cached = cache.current.get(selectedId) || [];
    setItems(cached);
    setIsLoading(false);
    setError(null);
  }, [selectedId]);

  const loadForId = useCallback(async (setupId: string, force = false) => {
    if (!setupId) return;
    if (!force) {
      const existing = cache.current.get(setupId);
      if (existing) return;
    }
    const inFlight = loading.current.get(setupId);
    if (inFlight) return;
    const p = (async () => {
      try {
        if (selectedId === setupId) setIsLoading(true);
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
        cache.current.set(setupId, mapped);
        if (selectedId === setupId) setItems(mapped);
        setError(null);
        } catch (e) {
          let msg = String(e);
          if (e && typeof e === 'object' && 'message' in e) {
            try { msg = (e as { message?: unknown }).message as string || msg; } catch {
              // ignore
            }
          }
          setError(msg);
      } finally {
        if (selectedId === setupId) setIsLoading(false);
        loading.current.delete(setupId);
      }
    })();
    loading.current.set(setupId, p);
    await p;
  }, [selectedId]);

  const ensureLoaded = useCallback(() => {
    if (!selectedId) return;
    // trigger load once for current setup
    void loadForId(selectedId, false);
  }, [selectedId, loadForId]);

  const refresh = useCallback(async () => {
    if (!selectedId) return;
    // force refetch and update cache
    cache.current.delete(selectedId);
    await loadForId(selectedId, true);
  }, [selectedId, loadForId]);

  return { items, loading: isLoading, error, ensureLoaded, refresh };
}
