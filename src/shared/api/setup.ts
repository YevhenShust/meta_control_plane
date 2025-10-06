/* eslint-disable @typescript-eslint/no-explicit-any */
import { http } from './http';
import type { components } from '../../types/openapi.d.ts';
import { useMock, loadMockData } from './utils';

export type SetupDto = NonNullable<components['schemas']['SetupDto']>;
export type SetupCreateRequest = NonNullable<components['schemas']['SetupCreateRequest']>;

function log(...args: unknown[]) {
  console.debug('[Setups API]', ...args);
}

// POST /api/v1/Setups
export async function createSetup(body: SetupCreateRequest): Promise<SetupDto> {
  log('createSetup', { body, useMock });
  
  if (useMock) {
    log('[mock] createSetup - returning stub');
    return {
      id: `mock-setup-${Date.now()}`,
      name: body.name || 'Mock Setup',
      created: new Date().toISOString(),
    } as SetupDto;
  }

  const res = await http.post<components['schemas']['SetupResponse']>('/api/v1/Setups', body);
  if (!res.data || !(res.data as unknown as any).setup) throw new Error('Empty setup response');
  return (res.data as unknown as any).setup as SetupDto;
}

// GET /api/v1/Setups
export async function listSetups(params?: { skip?: number; limit?: number }): Promise<SetupDto[]> {
  log('listSetups', { params, useMock });
  
  if (useMock) {
    log('Using mock data (VITE_USE_MOCK=1)');
    const setups = await loadMockData<SetupDto>('Setups', 'setups');
    log('Mock data loaded:', setups.length, 'setups');
    return setups;
  }

  try {
    const res = await http.get<components['schemas']['SetupListResponse']>('/api/v1/Setups', { params });
    const setups = ((res.data as unknown as any)?.setups ?? []) as SetupDto[];
    log('API response:', setups.length, 'setups');
    return setups;
  } catch (e) {
    log('API error, falling back to mock data:', e);
    const setups = await loadMockData<SetupDto>('Setups', 'setups');
    log('Fallback mock data loaded:', setups.length, 'setups');
    return setups;
  }
}

// GET /api/v1/Setups/{setupId}
export async function getSetupById(setupId: string): Promise<SetupDto | null> {
  log('getSetupById', { setupId, useMock });
  
  if (useMock) {
    log('Using mock data (VITE_USE_MOCK=1)');
    const setups = await loadMockData<SetupDto>('Setups', 'setups');
    const setup = setups.find((s: SetupDto) => String(s.id) === String(setupId));
    log('Mock setup found:', !!setup);
    return setup || null;
  }

  try {
    const res = await http.get<components['schemas']['SetupResponse']>(`/api/v1/Setups/${encodeURIComponent(setupId)}`);
    return ((res.data as unknown as any)?.setup ?? null) as SetupDto | null;
  } catch (e) {
    log('API error, falling back to mock data:', e);
    const setups = await loadMockData<SetupDto>('Setups', 'setups');
    const setup = setups.find((s: SetupDto) => String(s.id) === String(setupId));
    log('Fallback mock setup found:', !!setup);
    return setup || null;
  }
}
