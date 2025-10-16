// Auth API facade - handles login requests to the auth endpoint

import { http } from './http';
import type { AuthTokenResponse, AuthLoginRequest } from '../../types/auth';

/**
 * Login request to obtain JWT token
 * @param username - User's username/email
 * @param password - Raw password (sent over HTTPS)
 * @returns Token response with access_token and token_type
 */
export async function loginRequest(
  username: string,
  password: string
): Promise<AuthTokenResponse> {
  const payload: AuthLoginRequest = {
    username,
    password,
  };
  
  const response = await http.post<AuthTokenResponse>('/meta/api/v1/Auth/login', payload);
  return response.data;
}
