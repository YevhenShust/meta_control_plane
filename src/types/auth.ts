// Auth-related type definitions based on OpenAPI spec

export interface AuthTokenResponse {
  access_token: string;
  token_type: string;
}

export interface AuthLoginRequest {
  username: string;
  password: string;
}
