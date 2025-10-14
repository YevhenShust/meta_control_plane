# Authentication and Authorization (Draft Overview)

## Overview
The Meta Service separates authentication and authorization via a dedicated Auth Engine. This PR phase focuses only on authentication (obtaining and attaching a JWT access token).

## Authentication Flow
1. Client submits credentials (username + password hash) to the auth endpoint.
2. Service issues a permanent, non-revocable access token (JWT).
3. Client includes the token with every subsequent request (Authorization header).
4. No refresh token or expiry handling at this stage.

## Constraints
- Token is permanent (no refresh cycle).
- Password is never sent in plain text: a one-way hash is generated client-side (placeholder algorithm until finalized).
- User provisioning (creation of credentials and stored hashes) occurs outside of public API (static configuration file read at service startup).

## JWT Payload Fields
- `iss` — issuer (Meta Service identity).
- `sub` — subject (user id).
- `iat` — issued at timestamp.
- `jti` — unique token identifier.

## Endpoint (Draft Spec)
See OpenAPI file: `meta.auth.v0.0.1.yml`

```
POST /meta/auth/token
Request: { "username": "...", "password": "<hashed>" }
Success 200: { "access_token": "<jwt>", "token_type": "Bearer" }
Failure 401: Invalid credentials
```

## Client Responsibilities
- Hash password locally (replace placeholder with final algorithm later).
- Store token securely (memory + localStorage for persistence).
- Attach `Authorization: Bearer <token>` to all API requests.
- Handle `401` by clearing session and returning to Login.

## Future (Authorization)
- Role / permission model (ACL).
- Enforced action-level restrictions.
- Token revocation / rotation.

## OpenAPI Reference
See: `docs/Auth/meta.auth.v0.0.1.yml`

