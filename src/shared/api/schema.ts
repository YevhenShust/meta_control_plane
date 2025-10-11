import { http } from './http';
import type { components } from '../../types/openapi.d.ts';
import { useMock, loadMockData } from './utils';
import { tryParseContent } from '../../core/parse';

export type SchemaDto = NonNullable<components['schemas']['SchemaDto']>;
export type SchemaListResponse = NonNullable<components['schemas']['SchemaListResponse']>;

// minimal logging only on errors via exceptions

export async function listSchemasV1(setupId: string, params?: { skip?: number; limit?: number }): Promise<SchemaDto[]> {
  if (useMock) {
    const allSchemas = await loadMockData<SchemaDto>('Schemas', 'schemas');
    const filtered = allSchemas.filter((s: SchemaDto) => String(s.setupId) === String(setupId));
    return filtered;
  }

  try {
    const res = await http.get<SchemaListResponse>(`/api/v1/Schemas/${encodeURIComponent(setupId)}`, { params });
    const schemas = (res.data?.schemas ?? []) as SchemaDto[];
    return schemas;
  } catch {
    const allSchemas = await loadMockData<SchemaDto>('Schemas', 'schemas');
    const filtered = allSchemas.filter((s: SchemaDto) => String(s.setupId) === String(setupId));
    return filtered;
  }
}

export async function getSchemaByIdV1(schemaId: string, setupId: string): Promise<unknown> {
  const list = await listSchemasV1(setupId);
  const hit = list.find(s => s.id === schemaId);
  if (!hit || !hit.content) throw new Error(`Schema not found or empty: ${schemaId}`);
  
  const parsed = tryParseContent(hit.content);
  return parsed;
}

export async function uploadSchemaV1(setupId: string, schema: unknown): Promise<components['schemas']['SchemaCreateResponse']> {
  if (useMock) {
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
