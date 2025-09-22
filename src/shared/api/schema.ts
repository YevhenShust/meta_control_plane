import { http } from './http';
import type { components } from '../../types/openapi.d.ts';

export type SchemaDto = NonNullable<components['schemas']['SchemaDto']>;
export type SchemaListResponse = NonNullable<components['schemas']['SchemaListResponse']>;

export async function listSchemasV1(setupId: string, params?: { skip?: number; limit?: number }): Promise<SchemaDto[]> {
  const res = await http.get<SchemaListResponse>(`/api/v1/Schemas/${encodeURIComponent(setupId)}`, { params });
  return (res.data?.schemas ?? []) as SchemaDto[];
}

// returns parsed JSON schema object; caches in-memory by schemaId
const _schemaCache = new Map<string, unknown>();
export async function getSchemaByIdV1(schemaId: string, setupId: string): Promise<unknown> {
  const cached = _schemaCache.get(schemaId);
  if (cached) return cached;
  const list = await listSchemasV1(setupId);
  const hit = list.find(s => s.id === schemaId);
  if (!hit || !hit.content) throw new Error(`Schema not found or empty: ${schemaId}`);
  let parsed: unknown;
  try {
    parsed = JSON.parse(hit.content);
  } catch {
    parsed = hit.content as unknown;
  }
  _schemaCache.set(schemaId, parsed);
  return parsed;
}

export async function uploadSchemaV1(setupId: string, schema: unknown): Promise<components['schemas']['SchemaCreateResponse']> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const res = await http.post<components['schemas']['SchemaCreateResponse']>(`/api/v1/Schemas/${encodeURIComponent(setupId)}`, schema as any);
  if (res && res.data) return res.data;
  const fd = new FormData();
  const blob = new Blob([JSON.stringify(schema ?? {}, null, 2)], { type: 'application/json' });
  fd.append('file', blob, 'schema.json');
  const res2 = await http.post<components['schemas']['SchemaCreateResponse']>(`/api/v1/Schemas/${encodeURIComponent(setupId)}`, fd, { headers: { 'Content-Type': 'multipart/form-data' } });
  return res2.data;
}
