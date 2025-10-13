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

Run the dev server:
```powershell
yarn dev
```

Open:
- http://localhost:5173/

Stop the server with Ctrl+C.

Build for production:
```powershell
yarn build
```

Lint and type-check:
```powershell
yarn lint
yarn tsc --noEmit
```

---

## Configuration

Vite reads environment variables prefixed with `VITE_`. Create a `.env.local` in the repo root to override defaults.

```dotenv
# Backend base URL (no trailing slash). Default: http://localhost:8100
VITE_API_URL=http://localhost:8100

# Use local mock data from /data instead of backend: 1 = on, anything else = off. Default: off
VITE_USE_MOCK=1
```

PowerShell one‑off overrides:
```powershell
$env:VITE_USE_MOCK='1'; yarn dev
# or
$env:VITE_API_URL='http://localhost:8100'; yarn dev
```

Transport defaults:
- Axios base URL: `VITE_API_URL` or `http://localhost:8100` if unset (see `src/shared/api/http.ts`).
- Mock toggle: `VITE_USE_MOCK === '1'` (see `src/shared/api/utils.ts`).

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
  - Set `VITE_API_URL` to your backend, or use `VITE_USE_MOCK=1` to run with local `data/`.

---

## Docs

- Agent Manifest: `docs/AGENT_MANIFEST.md`
- Architecture: `docs/architecture/README.md`
- ADRs (decisions): `docs/architecture/decisions/`
