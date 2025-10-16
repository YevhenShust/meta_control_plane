# Environment configuration

This SPA uses Vite build-time env vars (VITE_*). Values are baked into the bundle on build.

Required for production/integration:
- VITE_API_URL: Absolute URL to the backend origin, optionally with a path prefix.
  - Examples:
    - No prefix: https://backend.internal.example
    - With prefix: https://backend.internal.example/meta
  - The SPA issues calls to `/api/v1/...`. If a prefix is present, requests will be routed to `/<prefix>/api/v1/...` automatically.

Optional:
- VITE_USE_MOCK: "1" enables mock-data mode. Default off.
- VITE_AUTH_DEV_BYPASS: "1" enables dev-only admin bypass in LoginPage (for local demos/tests). Ignored in prod.

Local dev:
- Leave VITE_API_URL empty and use the Vite dev server proxy (`VITE_PROXY_TARGET`) or run backend on the same origin.
- You may set VITE_PROXY_TARGET to proxy `/api` during `yarn dev`.

Notes:
- There is no runtime env injection. Build a separate artifact per environment with the right VITE_* variables.
