// src/menu/useDraftMenu.ts
import { useCallback, useEffect, useRef, useState } from 'react';
import { onChanged } from '../shared/events/DraftEvents';
import useSetups from '../setup/useSetups';
import { resolveSchemaIdByKey } from '../core/schemaKeyResolver';
import { listDrafts, type DraftParsed } from '../shared/api';

/** Те, що очікує Sidebar: листок, який відкриває форму рендерером */
export type DraftMenuItem = {
  title: string; // видимий лейбл, може дублюватися
  kind: 'form';
  params: { schemaKey: string; draftId: string };
};

type UseDraftMenuOptions = {
  /** JSON Schema $id, напр. 'ChestDescriptor', 'NpcDescriptor' */
  schemaKey: string;
  /**
   * Як отримати заголовок з контенту. За замовчуванням: content.Id || draft.id
   */
  titleSelector?: (content: unknown, draft: DraftParsed) => string;
};

type UseDraftMenuResult = {
  items: DraftMenuItem[];
  loading: boolean;
  error: string | null;
  /** Ледачий старт завантаження (або повторне) */
  ensureLoaded: (force?: boolean) => void;
  /** Явне перезавантаження */
  refresh: () => Promise<void>;
  /** Синхронне завантаження зараз і повернення побудованих пунктів */
  loadNow: (force?: boolean) => Promise<DraftMenuItem[]>;
};

// (no inflight dedupe for now)

/** Безпечний парсер JSON контенту драфта */
// parsing is handled centrally by DraftsContext

/** Універсальний хук для побудови меню з драфтів певної схеми */
export function useDraftMenu(options: UseDraftMenuOptions): UseDraftMenuResult {
  const { schemaKey, titleSelector } = options;
  const { selectedId } = useSetups();

  const [items, setItems] = useState<DraftMenuItem[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const mountedRef = useRef(true);
  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; };
  }, []);

  const buildTitle = useCallback((content: unknown, d: DraftParsed): string => {
    if (titleSelector) {
      const t = (titleSelector(content, d) || '').trim();
      if (t) return t;
    }
    const id: unknown = content && typeof content === 'object' && content !== null && 'Id' in content ? (content as Record<string, unknown>).Id : '';
    const t = (typeof id === 'string' ? id : '').trim();
    return t || String(d.id);
  }, [titleSelector]);

  const doLoad = useCallback(async (): Promise<DraftMenuItem[]> => {
    if (!selectedId) return [];
    if (import.meta.env.DEV) console.debug('[menu] doLoad start', { setupId: selectedId, schemaKey });
    setLoading(true);
    setError(null);
    try {
      const schemaId = await resolveSchemaIdByKey(selectedId, schemaKey);
      if (import.meta.env.DEV) console.debug('[menu] doLoad schemaId', { schemaId });
      if (!schemaId) return [];
      const all = await listDrafts(selectedId);
      const filtered = all.filter(d => String(d.schemaId || '') === String(schemaId));
      if (import.meta.env.DEV) console.debug('[menu] doLoad filtered', { count: filtered.length });
      const mapped = filtered.map(d => {
        const content = d.content ?? {};
        return { title: buildTitle(content, d), kind: 'form' as const, params: { schemaKey, draftId: String(d.id) } } as DraftMenuItem;
      });
      if (import.meta.env.DEV) console.debug('[menu] doLoad mapped', { count: mapped.length });
      if (mountedRef.current) setItems(mapped);
      return mapped;
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err) || 'Failed to load drafts';
      if (mountedRef.current) setError(message);
      return [];
    } finally {
      if (mountedRef.current) setLoading(false);
    }
  }, [selectedId, schemaKey, buildTitle]);

  const ensureLoaded = useCallback((force?: boolean) => { if (!loading && items.length === 0) void doLoad(); else if (force) void doLoad(); }, [doLoad, items.length, loading]);

  const refresh = useCallback(async () => { await doLoad(); }, [doLoad]);

  const loadNow = useCallback(async () => { return await doLoad(); }, [doLoad]);

  useEffect(() => { setItems([]); if (selectedId) void doLoad(); }, [selectedId, schemaKey, doLoad]);

  useEffect(() => {
    const off = onChanged((payload: { schemaKey: string; setupId: string }) => {
      if (import.meta.env.DEV) console.debug('[menu] onChanged', payload, { for: { schemaKey, selectedId } });
      if (payload.schemaKey === schemaKey && payload.setupId === selectedId) void doLoad();
    });
    return off;
  }, [doLoad, schemaKey, selectedId]);

  return { items, loading, error, ensureLoaded, refresh, loadNow };
}