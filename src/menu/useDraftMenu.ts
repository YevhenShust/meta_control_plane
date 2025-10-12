// src/menu/useDraftMenu.ts
// 
// Draft Menu Hook - Migrated to RTK Query
// ========================================
// This hook builds menu items from drafts of a specific schema.
// 
// MIGRATION STATUS: ✅ Complete
// - By default, uses RTK Query for automatic caching and invalidation
// - Legacy event-driven mode available via `useLegacyMode` flag for rollback safety
// - Interface remains identical for backward compatibility
//
// See: docs/RTK_QUERY_MIGRATION.md for full documentation
//
import { useCallback, useEffect, useRef, useState } from 'react';
import { onChanged } from '../shared/events/DraftEvents';
import useSetups from '../setup/useSetups';
import { resolveSchemaIdByKey } from '../core/schemaKeyResolver';
import { listDrafts, type DraftParsed } from '../shared/api';
import { useListMenuItemsQuery } from '../store/api';

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
  /**
   * Use legacy event-driven mode instead of RTK Query (for rollback safety)
   * @default false
   */
  useLegacyMode?: boolean;
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
  const { schemaKey, titleSelector, useLegacyMode = false } = options;
  const { selectedId } = useSetups();

  // RTK Query mode (default)
  const { data: menuItems, isLoading: rtkLoading, error: rtkError, refetch } = useListMenuItemsQuery(
    { setupId: selectedId || '', schemaKey, titleSelector },
    { skip: useLegacyMode || !selectedId }
  );

  // Legacy mode state
  const [legacyItems, setLegacyItems] = useState<DraftMenuItem[]>([]);
  const [legacyLoading, setLegacyLoading] = useState<boolean>(false);
  const [legacyError, setLegacyError] = useState<string | null>(null);

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

  // Legacy mode implementation (kept for rollback safety)
  const doLoad = useCallback(async (): Promise<DraftMenuItem[]> => {
    if (!selectedId) return [];
    if (import.meta.env.DEV) console.debug('[menu] doLoad start', { setupId: selectedId, schemaKey });
    setLegacyLoading(true);
    setLegacyError(null);
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
      if (mountedRef.current) setLegacyItems(mapped);
      return mapped;
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err) || 'Failed to load drafts';
      if (mountedRef.current) setLegacyError(message);
      return [];
    } finally {
      if (mountedRef.current) setLegacyLoading(false);
    }
  }, [selectedId, schemaKey, buildTitle]);

  const ensureLoaded = useCallback((force?: boolean) => { 
    if (useLegacyMode) {
      if (!legacyLoading && legacyItems.length === 0) void doLoad(); 
      else if (force) void doLoad();
    }
  }, [useLegacyMode, doLoad, legacyItems.length, legacyLoading]);

  const refresh = useCallback(async () => { 
    if (useLegacyMode) {
      await doLoad();
    } else {
      refetch();
    }
  }, [useLegacyMode, doLoad, refetch]);

  const loadNow = useCallback(async () => { 
    if (useLegacyMode) {
      return await doLoad();
    } else {
      // For RTK mode, just return current items
      return menuItems?.map(item => ({
        title: item.label,
        kind: 'form' as const,
        params: { schemaKey, draftId: item.id }
      })) ?? [];
    }
  }, [useLegacyMode, doLoad, menuItems, schemaKey]);

  // Legacy mode: load on mount and setup change
  useEffect(() => { 
    if (useLegacyMode) {
      setLegacyItems([]); 
      if (selectedId) void doLoad(); 
    }
  }, [useLegacyMode, selectedId, schemaKey, doLoad]);

  // Legacy mode: subscribe to draft change events
  useEffect(() => {
    if (!useLegacyMode) return; // Don't subscribe in RTK mode
    
    const off = onChanged((payload: { schemaKey: string; setupId: string }) => {
      if (import.meta.env.DEV) console.debug('[menu] onChanged', payload, { for: { schemaKey, selectedId } });
      if (payload.schemaKey === schemaKey && payload.setupId === selectedId) void doLoad();
    });
    return off;
  }, [useLegacyMode, doLoad, schemaKey, selectedId]);

  // Convert RTK Query data to DraftMenuItem format
  const rtkItems: DraftMenuItem[] = menuItems?.map(item => ({
    title: item.label,
    kind: 'form' as const,
    params: { schemaKey, draftId: item.id }
  })) ?? [];

  // Return appropriate data based on mode
  if (useLegacyMode) {
    return { 
      items: legacyItems, 
      loading: legacyLoading, 
      error: legacyError, 
      ensureLoaded, 
      refresh, 
      loadNow 
    };
  }

  return { 
    items: rtkItems, 
    loading: rtkLoading, 
    error: rtkError ? String(rtkError) : null, 
    ensureLoaded, 
    refresh, 
    loadNow 
  };
}