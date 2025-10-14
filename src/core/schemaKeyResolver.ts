import { listSchemasV1, type SchemaParsed } from '../shared/api';
import { tryParseContent } from './parse';

// Simple in-memory cache: setupId -> (schemaKey -> { id, json })
const resolverCache = new Map<string, Map<string, { id: string; json: unknown }>>();

export async function resolveSchemaIdByKey(setupId: string, schemaKey: string): Promise<string> {
  if (!setupId) throw new Error('No setup selected');
  const loaded = await loadSchemaByKey(setupId, schemaKey);
  return loaded.id;
}

export async function loadSchemaByKey(setupId: string, schemaKey: string): Promise<{ id: string; json: unknown }> {
  if (!setupId) throw new Error('No setup selected');

  const bySetup = resolverCache.get(setupId) ?? new Map<string, { id: string; json: unknown }>();
  resolverCache.set(setupId, bySetup);
  const cached = bySetup.get(schemaKey);
  if (cached) return cached;

  const list = await listSchemasV1(setupId);
  for (const s of list as SchemaParsed[]) {
    if (!s?.content) continue;
    const parsed = tryParseContent(s.content);
    if (parsed && typeof parsed === 'object' && ('$id' in parsed) && (parsed as Record<string, unknown>)['$id'] === schemaKey) {
      const id = String(s.id ?? '');
      const out = { id, json: parsed };
      bySetup.set(schemaKey, out);
      return out;
    }
  }
  throw new Error(`Schema not found by $id: ${schemaKey}`);
}
