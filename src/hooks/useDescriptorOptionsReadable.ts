import { useState, useEffect, useCallback, useRef } from 'react';
import { listDrafts } from '../shared/api';
import type { DraftParsed } from '../shared/api/facade/draft';

/**
 * Option for descriptor dropdown with human-readable label
 */
export interface DescriptorOptionReadable {
  value: string;
  label: string;
  meta: {
    prefix: string;
    descriptorName: string;
  };
}

/**
 * Fetch drafts by prefix from the API
 * @param setupId - The setup ID to fetch drafts for
 * @param prefix - Optional prefix to filter drafts (e.g., "Chest", "Item")
 */
export async function fetchDraftsByPrefix(
  setupId: string,
  prefix?: string
): Promise<DraftParsed[]> {
  const allDrafts = await listDrafts(setupId);
  
  if (!prefix) {
    return allDrafts;
  }
  
  // Filter drafts by prefix in their content.Id field
  return allDrafts.filter(draft => {
    if (!draft.content || typeof draft.content !== 'object') {
      return false;
    }
    const content = draft.content as Record<string, unknown>;
    const id = String(content['Id'] ?? '');
    return id.startsWith(prefix);
  });
}

/**
 * Map draft records to human-readable dropdown options
 * Format: "[{prefix}] {descriptorName} — {id}"
 * @param drafts - Array of parsed draft records
 */
export function mapDraftRecordsToOptions(
  drafts: DraftParsed[]
): DescriptorOptionReadable[] {
  return drafts.map(draft => {
    const content = draft.content as Record<string, unknown> | undefined;
    const id = String(content?.['Id'] ?? content?.['id'] ?? draft.id ?? '');
    
    // Extract prefix and descriptor name from the Id field
    // Example: "ChestDescriptor.Wooden" -> prefix: "Chest", name: "Wooden"
    const parts = id.split('.');
    let prefix = '';
    let descriptorName = id;
    
    if (parts.length >= 2) {
      // Check if first part contains "Descriptor"
      if (parts[0].includes('Descriptor')) {
        // Extract prefix from descriptor (e.g., "ChestDescriptor" -> "Chest")
        prefix = parts[0].replace('Descriptor', '');
        descriptorName = parts.slice(1).join('.');
      } else {
        prefix = parts[0];
        descriptorName = parts.slice(1).join('.');
      }
    }
    
    // Format label as "[prefix] descriptorName — id"
    const label = prefix 
      ? `[${prefix}] ${descriptorName} — ${id}`
      : `${descriptorName} — ${id}`;
    
    return {
      value: id,
      label,
      meta: {
        prefix,
        descriptorName,
      },
    };
  });
}

/**
 * Hook to load descriptor options with human-readable labels
 * Provides simple in-memory caching and reload capability
 * 
 * @param setupId - The setup ID to fetch drafts for
 * @param prefix - Optional prefix to filter options (e.g., "Chest")
 * @returns Object with options, optionsById map, and reload function
 */
export function useDescriptorOptionsReadable(
  setupId: string | undefined,
  prefix?: string
): {
  options: DescriptorOptionReadable[];
  optionsById: Map<string, DescriptorOptionReadable>;
  loading: boolean;
  error: string | null;
  reload: () => Promise<void>;
} {
  const [options, setOptions] = useState<DescriptorOptionReadable[]>([]);
  const [optionsById, setOptionsById] = useState<Map<string, DescriptorOptionReadable>>(new Map());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  
  // In-memory cache: key = `${setupId}:${prefix}`
  const cacheRef = useRef<Map<string, { 
    options: DescriptorOptionReadable[]; 
    timestamp: number;
  }>>(new Map());
  const cacheTTL = useRef(5 * 60 * 1000); // 5 minutes
  
  const loadOptions = useCallback(async (force = false) => {
    if (!setupId) {
      setOptions([]);
      setOptionsById(new Map());
      setLoading(false);
      setError(null);
      return;
    }
    
    const cacheKey = `${setupId}:${prefix || ''}`;
    
    // Check cache first (unless forced reload)
    if (!force) {
      const cached = cacheRef.current.get(cacheKey);
      if (cached && Date.now() - cached.timestamp < cacheTTL.current) {
        setOptions(cached.options);
        const byIdMap = new Map(cached.options.map(opt => [opt.value, opt]));
        setOptionsById(byIdMap);
        setLoading(false);
        setError(null);
        return;
      }
    }
    
    // Cancel any ongoing request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    
    const abortController = new AbortController();
    abortControllerRef.current = abortController;
    
    setLoading(true);
    setError(null);
    
    try {
      const drafts = await fetchDraftsByPrefix(setupId, prefix);
      
      if (abortController.signal.aborted) return;
      
      const mappedOptions = mapDraftRecordsToOptions(drafts);
      
      // Sort by prefix -> descriptor name -> id
      mappedOptions.sort((a, b) => {
        if (a.meta.prefix !== b.meta.prefix) {
          return a.meta.prefix.localeCompare(b.meta.prefix);
        }
        if (a.meta.descriptorName !== b.meta.descriptorName) {
          return a.meta.descriptorName.localeCompare(b.meta.descriptorName);
        }
        return a.value.localeCompare(b.value);
      });
      
      // Update cache
      cacheRef.current.set(cacheKey, {
        options: mappedOptions,
        timestamp: Date.now(),
      });
      
      setOptions(mappedOptions);
      const byIdMap = new Map(mappedOptions.map(opt => [opt.value, opt]));
      setOptionsById(byIdMap);
      setLoading(false);
    } catch (e) {
      if (!abortController.signal.aborted) {
        setError(e instanceof Error ? e.message : 'Failed to load descriptor options');
        setOptions([]);
        setOptionsById(new Map());
        setLoading(false);
      }
    }
  }, [setupId, prefix]);
  
  // Load on mount and when setupId/prefix changes
  useEffect(() => {
    void loadOptions(false);
    
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [loadOptions]);
  
  // Reload function for manual refresh
  const reload = useCallback(async () => {
    await loadOptions(true);
  }, [loadOptions]);
  
  return {
    options,
    optionsById,
    loading,
    error,
    reload,
  };
}
