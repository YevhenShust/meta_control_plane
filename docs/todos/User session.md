# User Session — Authentication Feature

## Goal
Implement user authentication (login/password) in the SPA so only authenticated users can access protected resources. Prepare infrastructure for future authorization (ACL) without implementing full role checks yet.

## User Story
As a GD / ND / LD I want to authenticate in the Meta Service so that I can access the resources and actions permitted to me.

## Acceptance Criteria

### Guarded Access
- Given I am not authenticated, when I try to access any SPA resource, then I am redirected (or shown) the Login screen instead of protected content.

### Successful Login
- Given I have valid email (login) and password, when I submit them on the Login screen, then I become authenticated and gain access to permitted resources.
- Given I was redirected from a specific resource to the Login screen, when I authenticate successfully, then I am returned to that original resource (or its closest resolvable state).

### Failed Login
- Given my credentials are invalid, when I attempt to log in, then I remain on the Login screen and see an error message.

### Login Status Display
- Given I am authenticated, when I view any protected screen, then my login (username/email) is shown in the top-right area with a logout action.

### Logout
- Given I am authenticated, when I click logout, then my session is cleared and the app behaves as if I was never authenticated.

### Login Screen UI Elements
- Login (username/email) field — plain text.
- Password field — masked (***).
- Login button — triggers authentication.

## Definition of Done

### Scope for This Stage
- Access token is treated as permanent (no refresh flow).
- Password is sent raw over HTTPS; no client-side hashing. Server validates using secure hashing (e.g., Argon2/bcrypt).

### Functional
- Authentication flow implemented per `docs/Auth/Authentication and Authorization.md`.
- All subsequent API calls include the `Authorization: Bearer <token>` header when authenticated.
- UI gating: unauthenticated users cannot load protected content.

### Non-Functional
- Minimal, contained changes (no broad refactors).
- Code comments and logging in English.
- Ready to extend with authorization (roles/ACL) later.

## Out of Scope (Future)
- Token refresh / revocation.
- Role-based UI hiding / ACL enforcement.
- User management UI.