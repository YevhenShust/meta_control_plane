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
  const { data: menuItems, isLoading, error: queryError, refetch } = useListMenuItemsQuery(
    { setupId: selectedId || '', schemaKey },
    { skip: !selectedId }
  );

  // Build DraftMenuItem array from RTK Query data
  const items = useMemo(() => {
    if (!menuItems) return [];
    return menuItems.map(item => ({
      title: titleSelector 
        ? (titleSelector({ Id: item.label }, { id: item.id } as DraftParsed) || item.label)
        : item.label,
      kind: 'form' as const,
      params: { schemaKey, draftId: item.id }
    }));
  }, [menuItems, schemaKey, titleSelector]);

  const error = queryError ? String(queryError) : null;

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