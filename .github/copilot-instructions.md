# Meta Control Plane — repo instructions

Note: detailed architecture and context live in `docs/architecture/README.md` (skeleton), `docs/architecture/notes.md` (ongoing notes) and ADRs in `docs/architecture/decisions/`. For general principles see also `docs/AGENT_MANIFEST.md`.

## Language policy
- Chat prompts and discussions: Ukrainian, English
- In-code comments, TODOs, JSDoc, and inline notes: English only.
- Logging messages and error texts in code: English.
- Documentation under `docs/**`: prefer English for public-facing docs when appropriate.

## Goals

Outcome-oriented guardrails for the assistant. Keep changes small, explicit, and verifiable.

- Server state and data access
  - Use RTK Query for server-side state, with the existing Axios facade as transport (current architecture). Do not introduce new ad‑hoc fetch layers.
  - Prefer invoking the facade from RTK Query endpoints (custom `queryFn`) until OpenAPI-generated runtime clients are adopted.
  - No domain event buses for UI/cache refresh. Prefer RTK Query tags and targeted invalidation.
  - Avoid redundant duplicate requests within a single user flow. Distinct sequential requests (e.g., resolve schema → then fetch drafts) are allowed.
  - Mutations (create/update) return a single draft. You may patch caches (via `api.util.updateQueryData`) to avoid refetching lists when network savings are desired; otherwise use targeted invalidation.

- UI/UX constraints
  - Keep Blueprint UI components as-is; do not replace the UI library.
  - Forms: JSON Forms with Blueprint renderers. Tables: AG Grid built-in editors.
  - Table inline editing: allow primitive fields and shallow normalized object fields (e.g., coordinates), limited by `MAX_INLINE_OBJECT_FIELDS` (e.g., 3). Arrays/deep objects must be edited in a drawer/form.
  - Prefer components over raw HTML; inline styles are discouraged. Minimal container sizing (e.g., AG Grid height/width) is acceptable.
  - Do not introduce new global Redux slices unless strictly necessary; prefer RTK Query endpoints and small local helpers/contexts.

- Caching and invalidation (illustrative, not prescriptive)
  - Define stable RTK Query tags; examples:
    - `Drafts[setupId]`, `Drafts[setupId:schemaId]`
    - `Schemas[setupId]`
    - `MenuItems[setupId:schemaKey]`
  - Invalidation examples:
    - `createDraft` → invalidate `Drafts[setupId:result.schemaId]` and `MenuItems[setupId:schemaKey]`.
    - `updateDraft` → invalidate `Drafts[setupId:schemaId]`; invalidate `MenuItems[setupId:schemaKey]` only if `content.Id` changed (callers should pass prev/next Id or an `invalidateMenu` flag).
  - Prefer targeted invalidation over broad “all” lists. Consider cache patching to avoid refetches when appropriate.
  - Cache schemaKey → schemaId resolution per setup in the API layer (plan for `(schemaKey, version?) → schemaId`). Avoid circular imports.

- Architecture and code health
  - Avoid circular imports (especially between API facades and schema resolvers).
  - Keep diffs small and local; no broad refactors as part of unrelated tasks.
  - Type-safety: avoid `any`; prefer explicit types and `unknown`. Prefer server DTO types from `src/types/openapi.d.ts` where applicable.
  - Logging and error messages in code must be in English.

- Quality gates and deliverables
  - All changes must pass: `yarn lint`, `yarn tsc --noEmit`, and `yarn build`.
  - For non-trivial changes, add/adjust minimal tests or fast checks where applicable.
  - Documentation and in-code comments are in English; user-facing chat can be in Ukrainian.

- Libraries and ecosystem
  - Transport: Axios (facade) for now; revisit when OpenAPI runtime clients are available.
  - Forms: JSON Forms with Blueprint renderers only.
  - Tables: AG Grid built-in editors; avoid heavy custom editors without justification.
  - Routing: the app uses URL `?path=...`. React Router is planned later; do not introduce routing until a migration plan is approved.

- Non-goals
  - No event-based “domain” signaling for UI refresh.
  - No dependency changes or new global state containers unless explicitly justified and scoped.
  - No broad style rewrites; keep `index.css` minimal and prefer component APIs.

 

## Code style & constraints
- Endpoints: listDrafts / createDraft / updateDraft / listSchemas / getSchemaByKey / listMenuItems.
- For caching/invalidation rules and tag conventions, see the Goals section above.

## Build & run
- Node 18+; Yarn Berry 4.x (PnP). `yarn install --immutable`, `yarn dev`.
  - Why `--immutable`: enforces deterministic installs by refusing to modify the lockfile (`yarn.lock`) or install missing deps. This keeps CI builds reproducible; if dependencies need to change, update the manifest/lockfile explicitly (e.g., `yarn up` or edit `package.json` then run install).
- Vite + React; ESLint config in `eslint.config.js`.

## Testing the agent’s PRs
- Require green `tsc --noEmit`, `yarn lint`, `yarn build`.
