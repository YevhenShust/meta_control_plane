import { useEffect, useState, useRef } from 'react';
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
        // Get descriptor schema key candidates using heuristics
        const candidates = resolveDescriptorSchemaKeyHeuristics(
          propertyName || baseSchemaKey
        );

        // Try to resolve one of the candidates
        let resolvedSchemaId: string | null = null;
        for (const candidate of candidates) {
          try {
            const id = await resolveSchemaIdByKey(setupId, candidate);
            if (id) {
              resolvedSchemaId = id;
              break;
            }
          } catch {
            // Continue to next candidate
          }
        }

        if (!resolvedSchemaId) {
          setOptions([]);
          setLoading(false);
          return;
        }

        // Check if aborted
        if (abortController.signal.aborted) return;

        // Fetch drafts for the resolved schema
        const drafts = await listDrafts(setupId);

        // Check if aborted
        if (abortController.signal.aborted) return;

        // Filter and map drafts to options
        const descriptorOptions = drafts
          .filter(d => String(d.schemaId || '') === String(resolvedSchemaId))
          .map(d => {
            let label: string;
            const parsed = d.content;

            if (parsed && typeof parsed === 'object') {
              const asObj = parsed as Record<string, unknown>;
              const nice = String(asObj['Id'] ?? asObj['name'] ?? '');
              if (nice) {
                label = `${nice} (${d.id})`;
              } else {
                label = String(d.id ?? '');
              }
            } else {
              label = String(d.id ?? '');
            }

            // Prefer descriptor's internal Id property as the option value
            let value: string = String(d.id ?? '');
            if (parsed && typeof parsed === 'object') {
              const asObj = parsed as Record<string, unknown>;
              const descriptorId = String(asObj['Id'] ?? asObj['id'] ?? '');
              if (descriptorId) {
                value = descriptorId;
              }
            }

            return { label, value };
          });

        // Cache the result
        globalCache.set(cacheKey, {
          options: descriptorOptions,
          timestamp: Date.now(),
        });

        if (!abortController.signal.aborted) {
          setOptions(descriptorOptions);
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
