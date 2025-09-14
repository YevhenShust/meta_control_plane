/* eslint-disable @typescript-eslint/no-explicit-any */
import { http } from './http';
import type { components } from '../../types/openapi.d.ts';

export type SetupDto = NonNullable<components['schemas']['SetupDto']>;
export type SetupCreateRequest = NonNullable<components['schemas']['SetupCreateRequest']>;

// POST /api/v1/Setup
export async function createSetup(body: SetupCreateRequest): Promise<SetupDto> {
  const res = await http.post<components['schemas']['SetupResponse']>('/api/v1/Setup', body);
  if (!res.data || !(res.data as unknown as any).setup) throw new Error('Empty setup response');
  return (res.data as unknown as any).setup as SetupDto;
}

// GET /api/v1/Setup
export async function listSetups(params?: { skip?: number; limit?: number }): Promise<SetupDto[]> {
  const res = await http.get<components['schemas']['SetupListResponse']>('/api/v1/Setup', { params });
  return ((res.data as unknown as any)?.setups ?? []) as SetupDto[];
}

// GET /api/v1/Setup/{setupId}
export async function getSetupById(setupId: string): Promise<SetupDto | null> {
  const res = await http.get<components['schemas']['SetupResponse']>(`/api/v1/Setup/${encodeURIComponent(setupId)}`);
  return ((res.data as unknown as any)?.setup ?? null) as SetupDto | null;
}
