import { listSchemasV1, type SchemaParsed } from '../shared/api';
import { tryParseContent } from './parse';

// In-memory cache for schema key → schema ID resolution
// Key format: "setupId:schemaKey" → schemaId
const schemaIdCache = new Map<string, string>();

// Cache for full schema data
// Key format: "setupId:schemaKey" → { id, json }
const schemaDataCache = new Map<string, { id: string; json: unknown }>();

/**
 * Resolve schema ID by schema key with in-memory caching
 */
export async function resolveSchemaIdByKey(setupId: string, schemaKey: string): Promise<string> {
  if (!setupId) throw new Error('No setup selected');
  
  // Check cache first
  const cacheKey = `${setupId}:${schemaKey}`;
  const cached = schemaIdCache.get(cacheKey);
  if (cached) return cached;
  
  // Load and cache
  const loaded = await loadSchemaByKey(setupId, schemaKey);
  schemaIdCache.set(cacheKey, loaded.id);
  return loaded.id;
}

/**
 * Load schema by key with in-memory caching
 */
export async function loadSchemaByKey(setupId: string, schemaKey: string): Promise<{ id: string; json: unknown }> {
  if (!setupId) throw new Error('No setup selected');

  // Check cache first
  const cacheKey = `${setupId}:${schemaKey}`;
  const cached = schemaDataCache.get(cacheKey);
  if (cached) return cached;

  // Load from API
  const list = await listSchemasV1(setupId);
  for (const s of list as SchemaParsed[]) {
    if (!s?.content) continue;
    const parsed = tryParseContent(s.content);
    if (parsed && typeof parsed === 'object' && ('$id' in parsed) && (parsed as Record<string, unknown>)['$id'] === schemaKey) {
      const id = String(s.id ?? '');
      const result = { id, json: parsed };
      // Cache the result
      schemaDataCache.set(cacheKey, result);
      schemaIdCache.set(cacheKey, id);
      return result;
    }
  }
  throw new Error(`Schema not found by $id: ${schemaKey}`);
}

/**
 * Clear schema cache (useful for testing or when schemas change)
 */
export function clearSchemaCache(): void {
  schemaIdCache.clear();
  schemaDataCache.clear();
}
