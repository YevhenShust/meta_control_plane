import { listSchemasV1, type SchemaParsed } from '../shared/api';
import { tryParseContent } from './parse';

export async function resolveSchemaIdByKey(setupId: string, schemaKey: string): Promise<string> {
  if (!setupId) throw new Error('No setup selected');
  const loaded = await loadSchemaByKey(setupId, schemaKey);
  return loaded.id;
}

export async function loadSchemaByKey(setupId: string, schemaKey: string): Promise<{ id: string; json: unknown }> {
  if (!setupId) throw new Error('No setup selected');

  const list = await listSchemasV1(setupId);
  for (const s of list as SchemaParsed[]) {
    if (!s?.content) continue;
    const parsed = tryParseContent(s.content);
    if (parsed && typeof parsed === 'object' && ('$id' in parsed) && (parsed as Record<string, unknown>)['$id'] === schemaKey) {
    const id = String(s.id ?? '');
      return { id, json: parsed };
    }
  }
  throw new Error(`Schema not found by $id: ${schemaKey}`);
}
