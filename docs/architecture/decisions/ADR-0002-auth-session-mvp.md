# ADR-0002: Auth Session MVP for SPA

Date: 2025-10-16
Status: Accepted

## Context
We needed a minimal, working user session for the React SPA to gate access and attach Authorization headers to API calls. The backend exposes a token endpoint at `/api/v1/Auth/token`. Prior versions mentioned client-side password hashing, but the agreed protocol is to send the raw password over HTTPS.

Constraints and repo guidelines:
- Transport: Axios with interceptors
- Dev server uses Vite; prefer proxy for `/api` during development
- Production builds must rely on an explicit base URL
- Logging and error messages in English

## Decision
- Implement a versioned auth call `POST /api/v1/Auth/token` via Axios facade and expose a versionless `loginRequest()` helper.
- Store the access token in session module and inject `Authorization: Bearer <token>` via a request interceptor. On 401, clear session in a response interceptor.
- For development:
  - Allow relative `/api` requests through the Vite proxy when `VITE_API_URL` is not set.
  - Add an opt-in, env-guarded dev admin bypass controlled via `VITE_AUTH_DEV_BYPASS` that sets a stable token `dev-admin-token` for `admin` with empty password. Never active in production.
- For production:
  - Require `VITE_API_URL` to be set; the app will throw on startup if missing.

## Consequences
- Dev experience: easy to run against a local backend via Vite proxy; optional bypass for UI flows when backend is unavailable.
- Production safety: explicit configuration required. No accidental relative calls.
- Security posture: credentials sent over HTTPS; added a dev-only console warning when non-HTTPS is detected outside localhost.

## Alternatives considered
- Client-side hashing: rejected (no security benefit, complicates rotation, already removed).
- Always requiring `VITE_API_URL` in dev: rejected to keep proxy-based DX simple.
- Global Redux slices for auth: rejected per repo guidance; session is a minimal module.

## Operational notes
- Env vars:
  - `VITE_API_URL` (prod required): absolute base URL such as `https://example.com/meta`
  - `VITE_AUTH_DEV_BYPASS` (dev only): `1` or `true` enables admin/empty password bypass
  - `VITE_PROXY_TARGET` (dev only, optional): target origin for Vite proxy if not using `VITE_API_URL`
- Quality gates: `yarn lint`, `yarn tsc --noEmit`, `yarn build` must pass.

## Follow-ups
- Backend `/api/v1/Auth/me` endpoint to expose user info/roles; client can add a small hook and cache.
- Remove deprecated utilities fully if still present; ensure `hash.ts` remains unused.
- Consider URL-parameter state (e.g., `setupId`) for shareable deep links.
