// src/menu/useDraftMenu.ts
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { onChanged } from '../shared/events/DraftEvents';
import useSetups from '../setup/useSetups.ts';
import { resolveSchemaIdByKey } from '../core/uiLinking';
import useDrafts from '../setup/useDrafts';
import type { components } from '../types/openapi';
type DraftDto = NonNullable<components['schemas']['DraftDto']>;

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
  titleSelector?: (content: unknown, draft: DraftDto) => string;
};

type UseDraftMenuResult = {
  items: DraftMenuItem[];
  loading: boolean;
  error: string | null;
  /** Ледачий старт завантаження (або повторне) */
  ensureLoaded: (force?: boolean) => void;
  /** Явне перезавантаження */
  refresh: () => Promise<void>;
};

/** Inflight проміси на той самий ключ, щоб не дублювати запити */
const inflight = new Map<string, Promise<void>>();

/** Безпечний парсер JSON контенту драфта */
// parsing is handled centrally by DraftsContext

/** Універсальний хук для побудови меню з драфтів певної схеми */
export function useDraftMenu(options: UseDraftMenuOptions): UseDraftMenuResult {
  const { schemaKey, titleSelector } = options;
  const { selectedId } = useSetups();
  const draftsCtx = useDrafts();

  const [items, setItems] = useState<DraftMenuItem[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const cacheKey = useMemo(
    () => (selectedId ? `${selectedId}:${schemaKey}` : ''),
    [selectedId, schemaKey]
  );

  const mountedRef = useRef(true);
  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const resolveSchemaId = useCallback(async (): Promise<string> => {
    if (!selectedId) throw new Error('No setup selected');
    const sid = await resolveSchemaIdByKey(selectedId, schemaKey);
    if (!sid) throw new Error(`Schema not found: ${schemaKey}`);
    return sid;
  }, [schemaKey, selectedId]);

  const buildTitle = useCallback(
    (content: unknown, d: DraftDto): string => {
      if (titleSelector) {
        const t = (titleSelector(content, d) || '').trim();
        if (t) return t;
      }
      const id: unknown =
        content && typeof content === 'object' && content !== null && 'Id' in content
          ? (content as Record<string, unknown>).Id
          : '';
      const t = (typeof id === 'string' ? id : '').trim();
      return t || String(d.id);
    },
    [titleSelector]
  );

  const load = useCallback(
    async (force = false) => {
      if (!selectedId) return;
      const key = cacheKey;
      if (!key) return;

      if (!force && inflight.has(key)) {
        await inflight.get(key);
        return;
      }

      const run = (async () => {
        setLoading(true);
        setError(null);
        try {
          const schemaId = await resolveSchemaId();
          await draftsCtx.ensureDrafts(selectedId, schemaId);
          const cached = draftsCtx.getDrafts(selectedId, schemaId) ?? [];
          const mapped: DraftMenuItem[] = cached.map((p) => ({
            title: buildTitle(p.content, p.draft),
            kind: 'form',
            params: { schemaKey, draftId: String(p.draft.id) },
          }));

          if (mountedRef.current) setItems(mapped);
        } catch (err) {
          const message = err instanceof Error ? err.message : String(err) || 'Failed to load drafts';
          if (mountedRef.current) setError(message);
        } finally {
          if (mountedRef.current) setLoading(false);
        }
      })();

      inflight.set(key, run);
      try {
        await run;
      } finally {
        inflight.delete(key);
      }
    },
    [buildTitle, resolveSchemaId, schemaKey, selectedId, draftsCtx, cacheKey]
  );

  const ensureLoaded = useCallback(
    (force?: boolean) => {
      // ледачий старт
      if (!loading && items.length === 0) void load(!!force);
      else if (force) void load(true);
    },
    [items.length, load, loading]
  );

  const refresh = useCallback(async () => {
    await load(true);
  }, [load]);

  // автозавантаження на зміну setup або schemaKey
  useEffect(() => {
    setItems([]); // скинути попередній список при зміні контексту
    if (selectedId) void load(true);
  }, [selectedId, schemaKey, load]);

  // reaction to saved drafts: subscribe to internal emitter used by FormRenderer
  useEffect(() => {
    const off = onChanged((payload: { schemaKey: string; setupId: string }) => {
      if (payload.schemaKey === schemaKey && payload.setupId === selectedId) void load(true);
    });
    return off;
  }, [load, schemaKey, selectedId]);

  return { items, loading, error, ensureLoaded, refresh };
}