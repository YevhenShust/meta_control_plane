// src/menu/useGameChests.ts
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import useSetups from '../setup/useSetups.ts';
import { listSchemasV1 } from '../shared/api/schema.ts';
import { listDraftsV1 } from '../shared/api/drafts.ts';
import type { components } from '../types/openapi';

type DraftDto = NonNullable<components['schemas']['DraftDto']>;
type SchemaDto = NonNullable<components['schemas']['SchemaDto']>;

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

/** Кеш схем по ключу `${setupId}:${schemaKey}` → schemaId  */
const schemaIdCache = new Map<string, string>();
/** Inflight проміси на той самий ключ, щоб не дублювати запити */
const inflight = new Map<string, Promise<void>>();

/** Безпечний парсер JSON контенту драфта */
function parseDraftContent(d: DraftDto): unknown {
  try {
    if (typeof d.content === 'string') return JSON.parse(d.content);
    return (d.content as unknown) ?? {};
  } catch {
    return {};
  }
}

/** Універсальний хук для побудови меню з драфтів певної схеми */
export function useDraftMenu(options: UseDraftMenuOptions): UseDraftMenuResult {
  const { schemaKey, titleSelector } = options;
  const { selectedId } = useSetups();

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
    const k = cacheKey;
    const cached = schemaIdCache.get(k);
    if (cached) return cached;

    const schemas: SchemaDto[] = await listSchemasV1(selectedId);
    const match = schemas.find((s) => {
      try {
        const raw = typeof s.content === 'string' ? JSON.parse(s.content) : s.content;
        if (!raw || typeof raw !== 'object') return false;
        const id = (raw as Record<string, unknown>)['$id'];
        return typeof id === 'string' && id === schemaKey;
      } catch {
        return false;
      }
    });

    if (!match || !match.id) {
      throw new Error(`Schema not found: ${schemaKey}`);
    }
    schemaIdCache.set(k, String(match.id));
    return String(match.id);
  }, [cacheKey, schemaKey, selectedId]);

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
          const drafts = await listDraftsV1(selectedId);

          const filtered = drafts.filter((d) => String(d.schemaId || '') === schemaId);
          const mapped: DraftMenuItem[] = filtered.map((d) => {
            const content = parseDraftContent(d);
            const title = buildTitle(content, d);
            return {
              title,
              kind: 'form',
              params: { schemaKey, draftId: String(d.id) },
            };
          });

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
    [buildTitle, cacheKey, resolveSchemaId, schemaKey, selectedId]
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

  // реакція на збереження драфтів (emit у FormRenderer)
  useEffect(() => {
    function onChanged(e: Event) {
      const d = (e as CustomEvent<{ schemaKey?: string; setupId?: string }>).detail || {};
      if (d.schemaKey === schemaKey && d.setupId === selectedId) {
        void load(true);
      }
    }
    window.addEventListener('drafts:changed', onChanged);
    return () => window.removeEventListener('drafts:changed', onChanged);
  }, [load, schemaKey, selectedId]);

  return { items, loading, error, ensureLoaded, refresh };
}

/** Тонкий враппер під Game → Chests */
export default function useGameChests() {
  return useDraftMenu({ schemaKey: 'ChestDescriptor' });
}
