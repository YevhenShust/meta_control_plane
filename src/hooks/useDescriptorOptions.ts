import { useEffect, useState, useRef, useMemo } from 'react';
import { resolveSchemaIdByKey } from '../core/schemaKeyResolver';
import { listDrafts } from '../shared/api';
import { resolveDescriptorSchemaKeyHeuristics } from '../core/schemaTools';

export interface DescriptorOption {
  label: string;
  value: string;
}

/**
 * Hook to load descriptor options for a given schema key.
 * Automatically resolves descriptor schema using heuristics and fetches drafts.
 * No client-side caching; always fetches fresh data for current inputs.
 */
export function useDescriptorOptions(
  setupId: string | undefined,
  baseSchemaKey: string | undefined,
  propertyName?: string
): {
  options: DescriptorOption[];
  loading: boolean;
  error: string | null;
} {
  const [options, setOptions] = useState<DescriptorOption[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  useEffect(() => {
    // Reset state when inputs change
    if (!setupId || !baseSchemaKey) {
      setOptions([]);
      setLoading(false);
      setError(null);
      return;
    }

    // Cancel any ongoing request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    const abortController = new AbortController();
    abortControllerRef.current = abortController;

    setLoading(true);
    setError(null);

    (async () => {
      try {
        const opts = await loadDescriptorOptions(setupId, baseSchemaKey, propertyName, abortController.signal);
        if (!abortController.signal.aborted) {
          setOptions(opts);
          setLoading(false);
        }
      } catch (e) {
        if (!abortController.signal.aborted) {
          setError(e instanceof Error ? e.message : 'Failed to load descriptor options');
          setOptions([]);
          setLoading(false);
        }
      }
    })();

    // Cleanup
    return () => {
      abortController.abort();
    };
  }, [setupId, baseSchemaKey, propertyName]);

  return { options, loading, error };
}

/**
 * Helper to load descriptor options for a single property. Separated so it can be reused
 * by batch hooks / server-side transforms.
 */
export async function loadDescriptorOptions(
  setupId: string,
  baseSchemaKey: string,
  propertyName: string | undefined,
  signal?: AbortSignal
): Promise<DescriptorOption[]> {
  if (signal?.aborted) return [];
  // Heuristics candidates
  const candidates = resolveDescriptorSchemaKeyHeuristics(propertyName || baseSchemaKey, baseSchemaKey);

  // Resolve one candidate to schemaId
  let resolvedSchemaId: string | null = null;
  for (const candidate of candidates) {
    try {
      const id = await resolveSchemaIdByKey(setupId, candidate);
      if (id) { resolvedSchemaId = id; break; }
    } catch {
      // Continue trying other candidates
    }
  }

  if (!resolvedSchemaId) {
    return [];
  }
  if (signal?.aborted) return [];

  const drafts = await listDrafts(setupId);
  if (signal?.aborted) return [];

  const filteredDrafts = drafts.filter(d => String(d.schemaId || '') === String(resolvedSchemaId));

  // Build options: value = content.Id (fallback to draft id); label = Id or name (no draft id suffix)
  const rawOptions: DescriptorOption[] = filteredDrafts.map(d => {
    const parsed = d.content;
    let value = String(d.id ?? '');
    let label = value;
    if (parsed && typeof parsed === 'object') {
      const asObj = parsed as Record<string, unknown>;
      const descriptorId = String(asObj['Id'] ?? asObj['id'] ?? '') || undefined;
      const nice = String(asObj['Id'] ?? asObj['name'] ?? '') || undefined;
      if (descriptorId) value = descriptorId;
      label = nice ?? value;
    }
    return { label, value };
  });

  // Dedupe by value and sort by label for stable UX
  const uniqMap = new Map<string, DescriptorOption>();
  for (const opt of rawOptions) {
    if (!uniqMap.has(opt.value)) uniqMap.set(opt.value, opt);
  }
  const descriptorOptions = Array.from(uniqMap.values()).sort((a, b) => a.label.localeCompare(b.label));

  return descriptorOptions;
}

/**
 * Batch hook: return descriptor options for an array of descriptor column keys.
 * Returns a map keyed by the propertyName (the base property name without 'Id').
 */
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
    if (!setupId || !baseSchemaKey) { 
      setMap({}); setLoading(false); setError(null); return; 
    }
    if (!propertyNames || propertyNames.length === 0) { 
      setMap({}); setLoading(false); setError(null); return; 
    }

    if (abortRef.current) abortRef.current.abort();
    const ac = new AbortController(); abortRef.current = ac;
    setLoading(true); setError(null);

    (async () => {
      try {
        const entries: [string, DescriptorOption[]][] = [];
        for (const pn of propertyNames) {
          if (!pn) continue;
          const opts = await loadDescriptorOptions(setupId, baseSchemaKey, pn, ac.signal);
          if (ac.signal.aborted) return;
          entries.push([pn, opts]);
        }
        const result: Record<string, DescriptorOption[]> = {};
        for (const [k, v] of entries) result[k] = v;
        if (!ac.signal.aborted) {
          setMap(result);
          setLoading(false);
        }
      } catch (e) {
        if (!ac.signal.aborted) {
          setError(e instanceof Error ? e.message : String(e));
          setMap({});
          setLoading(false);
        }
      }
    })();

    return () => { ac.abort(); };
  }, [setupId, baseSchemaKey, propNamesKey, propertyNames]);

  return { map, loading, error };
}
