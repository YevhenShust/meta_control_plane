import { listSchemasV1, type SchemaParsed } from '../shared/api';
import { tryParseContent } from './parse';

const cache = new Map<string, { id: string; json: unknown }>();

function cacheKey(setupId: string, schemaKey: string) {
  return `${setupId}:${schemaKey}`;
}

export async function resolveSchemaIdByKey(setupId: string, schemaKey: string): Promise<string> {
  if (!setupId) throw new Error('No setup selected');
  const key = cacheKey(setupId, schemaKey);
  const cached = cache.get(key);
  if (cached) return cached.id;
  const loaded = await loadSchemaByKey(setupId, schemaKey);
  cache.set(key, { id: loaded.id, json: loaded.json });
  return loaded.id;
}

export async function loadSchemaByKey(setupId: string, schemaKey: string): Promise<{ id: string; json: unknown }> {
  if (!setupId) throw new Error('No setup selected');
  const key = cacheKey(setupId, schemaKey);
  const cached = cache.get(key);
  if (cached) return { id: cached.id, json: cached.json };

  const list = await listSchemasV1(setupId);
  for (const s of list as SchemaParsed[]) {
    if (!s?.content) continue;
    const parsed = tryParseContent(s.content);
    if (parsed && typeof parsed === 'object' && ('$id' in parsed) && (parsed as Record<string, unknown>)['$id'] === schemaKey) {
      // cache and return
      const id = String(s.id ?? '');
      console.debug('[schemaKeyResolver] resolved', { setupId, schemaKey, schemaId: id });
      cache.set(key, { id, json: parsed });
      return { id, json: parsed };
    }
  }
  throw new Error(`Schema not found by $id: ${schemaKey}`);
}
