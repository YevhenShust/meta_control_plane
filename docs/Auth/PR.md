# Feature: User Session (Authentication MVP)

## Summary
Implements initial user authentication in the Meta Control Plane SPA:
- Login screen + session gating.
- Permanent JWT token retrieval via `/api/v1/Auth/token`.
- Authorization header injection on all subsequent API requests.
- Logout handling and UI integration (username + logout button in header).

## Context & Motivation
Per product requirements, all domain resources must be protected. This lays the groundwork for future ACL enforcement without introducing premature complexity (no refresh/roles yet). The design follows existing architectural guardrails: minimal new global state, axios facade reuse, and isolated additions.

## Scope Included
- New auth module (`src/auth/*`) for session management.
- Header augmentation to show current user + logout.
- Updated docs: `User session.md`, `Authentication and Authorization.md`.

## Not Included (Future Work)
- Token refresh / expiry.
- Role-based access control and UI gating by role.
- Generated OpenAPI runtime client for auth (current: lightweight facade).
- E2E tests.
## Files Modified
- `src/shared/api/http.ts` — interceptors.
- `src/App.tsx` — gating logic.
- `src/components/Header.tsx` — user display + logout.
- `docs/todos/User session.md`, `docs/Auth/Authentication and Authorization.md` — formatting.
 - `src/auth/LoginPage.tsx` — raw-password submission; dev-bypass handling.
 - `src/shared/api/auth.ts`, `src/shared/api/index.ts` — unified login facade (`POST /api/v1/Auth/token`).
 - `vite.config.ts` — proxy notes for `/api` (optional `/meta` rewrite in dev).

## Testing / Validation
1. Successful login with raw password to `/api/v1/Auth/token`.
2. Observe header shows username; network requests carry Authorization.
3. Invalid credentials → inline error.
4. Click Logout → returns to Login.

## Edge Cases
- Invalid credentials → inline error, state not polluted.
- LocalStorage cleared mid-session → interceptor sees no token; next 401 triggers logout.
- Concurrent tabs — token reloads from localStorage lazily.

## Risks & Mitigations
| Risk | Mitigation |
|------|------------|
| Direct raw password concerns | Always use HTTPS; server performs secure hashing (Argon2/bcrypt) |
| Silent auth failures | Explicit error messaging + console error during development |
| Race on early API calls before login | Gating prevents protected UI mount |

## Follow-ups
- Replace login facade with generated OpenAPI client.
- Introduce RTK Query `login` mutation if beneficial.
- Implement ACL and role-based UI gating.
- Add e2e happy-path test (Playwright / Cypress).
- Decide whether to keep `src/auth/hash.ts`; currently unused.

## Checklist
- [x] Builds: `yarn build`
- [x] Type-check: `yarn tsc --noEmit`
- [x] Lint: `yarn lint`
- [x] Docs updated
- [x] Token attached to requests
- [x] Logout clears state

Closes: (add issue link if exists)
