import React, { createContext, useCallback, useMemo, useState } from 'react';
import { listDraftsV1, type DraftDto } from '../shared/api/drafts';

// Clean single-file DraftsContext

type ParsedDraft = { draft: DraftDto; content: unknown };

export type DraftsContextValue = {
  ensureDrafts: (setupId: string, schemaId: string) => Promise<void>;
  getDrafts: (setupId: string, schemaId: string) => ParsedDraft[] | undefined;
  getDraftById: (setupId: string, draftId: string) => ParsedDraft | undefined;
  invalidate: (setupId?: string, schemaId?: string) => void;
};

const DraftsContext = createContext<DraftsContextValue | null>(null);

const parseDraft = (d: DraftDto): ParsedDraft => {
  try {
    const content = typeof d.content === 'string' ? JSON.parse(d.content) : d.content ?? {};
    return { draft: d, content };
  } catch {
    return { draft: d, content: {} };
  }
};

export const DraftsProvider: React.FC<React.PropsWithChildren<unknown>> = ({ children }) => {
  const [store, setStore] = useState<Record<string, ParsedDraft[]>>({});

  const ensureDrafts = useCallback(async (setupId: string, schemaId: string) => {
    const key = `${setupId}:${schemaId}`;
    if (store[key] && store[key].length) return;
    const list = await listDraftsV1(setupId);
    const parsed = list.filter(d => String(d.schemaId || '') === String(schemaId)).map(parseDraft);
    setStore(s => ({ ...s, [key]: parsed }));
  }, [store]);

  const getDrafts = useCallback((setupId: string, schemaId: string) => store[`${setupId}:${schemaId}`], [store]);

  const getDraftById = useCallback((setupId: string, draftId: string) => {
    // try direct lookup
    const maybe = store[`${setupId}:${draftId}`];
    if (maybe && maybe.length) return maybe.find(p => String(p.draft.id) === String(draftId));
    // fallback: scan setup-scoped keys
    const prefix = `${setupId}:`;
    for (const k of Object.keys(store)) {
      if (!k.startsWith(prefix)) continue;
      const found = (store[k] ?? []).find(p => String(p.draft.id) === String(draftId));
      if (found) return found;
    }
    return undefined;
  }, [store]);

  const invalidate = useCallback((setupId?: string, schemaId?: string) => {
    if (!setupId && !schemaId) { setStore({}); return; }
    if (setupId && schemaId) {
      const key = `${setupId}:${schemaId}`;
      setStore(s => { const c = { ...s }; delete c[key]; return c; });
      return;
    }
    if (setupId) {
      const prefix = `${setupId}:`;
      setStore(s => Object.fromEntries(Object.entries(s).filter(([k]) => !k.startsWith(prefix))));
    }
  }, []);

  const value = useMemo(() => ({ ensureDrafts, getDrafts, getDraftById, invalidate }), [ensureDrafts, getDrafts, getDraftById, invalidate]);

  return <DraftsContext.Provider value={value}>{children}</DraftsContext.Provider>;
};

export default DraftsContext;