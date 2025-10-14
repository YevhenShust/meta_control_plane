# Feature: User Session (Authentication MVP)

## Summary
Implements initial user authentication in the Meta Control Plane SPA:
- Login screen + session gating.
- Permanent JWT token retrieval via `/meta/auth/token`.
- Authorization header injection on all subsequent API requests.
- Logout handling and UI integration (username + logout button in header).

## Context & Motivation
Per product requirements, all domain resources must be protected. This lays the groundwork for future ACL enforcement without introducing premature complexity (no refresh/roles yet). The design follows existing architectural guardrails: minimal new global state, axios facade reuse, and isolated additions.

## Scope Included
- New auth module (`src/auth/*`) for session management.
- Password hashing placeholder (SHA-256) — easily replaceable.
- Axios request interceptor adding `Authorization: Bearer <token>`.
- 401 response interceptor → automatic logout.
- Login page (Blueprint form) + conditional rendering in `App.tsx`.
- Header augmentation to show current user + logout.
- Updated docs: `User session.md`, `Authentication and Authorization.md`.

## Not Included (Future Work)
- Token refresh / expiry.
- ACL enforcement / role-based rendering.
- User management / registration flows.
- OpenAPI-generated Auth client (placeholder now).

## Implementation Overview
- Session state kept in lightweight in‑memory module + localStorage persistence.
- No RTK Query mutation for login yet (kept decoupled until OpenAPI client arrives).
- Interceptor approach avoids touching every facade call.
- Clean fallback when unauthenticated.

## Files Added
- `src/auth/session.ts` — token + username storage APIs.
- `src/auth/hash.ts` — password hashing helper.
- `src/auth/LoginPage.tsx` — UI & logic.
- `src/auth/AuthContext.tsx` — optional context (if needed) (skeleton).
- `src/types/auth.ts` — auth DTO types.
- `src/shared/api/authApi.ts` — explicit login facade (stub for future OpenAPI).

## Files Modified
- `src/shared/api/http.ts` — interceptors.
- `src/App.tsx` — gating logic.
- `src/components/Header.tsx` — user display + logout.
- `docs/todos/User session.md`, `docs/Auth/Authentication and Authorization.md` — formatting.

## Testing / Validation
Manual Steps:
1. Start app (mock or real backend).
2. Navigate (should see Login when no token).
3. Enter credentials (with mock backend: any user → token stub).
4. Observe header shows username; network requests now carry Authorization.
5. Click Logout → returns to Login.

## Edge Cases
- Invalid credentials → inline error, state not polluted.
- LocalStorage cleared mid-session → interceptor sees no token; next 401 triggers logout.
- Concurrent tabs — token reloads from localStorage lazily.

## Risks & Mitigations
| Risk | Mitigation |
|------|------------|
| Placeholder hash diverges from backend expectation | Encapsulated in `hashPassword` for easy swap |
| Silent auth failures | Explicit error messaging + console error during development |
| Race on early API calls before login | Gating prevents protected UI mount |

## Follow-ups
- Replace login facade with generated OpenAPI client.
- Introduce RTK Query `login` mutation if beneficial.
- Implement ACL and role-based UI gating.
- Add e2e happy-path test (Playwright / Cypress).

## Checklist
- [x] Builds: `yarn build`
- [x] Type-check: `yarn tsc --noEmit`
- [x] Lint: `yarn lint`
- [x] Docs updated
- [x] Token attached to requests
- [x] Logout clears state

Closes: (add issue link if exists)
