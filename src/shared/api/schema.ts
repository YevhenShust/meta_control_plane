import { http } from './http';
import type { components } from '../../types/openapi.d.ts';

export type SchemaDto = NonNullable<components['schemas']['SchemaDto']>;
export type SchemaListResponse = NonNullable<components['schemas']['SchemaListResponse']>;

// Check if we should use mock data
const useMock = import.meta.env.VITE_USE_MOCK === '1';

function log(...args: unknown[]) {
  console.debug('[Schemas API]', ...args);
}

export async function listSchemasV1(setupId: string, params?: { skip?: number; limit?: number }): Promise<SchemaDto[]> {
  log('listSchemasV1', { setupId, params, useMock });
  
  if (useMock) {
    log('Using mock data (VITE_USE_MOCK=1)');
    try {
      const mockData = await import('../../../data/Schemas.data.json');
      const filtered = (mockData.schemas || []).filter((s: SchemaDto) => String(s.setupId) === String(setupId));
      log('Mock data loaded:', filtered.length, 'schemas for setupId', setupId);
      return filtered as SchemaDto[];
    } catch (e) {
      log('Error loading mock data:', e);
      return [];
    }
  }

  try {
    const res = await http.get<SchemaListResponse>(`/api/v1/Schemas/${encodeURIComponent(setupId)}`, { params });
    const schemas = (res.data?.schemas ?? []) as SchemaDto[];
    log('API response:', schemas.length, 'schemas');
    return schemas;
  } catch (e) {
    log('API error, falling back to mock data:', e);
    // Fallback to local data when dev server cannot reach backend
    try {
      const mockData = await import('../../../data/Schemas.data.json');
      const filtered = (mockData.schemas || []).filter((s: SchemaDto) => String(s.setupId) === String(setupId));
      log('Fallback mock data loaded:', filtered.length, 'schemas');
      return filtered as SchemaDto[];
    } catch (fallbackError) {
      log('Fallback also failed:', fallbackError);
      return [];
    }
  }
}

// returns parsed JSON schema object; caches in-memory by schemaId
const _schemaCache = new Map<string, unknown>();
export async function getSchemaByIdV1(schemaId: string, setupId: string): Promise<unknown> {
  log('getSchemaByIdV1', { schemaId, setupId, useMock });
  
  const cached = _schemaCache.get(schemaId);
  if (cached) {
    log('Returning cached schema');
    return cached;
  }
  
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
  log('Schema cached and returned');
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
