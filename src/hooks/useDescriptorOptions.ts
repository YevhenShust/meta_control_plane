import { useEffect, useMemo, useRef, useState } from 'react';
import { resolveSchemaIdByKey } from '../core/schemaKeyResolver';
import { listDrafts } from '../shared/api';
import { resolveDescriptorSchemaKeyHeuristics } from '../core/schemaTools';

export interface DescriptorOption { label: string; value: string }

async function loadOptionsForProperty(
  setupId: string,
  baseSchemaKey: string,
  propertyName: string,
  signal?: AbortSignal
): Promise<DescriptorOption[]> {
  if (signal?.aborted) return [];
  const candidates = resolveDescriptorSchemaKeyHeuristics(propertyName || baseSchemaKey, baseSchemaKey);
  let schemaId: string | null = null;
  for (const c of candidates) {
    try {
      const id = await resolveSchemaIdByKey(setupId, c);
      if (id) { schemaId = id; break; }
    } catch {
      // ignore and try next candidate
    }
  }
  if (!schemaId || signal?.aborted) return [];
  const drafts = await listDrafts(setupId);
  if (signal?.aborted) return [];
  const filtered = drafts.filter(d => String(d.schemaId || '') === String(schemaId));
  const seen = new Set<string>();
  const out: DescriptorOption[] = [];
  for (const d of filtered) {
    const parsed = d.content;
    let value = String(d.id ?? '');
    let label = value;
    if (parsed && typeof parsed === 'object') {
      const asObj = parsed as Record<string, unknown>;
      const descriptorId = String(asObj['Id'] ?? asObj['id'] ?? '') || '';
      const nice = String(asObj['Id'] ?? asObj['name'] ?? '') || '';
      if (descriptorId) value = descriptorId;
      label = nice || value;
    }
    if (value && !seen.has(value)) { seen.add(value); out.push({ label, value }); }
  }
  out.sort((a, b) => a.label.localeCompare(b.label));
  return out;
}

export function useDescriptorOptionsForColumns(
  setupId: string | undefined,
  baseSchemaKey: string | undefined,
  propertyNames: Array<string | undefined>
): { map: Record<string, DescriptorOption[]>; loading: boolean; error: string | null } {
  const [map, setMap] = useState<Record<string, DescriptorOption[]>>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const propNamesKey = useMemo(() => (propertyNames || []).map(p => p ?? '').join('|'), [propertyNames]);

  useEffect(() => {
    if (!setupId || !baseSchemaKey) { setMap({}); setLoading(false); setError(null); return; }
    if (!propertyNames || propertyNames.length === 0) { setMap({}); setLoading(false); setError(null); return; }

    if (abortRef.current) abortRef.current.abort();
    const ac = new AbortController(); abortRef.current = ac;
    setLoading(true); setError(null);

    (async () => {
      try {
        const effective = propertyNames.filter((p): p is string => !!p);
        const results = await Promise.all(
          effective.map(async (pn) => [pn, await loadOptionsForProperty(setupId, baseSchemaKey, pn, ac.signal)] as [string, DescriptorOption[]])
        );
        if (ac.signal.aborted) return;
        const result: Record<string, DescriptorOption[]> = Object.fromEntries(results);
        if (!ac.signal.aborted) { setMap(result); setLoading(false); }
      } catch (e) {
        if (!ac.signal.aborted) { setError(e instanceof Error ? e.message : String(e)); setMap({}); setLoading(false); }
      }
    })();

    return () => { ac.abort(); };
    // Note: we intentionally depend on propNamesKey instead of propertyNames identity
    // to avoid needless refetches when the array reference changes with same content.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [setupId, baseSchemaKey, propNamesKey]);

  return { map, loading, error };
}
