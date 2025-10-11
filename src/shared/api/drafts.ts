import { http } from './http';
import type { components } from '../../types/openapi.d.ts';
import { useMock, loadMockData } from './utils';

export type DraftDto = components['schemas']['DraftDto'];

// List drafts for a setup (v1): GET /api/v1/Drafts/{setupId}
export async function listDraftsV1(setupId: string, params?: { skip?: number; limit?: number }): Promise<DraftDto[]> {
  if (useMock) {
    const allDrafts = await loadMockData<DraftDto>('Drafts', 'drafts');
    const filtered = allDrafts.filter((d: DraftDto) => String(d.setupId) === String(setupId));
    return filtered;
  }

  try {
    const res = await http.get(`/api/v1/Drafts/${encodeURIComponent(setupId)}`, { params });
    const drafts = (res.data?.drafts ?? []) as DraftDto[];
    return drafts;
  } catch {
    const allDrafts = await loadMockData<DraftDto>('Drafts', 'drafts');
    const filtered = allDrafts.filter((d: DraftDto) => String(d.setupId) === String(setupId));
    return filtered;
  }
}

// Create draft for a setup (v1): POST /api/v1/Drafts/{setupId}
export async function createDraftV1(setupId: string, body: { schemaId?: string; content?: string }): Promise<DraftDto> {
  if (useMock) {
    return {
      id: `mock-draft-${Date.now()}`,
      setupId,
      schemaId: body.schemaId || '',
      content: body.content || '{}',
      created: new Date().toISOString(),
      modified: new Date().toISOString(),
    } as DraftDto;
  }

  const res = await http.post(`/api/v1/Drafts/${encodeURIComponent(setupId)}`, body);
  return res.data?.draft as DraftDto;
}

// Update draft (v1): PUT /api/v1/Drafts/{draftId}?content=...
export async function updateDraftV1(draftId: string, content: string): Promise<DraftDto> {
  // Defensive: do not send requests with invalid draftId (literal 'undefined' or empty)
  if (!draftId || String(draftId) === 'undefined') {
    throw new Error(`Invalid draftId: ${String(draftId)}`);
  }
  if (useMock) {
    return {
      id: draftId,
      setupId: '',
      schemaId: '',
      content,
      modified: new Date().toISOString(),
    } as DraftDto;
  }

  // Note: content is sent as a query param in the v1 API (legacy). Ensure encoding is handled by axios.
  const res = await http.put(`/api/v1/Drafts/${encodeURIComponent(draftId)}`, null, { params: { content } });
  return res.data?.draft as DraftDto;
}
