// Auth API facade - handles login requests to the auth endpoint

import { http } from './http';
import type { AuthTokenResponse, AuthLoginRequest } from '../../types/auth';

/**
 * Login request to obtain JWT token
 * @param username - User's username/email
 * @param hashedPassword - Pre-hashed password
 * @returns Token response with access_token and token_type
 */
export async function loginRequest(
  username: string,
  hashedPassword: string
): Promise<AuthTokenResponse> {
  const payload: AuthLoginRequest = {
    username,
    password: hashedPassword,
  };
  
  const response = await http.post<AuthTokenResponse>('/meta/auth/token', payload);
  return response.data;
}
