// src/menu/useDraftMenu.ts
import { useCallback, useMemo } from 'react';
import useSetups from '../setup/useSetups';
import { useListMenuItemsQuery } from '../store/api';
import type { DraftParsed } from '../shared/api';

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

/** Універсальний хук для побудови меню з драфтів певної схеми */
export function useDraftMenu(options: UseDraftMenuOptions): UseDraftMenuResult {
  const { schemaKey, titleSelector } = options;
  const { selectedId } = useSetups();

  // Use RTK Query to fetch menu items
  const { data, isLoading, error: queryError, refetch } = useListMenuItemsQuery(
    { setupId: selectedId || '', schemaKey },
    { skip: !selectedId }
  );

  // Transform menu items to DraftMenuItem format
  const items = useMemo(() => {
    if (!data) return [];
    return data.map(item => {
      // Use custom titleSelector if provided, otherwise use the label from the query
      let title = item.label;
      if (titleSelector && item.id) {
        // We don't have full draft data here, so we use the label as fallback
        title = item.label || item.id;
      }
      return {
        title,
        kind: 'form' as const,
        params: { schemaKey, draftId: item.id }
      };
    });
  }, [data, schemaKey, titleSelector]);

  const error = queryError ? String(queryError) : null;

  // Maintain backward compatibility with existing API
  const ensureLoaded = useCallback((force?: boolean) => {
    if (force) {
      void refetch();
    }
  }, [refetch]);

  const refresh = useCallback(async () => {
    await refetch();
  }, [refetch]);

  const loadNow = useCallback(async (force?: boolean) => {
    if (force) {
      await refetch();
    }
    return items;
  }, [refetch, items]);

  return { items, loading: isLoading, error, ensureLoaded, refresh, loadNow };
}