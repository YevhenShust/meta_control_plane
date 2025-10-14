import { http } from './http';
import type { AuthTokenResponse } from '../../types/auth';

/**
 * V1: Issue auth token
 * POST /api/v1/Auth/token
 */
export async function postAuthTokenV1(body: { username: string; password: string }): Promise<AuthTokenResponse> {
  const res = await http.post<AuthTokenResponse>('/api/v1/Auth/token', body);
  return res.data;
}
