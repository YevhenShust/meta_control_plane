import { useEffect, useState, useRef, useMemo } from 'react';
import { resolveSchemaIdByKey } from '../core/schemaKeyResolver';
import { listDrafts } from '../shared/api';
import { resolveDescriptorSchemaKeyHeuristics } from '../core/schemaTools';

export interface DescriptorOption {
  label: string;
  value: string;
}

interface CacheEntry {
  options: DescriptorOption[];
  timestamp: number;
}

// Global cache to persist across hook instances
const globalCache = new Map<string, CacheEntry>();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

// Track in-flight fetches per cache key so concurrent callers share the same promise
const inFlightRequests = new Map<string, Promise<DescriptorOption[]>>();

/**
 * Hook to load descriptor options for a given schema key.
 * Automatically resolves descriptor schema using heuristics and fetches drafts.
 * Results are cached to avoid redundant API calls.
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

    // Generate cache key
    const cacheKey = `${setupId}:${baseSchemaKey}:${propertyName || ''}`;

    // Check cache first
    const cached = globalCache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
      setOptions(cached.options);
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
 * 
 * This function:
 * 1. Uses heuristics to resolve the descriptor schema key from propertyName
 * 2. Fetches all drafts for that schema
 * 3. Maps drafts to { label, value } options for use in dropdowns
 * 
 * Results are cached globally to avoid redundant API calls.
 */
export async function loadDescriptorOptions(
  setupId: string,
  baseSchemaKey: string,
  propertyName: string | undefined,
  signal?: AbortSignal
): Promise<DescriptorOption[]> {
  // Use a stable cache key for both caching and in-flight dedupe
  const cacheKey = `${setupId}:${baseSchemaKey}:${propertyName || ''}`;

  // Return cached if still fresh
  const cached = globalCache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.options;
  }

  // If another caller already started the same fetch, reuse that promise
  const existing = inFlightRequests.get(cacheKey);
  if (existing) {
    return existing;
  }

  if (signal?.aborted) return [];

  // Create the fetch promise and store it so concurrent callers reuse it
  const promise = (async (): Promise<DescriptorOption[]> => {
    // Heuristics candidates
    const candidates = resolveDescriptorSchemaKeyHeuristics(propertyName || baseSchemaKey);

    // Resolve one candidate to schemaId
    let resolvedSchemaId: string | null = null;
    for (const candidate of candidates) {
      try {
        const id = await resolveSchemaIdByKey(setupId, candidate);
        if (id) { resolvedSchemaId = id; break; }
      } catch { /* continue */ }
    }

    if (!resolvedSchemaId) return [];
    if (signal?.aborted) return [];

    const drafts = await listDrafts(setupId);
    if (signal?.aborted) return [];

    const descriptorOptions = drafts
      .filter(d => String(d.schemaId || '') === String(resolvedSchemaId))
      .map(d => {
        let label: string;
        const parsed = d.content;
        if (parsed && typeof parsed === 'object') {
          const asObj = parsed as Record<string, unknown>;
          const nice = String(asObj['Id'] ?? asObj['name'] ?? '');
          label = nice ? `${nice} (${d.id})` : String(d.id ?? '');
        } else {
          label = String(d.id ?? '');
        }
        let value = String(d.id ?? '');
        if (parsed && typeof parsed === 'object') {
          const asObj = parsed as Record<string, unknown>;
          const descriptorId = String(asObj['Id'] ?? asObj['id'] ?? '');
          if (descriptorId) value = descriptorId;
        }
        return { label, value } as DescriptorOption;
      });

    // Atomically update cache for this key
    try {
      globalCache.set(cacheKey, { options: descriptorOptions, timestamp: Date.now() });
    } catch {
      // non-fatal: if cache set fails for some reason, still return the data
    }

    return descriptorOptions;
  })();

  inFlightRequests.set(cacheKey, promise);
  // Ensure removal of the in-flight record regardless of success/failure
  promise.finally(() => { inFlightRequests.delete(cacheKey); });

  return promise;
}

/**
 * Batch hook: return descriptor options for an array of descriptor column keys.
 * Returns a map keyed by the propertyName (the base property name without 'Id').
 * 
 * This hook is used by TableRenderer to prefetch dropdown options for all DescriptorId
 * columns in a single batch operation, avoiding N separate API calls.
 * 
 * Example:
 *   propertyNames = ["ChestDescriptor", "ItemDescriptor"]
 *   returns: { map: { "ChestDescriptor": [...options], "ItemDescriptor": [...options] } }
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
    if (!setupId || !baseSchemaKey) { setMap({}); setLoading(false); setError(null); return; }
    if (!propertyNames || propertyNames.length === 0) { setMap({}); setLoading(false); setError(null); return; }

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
