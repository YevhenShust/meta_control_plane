import { http } from './http';
import type { components } from '../../types/openapi.d.ts';
import { useMock, loadMockData } from './utils';
import { tryParseContent } from '../../core/parse';

export type SchemaDto = NonNullable<components['schemas']['SchemaDto']>;
export type SchemaListResponse = NonNullable<components['schemas']['SchemaListResponse']>;

function log(...args: unknown[]) {
  console.debug('[Schemas API]', ...args);
}

export async function listSchemasV1(setupId: string, params?: { skip?: number; limit?: number }): Promise<SchemaDto[]> {
  log('listSchemasV1', { setupId, params, useMock });
  
  if (useMock) {
    log('Using mock data (VITE_USE_MOCK=1)');
    const allSchemas = await loadMockData<SchemaDto>('Schemas', 'schemas');
    const filtered = allSchemas.filter((s: SchemaDto) => String(s.setupId) === String(setupId));
    log('Mock data loaded:', filtered.length, 'schemas for setupId', setupId);
    return filtered;
  }

  try {
    const res = await http.get<SchemaListResponse>(`/api/v1/Schemas/${encodeURIComponent(setupId)}`, { params });
    const schemas = (res.data?.schemas ?? []) as SchemaDto[];
    log('API response:', schemas.length, 'schemas');
    return schemas;
  } catch (e) {
    log('API error, falling back to mock data:', e);
    const allSchemas = await loadMockData<SchemaDto>('Schemas', 'schemas');
    const filtered = allSchemas.filter((s: SchemaDto) => String(s.setupId) === String(setupId));
    log('Fallback mock data loaded:', filtered.length, 'schemas');
    return filtered;
  }
}

export async function getSchemaByIdV1(schemaId: string, setupId: string): Promise<unknown> {
  log('getSchemaByIdV1', { schemaId, setupId, useMock });
  
  const list = await listSchemasV1(setupId);
  const hit = list.find(s => s.id === schemaId);
  if (!hit || !hit.content) throw new Error(`Schema not found or empty: ${schemaId}`);
  
  const parsed = tryParseContent(hit.content);
  return parsed;
}

export async function uploadSchemaV1(setupId: string, schema: unknown): Promise<components['schemas']['SchemaCreateResponse']> {
  log('uploadSchemaV1', { setupId, useMock });
  
  if (useMock) {
    log('[mock] uploadSchemaV1 - returning stub');
    return {
      schema: {
        id: `mock-schema-${Date.now()}`,
        setupId,
        content: JSON.stringify(schema),
        created: new Date().toISOString(),
        modified: new Date().toISOString(),
      } as SchemaDto,
    };
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const res = await http.post<components['schemas']['SchemaCreateResponse']>(`/api/v1/Schemas/${encodeURIComponent(setupId)}`, schema as any);
  if (res && res.data) return res.data;
  const fd = new FormData();
  const blob = new Blob([JSON.stringify(schema ?? {}, null, 2)], { type: 'application/json' });
  fd.append('file', blob, 'schema.json');
  const res2 = await http.post<components['schemas']['SchemaCreateResponse']>(`/api/v1/Schemas/${encodeURIComponent(setupId)}`, fd, { headers: { 'Content-Type': 'multipart/form-data' } });
  return res2.data;
}
