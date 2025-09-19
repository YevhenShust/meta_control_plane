import { http } from './http';

export async function uploadSchemaV1(setupId: string, schema: unknown): Promise<unknown> {
  // POST /api/v1/Schema/{setupId} expecting multipart/form-data in OpenAPI, but server may accept JSON
  // Try JSON first; if server rejects, fallback to multipart form upload
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const res = await http.post(`/api/v1/Schema/${encodeURIComponent(setupId)}`, schema as any);
  if (res && res.data) return res.data;

  const fd = new FormData();
  const blob = new Blob([JSON.stringify(schema, null, 2)], { type: 'application/json' });
  fd.append('file', blob, 'ChestDescriptor.json');
  const res2 = await http.post(`/api/v1/Schema/${encodeURIComponent(setupId)}`, fd, { headers: { 'Content-Type': 'multipart/form-data' } });
  return res2.data;
}
