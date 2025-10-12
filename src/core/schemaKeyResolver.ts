import { listSchemasV1, type SchemaParsed } from '../shared/api';
import { tryParseContent } from './parse';

// In-memory cache: setupId -> normalizedKey -> schemaId
const schemaKeyCache: Map<string, Map<string, string>> = new Map();

function normalizeKey(key: string | undefined): string {
  return String(key || '')
    .trim()
    .replace(/\.json$/i, '')
    .toLowerCase();
}

/**
 * Resolve schemaId for a given schemaKey with tolerant matching and caching.
 * - exact $id match, case-insensitive
 * - fallback to title match
 * - strips simple suffixes like .json
 * - returns null on miss and logs a warning
 */
export async function resolveSchemaIdByKey(setupId: string, schemaKey: string): Promise<string | null> {
  if (!setupId) throw new Error('No setup selected');
  const nKey = normalizeKey(schemaKey);

  // warm cache for setup if not present
  if (!schemaKeyCache.has(setupId)) {
    const map = new Map<string, string>();
    try {
      const list = await listSchemasV1(setupId);
      for (const s of list as SchemaParsed[]) {
        if (!s?.content) continue;
        const parsed = tryParseContent(s.content);
        if (!parsed || typeof parsed !== 'object') continue;
        const rec = parsed as Record<string, unknown>;
        const id = String(s.id ?? '');

        const idKey = normalizeKey(String(rec['$id'] ?? ''));
        const titleKey = normalizeKey(String(rec['title'] ?? ''));

        if (idKey) map.set(idKey, id);
        if (titleKey) map.set(titleKey, id);
      }
    } catch (e) {
      console.warn('[schemaKeyResolver] failed to list schemas for cache warmup', e);
    }
    schemaKeyCache.set(setupId, map);
  }

  const cached = schemaKeyCache.get(setupId)!;
  const hit = cached.get(nKey);
  if (hit) return hit;

  // As a fallback, re-scan in case cache missed a late entry
  try {
    const list = await listSchemasV1(setupId);
    for (const s of list as SchemaParsed[]) {
      if (!s?.content) continue;
      const parsed = tryParseContent(s.content);
      if (!parsed || typeof parsed !== 'object') continue;
      const rec = parsed as Record<string, unknown>;
      const id = String(s.id ?? '');
      const idKey = normalizeKey(String(rec['$id'] ?? ''));
      const titleKey = normalizeKey(String(rec['title'] ?? ''));
      if (idKey) cached.set(idKey, id);
      if (titleKey) cached.set(titleKey, id);
      if (idKey === nKey || titleKey === nKey) return id;
    }
  } catch (e) {
    console.warn('[schemaKeyResolver] retry scan failed', e);
  }

  console.warn('[schemaKeyResolver] schemaId not found for key', { setupId, schemaKey });
  return null;
}

export async function loadSchemaByKey(setupId: string, schemaKey: string): Promise<{ id: string; json: unknown }> {
  if (!setupId) throw new Error('No setup selected');

  const list = await listSchemasV1(setupId);
  for (const s of list as SchemaParsed[]) {
    if (!s?.content) continue;
    const parsed = tryParseContent(s.content);
    if (parsed && typeof parsed === 'object') {
      const rec = parsed as Record<string, unknown>;
      const idKey = String(rec['$id'] ?? '');
      const titleKey = String(rec['title'] ?? '');
      if (idKey === schemaKey || titleKey === schemaKey) {
        const id = String(s.id ?? '');
        return { id, json: parsed };
      }
    }
  }
  throw new Error(`Schema not found by key: ${schemaKey}`);
}
