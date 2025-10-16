# Meta Control Plane

Schema‑driven editors for game/atlas metadata (Drafts/Schemas/Setups) built with React + TypeScript + Vite.
UI uses Blueprint and JSON Forms; tables use AG Grid.

- Tech: React 18, TypeScript, Vite, JSON Forms (Blueprint renderers), AG Grid, RTK Query, Axios, AJV.
- Docs: see `docs/AGENT_MANIFEST.md` and `docs/architecture/README.md`.

---

## Requirements

- Node 18+ (LTS recommended)
- Yarn Berry 4.x (managed by Corepack; PnP)
- Windows, macOS, or Linux (examples below use PowerShell)

If Yarn is not available, enable Corepack:
```powershell
corepack enable
```

---

## Quickstart

Install dependencies (PnP, deterministic):
```powershell
yarn install --immutable
```

Run the dev server (with backend proxy):
```powershell
# Option A: one-off in PowerShell
$env:VITE_PROXY_TARGET='https://localhost:8143'
yarn dev

# Option B: via .env.development
# Put VITE_PROXY_TARGET=https://localhost:8143 into .env.development, then:
# yarn dev
```

Open:
- http://localhost:5173/

Stop the server with Ctrl+C.

Build for production:
```powershell
# Integration/Prod builds must set VITE_API_URL (can include path prefix)
# Example: https://backend.internal or https://backend.internal/meta
yarn build
```

Lint and type-check:
```powershell
yarn lint
yarn tsc --noEmit
```

---

## Configuration

Vite reads environment variables prefixed with `VITE_`.

Local development (proxy to backend):
```dotenv
# .env.development
VITE_PROXY_TARGET=https://localhost:8143
# Optional: mock mode
VITE_USE_MOCK=0
```

Integration/Production (no proxy, direct calls):
```dotenv
# .env.production
# Absolute backend URL, may include a path prefix (e.g., /meta)
VITE_API_URL=https://backend.internal/meta
VITE_USE_MOCK=0
VITE_AUTH_DEV_BYPASS=0
```

Mock-only smoke (no backend):
```dotenv
# .env.mock (build-time)
VITE_USE_MOCK=1
VITE_AUTH_DEV_BYPASS=1
# Do not set VITE_API_URL
```

Transport defaults:
- Dev: proxy `/api` to `VITE_PROXY_TARGET` if set.
- Prod: `VITE_API_URL` is required; the client automatically prepends its path prefix (if any) to `/api/...`.
- Mock toggle: `VITE_USE_MOCK === '1'`.

---

## Project structure (at a glance)

- `src/components/` — UI (sidebar, drawers, host, header)
  - `NewDraftDrawer.tsx` — create flow drawer
  - `sidebar/menuStructure.tsx` — static menu + dynamic route map
- `src/editor/EntityEditor.tsx` — form/table editor host
- `src/renderers/` — JSON Forms renderers (Blueprint)
- `src/jsonforms/` — schema prep and defaults
- `src/store/api.ts` — RTK Query endpoints (uses Axios facade)
- `src/shared/api/` — HTTP facade and helpers (mock handling, schema/draft/setup)
- `src/core/` — domain-agnostic helpers (paths, parsing, schema tools)
- `data/` — sample JSON used when `VITE_USE_MOCK=1`
- `docs/` — Agent Manifest and Architecture docs

Useful constants:
- `src/shared/constants.ts` — grid sizes, debounce, and `MAX_INLINE_OBJECT_FIELDS`.

---

## How navigation works (short)

- URL query param `?path=...` drives the view.
  - Table: `?path=<BasePath>`
  - Form (existing draft): `?path=<BasePath>/<draftId>`
  - New draft: `?path=<BasePath>/new`
- Dynamic route map binds `BasePath → { kind: 'table' | 'form', schemaKey, uiSchema }`.
  - See `src/components/sidebar/menuStructure.tsx`.
- `EntityHost` selects renderer by `kind` and parameters parsed from `path`.

---

## Contributing

- Read `docs/AGENT_MANIFEST.md` before non-trivial changes.
- Keep changes focused and reviewable.
  - Local/agent mode: very small, visible steps.
  - PR mode: a cohesive task can span multiple small, logical commits (keep branch buildable).
- CI gates: `yarn lint`, `yarn tsc --noEmit`, `yarn build` must pass.

---

## Troubleshooting

- “Command not found: yarn”
  - Run `corepack enable`, then retry.
- PnP editor tooling (optional)
  - If your IDE needs TS SDK wiring: `yarn dlx @yarnpkg/sdks`.
- Backend not reachable
  - Dev: set `VITE_PROXY_TARGET` and restart `yarn dev`.
  - Prod build: set `VITE_API_URL` (can include path prefix, e.g., `/meta`).
  - For self-signed HTTPS in dev, the proxy is already configured with `secure: false`.

---

## Run from Visual Studio (Windows)

Visual Studio 2022 can run yarn scripts:

1. Open the repository folder in Visual Studio (Open Folder).
2. Enable Corepack once (if needed):
   ```powershell
   corepack enable
   ```
3. Configure environment for dev proxy:
   - Add `VITE_PROXY_TARGET=https://localhost:8143` to `.env.development`, or
   - In Debug Profiles, create a profile to run:
     - Command: `yarn`
     - Arguments: `dev`
     - Environment variables: `VITE_PROXY_TARGET=https://localhost:8143`
4. Start debugging with the created profile. Visual Studio will open `http://localhost:5173/`.

Tip: In the Vite terminal output you should see lines like `[proxy] GET /api/... -> https://localhost:8143`.

---

## Docs

- Agent Manifest: `docs/AGENT_MANIFEST.md`
- Architecture: `docs/architecture/README.md`
- ADRs (decisions): `docs/architecture/decisions/`
