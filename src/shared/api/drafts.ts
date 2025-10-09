import { http } from './http';
import type { components } from '../../types/openapi.d.ts';
import { useMock, loadMockData } from './utils';

export type DraftDto = components['schemas']['DraftDto'];

function log(...args: unknown[]) {
  console.debug('[Drafts API]', ...args);
}

// List drafts for a setup (v1): GET /api/v1/Drafts/{setupId}
export async function listDraftsV1(setupId: string, params?: { skip?: number; limit?: number }): Promise<DraftDto[]> {
  log('listDraftsV1', { setupId, params, useMock });
  
  if (useMock) {
    log('Using mock data (VITE_USE_MOCK=1)');
    const allDrafts = await loadMockData<DraftDto>('Drafts', 'drafts');
    const filtered = allDrafts.filter((d: DraftDto) => String(d.setupId) === String(setupId));
    log('Mock data loaded:', filtered.length, 'drafts for setupId', setupId);
    return filtered;
  }

  try {
    const res = await http.get(`/api/v1/Drafts/${encodeURIComponent(setupId)}`, { params });
    const drafts = (res.data?.drafts ?? []) as DraftDto[];
    log('API response:', drafts.length, 'drafts');
    return drafts;
  } catch (e) {
    log('API error, falling back to mock data:', e);
    const allDrafts = await loadMockData<DraftDto>('Drafts', 'drafts');
    const filtered = allDrafts.filter((d: DraftDto) => String(d.setupId) === String(setupId));
    log('Fallback mock data loaded:', filtered.length, 'drafts');
    return filtered;
  }
}

// Create draft for a setup (v1): POST /api/v1/Drafts/{setupId}
export async function createDraftV1(setupId: string, body: { schemaId?: string; content?: string }): Promise<DraftDto> {
  log('createDraftV1', { setupId, bodyLength: body?.content?.length ?? 0, useMock });
  // log full content for debugging arrays being dropped - trim if very large
  try {
    const preview = String(body?.content ?? '').slice(0, 2000);
    log('createDraftV1 content preview:', preview);
  } catch (e) {
    log('createDraftV1 content preview error', e);
  }
  
  if (useMock) {
    log('[mock] createDraftV1 - returning stub');
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
  log('updateDraftV1', { draftId, contentLength: content.length, useMock });
  // Defensive: do not send requests with invalid draftId (literal 'undefined' or empty)
  if (!draftId || String(draftId) === 'undefined') {
    log('updateDraftV1 aborted: invalid draftId', draftId);
    throw new Error(`Invalid draftId: ${String(draftId)}`);
  }
  try {
    const preview = String(content ?? '').slice(0, 2000);
    log('updateDraftV1 content preview:', preview);
  } catch (e) {
    log('updateDraftV1 preview error', e);
  }
  
  if (useMock) {
    log('[mock] updateDraftV1 - no-op in mock mode');
    return {
      id: draftId,
      setupId: '',
      schemaId: '',
      content,
      modified: new Date().toISOString(),
    } as DraftDto;
  }

  // Note: content is sent as a query param in the v1 API (legacy). Ensure encoding is handled by axios.
  log('updateDraftV1 sending to', `/api/v1/Drafts/${encodeURIComponent(draftId)}`, { params: { contentLength: content.length } });
  const res = await http.put(`/api/v1/Drafts/${encodeURIComponent(draftId)}`, null, { params: { content } });
  return res.data?.draft as DraftDto;
}
