/* eslint-disable @typescript-eslint/no-explicit-any */
import { http } from './http';
import type { components } from '../../types/openapi.d.ts';
import { useMock, loadMockData } from './utils';

export type SetupDto = NonNullable<components['schemas']['SetupDto']>;
export type SetupCreateRequest = NonNullable<components['schemas']['SetupCreateRequest']>;

// POST /api/v1/Setups
export async function createSetupV1(body: SetupCreateRequest): Promise<SetupDto> {
  if (useMock) {
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
export async function listSetupsV1(params?: { skip?: number; limit?: number }): Promise<SetupDto[]> {
  if (useMock) {
    const setups = await loadMockData<SetupDto>('Setups', 'setups');
    return setups;
  }

  try {
    const res = await http.get<components['schemas']['SetupListResponse']>('/api/v1/Setups', { params });
    const setups = ((res.data as unknown as any)?.setups ?? []) as SetupDto[];
    return setups;
  } catch (e) {
    // Do not fallback to mock data when useMock is false; surface the error instead
    const msg = (e as Error)?.message || String(e);
    throw new Error(`Failed to list setups: ${msg}`);
  }
}

// GET /api/v1/Setups/{setupId}
export async function getSetupByIdV1(setupId: string): Promise<SetupDto | null> {
  if (useMock) {
    const setups = await loadMockData<SetupDto>('Setups', 'setups');
    const setup = setups.find((s: SetupDto) => String(s.id) === String(setupId));
    return setup || null;
  }

  try {
    const res = await http.get<components['schemas']['SetupResponse']>(`/api/v1/Setups/${encodeURIComponent(setupId)}`);
    return ((res.data as unknown as any)?.setup ?? null) as SetupDto | null;
  } catch (e) {
    const msg = (e as Error)?.message || String(e);
    throw new Error(`Failed to get setup by id: ${msg}`);
  }
}
