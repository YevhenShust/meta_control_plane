import { http } from './http';
import type { components } from '../../types/openapi.d.ts';

export type DraftDto = components['schemas']['DraftDto'];

// List drafts for a setup (v1): GET /api/v1/Draft/{setupId}
export async function listDraftsV1(setupId: string, params?: { skip?: number; limit?: number }): Promise<DraftDto[]> {
  const res = await http.get(`/api/v1/Draft/${encodeURIComponent(setupId)}`, { params });
  return (res.data?.drafts ?? []) as DraftDto[];
}

// Create draft for a setup (v1): POST /api/v1/Draft/{setupId}
export async function createDraftV1(setupId: string, body: { schemaId?: string; content?: string }): Promise<DraftDto> {
  const res = await http.post(`/api/v1/Draft/${encodeURIComponent(setupId)}`, body);
  return res.data?.draft as DraftDto;
}

// Update draft (v1): PUT /api/v1/Draft/{draftId}?content=...
export async function updateDraftV1(draftId: string, content: string): Promise<DraftDto> {
  const res = await http.put(`/api/v1/Draft/${encodeURIComponent(draftId)}`, null, { params: { content } });
  return res.data?.draft as DraftDto;
}
