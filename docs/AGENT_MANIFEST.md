# Agent Manifest

## Purpose / Stack
- Admin panel for GameMeta / AtlasMeta / Drafts.
- Frontend: React + TypeScript + Vite.
- Forms: Eclipse JSON Forms with custom Blueprint-based renderers.
- Validation: AJV (draft‑07) + ajv-formats.

## High-level rules
- Keep changes small and focused by default. One issue → one PR.
- Local agent workflow: make minimal, reviewable steps with visible outcomes.
- PR workflow: it’s OK to deliver a larger cohesive change-set for a task, but split it into small, logical commits (don’t stop after “every two lines”). Keep CI green throughout.
- Do not change dependencies or lockfiles unless explicitly approved.
- Avoid inline styles; prefer component APIs and small, local CSS. Keep `src/index.css` minimal.

## Server state & data access
- Use RTK Query for server-side data (queries, mutations, caching, invalidation).
- Transport: Axios via the existing facade. Call the facade from RTK Query endpoints using `queryFn`. Do not introduce ad-hoc fetch layers in components.
- Avoid redundant duplicate requests in a single user flow. Distinct sequential calls are allowed (e.g., resolve schemaKey → schemaId, then fetch drafts).
- Mutations (create/update) return a single draft. You may patch caches via `api.util.updateQueryData` to avoid refetching lists; otherwise prefer targeted invalidation.
- Endpoint guidance (illustrative):
  - Queries: define stable tags (see “Caching & invalidation”).
  - Mutations: return `{data}` from `queryFn`; invalidate tags based on result (schemaId, setupId, schemaKey).

## Caching & invalidation (detailed)
- Tag families (examples; choose stable, composable keys):
  - Drafts: `Drafts[setupId]`, `Drafts[setupId:schemaId]`
  - Schemas: `Schemas[setupId]`
  - Menu items: `MenuItems[setupId:schemaKey]`
- Invalidation rules:
  - createDraft → invalidate `Drafts[setupId:result.schemaId]` and `MenuItems[setupId:schemaKey]`.
  - updateDraft → invalidate `Drafts[setupId:schemaId]`; invalidate `MenuItems[setupId:schemaKey]` only if `content.Id` changed (callers pass `prevId/nextId` or an `invalidateMenu` flag).
- Practical notes:
  - Prefer targeted invalidation over broad list invalidations.
  - Optional cache patching: small local data sets may benefit from `api.util.updateQueryData` to keep menus/tables in sync without refetch.
  - Keep tag IDs stable, e.g., `${setupId}:${schemaId}` for Drafts and `${setupId}:${schemaKey}` for MenuItems.

## Schema handling
- Each backend schema (e.g., `ChestDescriptor`) has a `schemaKey` and is loaded via API.
- Hardcode schema keys only in menu/navigation definitions.
- Prepare for JSON Forms:
  - Remove `$id` / `$schema` from `$defs`.
  - Ensure the root schema uses draft‑07.
  - `$ref` should point to local defs: `#/$defs/...`.
  - Do not mix different JSON Schema drafts in a single document.
- Resolver and cache:
  - Centralize `schemaKey → schemaId` resolution (and future `(schemaKey, version?) → schemaId`) in the API layer (`src/shared/api/schema.ts`) with a small in-memory cache.
  - Key the cache by `setupId|schemaKey|version?`. On a miss, use the facade to list/resolve schemas once, then cache.
  - RTK Query endpoints should call this resolver; components should not import it directly. This avoids circular imports between UI, core tools, and API facades.
  - When schema lists may change, invalidate `Schemas[setupId]` and clear/refresh the resolver cache for that setup.

## UI Schemas
- Location: `src/schemas/ui/<schemaKey>.uischema.json`.
- Format: Eclipse JSON Forms UI schema (`scope: "#/properties/..."`).
- Renderer selection:
  - Today: the choice between form vs table is hardcoded in menu/navigation.
  - Future: consider adding a small tag/hint in the UI schema to let the host select the renderer without menu hardcode.

## Routing & host/editor
- Navigation uses a `?path=...` URL model with dynamic routes synthesized in `menuStructure`.
- `EntityHost` chooses view based on the route: table vs form (per current menu hardcode).
  - Table → `TableRenderer` (AG Grid).
  - Form → `FormRenderer` (JSON Forms).
- Complex fields (arrays/deep objects) are edited in a drawer/form, not inline.

## Renderers
- FormRenderer
  - Controlled wrapper around JSON Forms with Blueprint renderers.
  - AJV instance (strict: false, allErrors: true); add formats/custom formats as needed.
  - Reports `onChange` and `onStatus`; provides save/reset controls.
- TableRenderer
  - AG Grid with built-in editors (checkbox/select/number/text).
  - Inline editing for primitives and shallow normalized objects; arrays/deep objects open a drawer.
  - Debounced optimistic saves; targeted invalidation on success (or cache patching when appropriate).
  - Inline-object limit: enforce a small limit for “normalized” object fields (e.g., 3). Use a shared constant (e.g., `MAX_INLINE_OBJECT_FIELDS`) colocated with other shared constants.
  - Future: some cells may require custom editors (e.g., dependent selects or backend lookups for options). Source data can come from RTK Query-cached endpoints or on-demand server calls; add custom editors only when justified by UX/data needs.

## UI/UX constraints
- Keep Blueprint UI components; do not swap the UI library.
- Forms: JSON Forms with Blueprint renderers.
- Tables: AG Grid built-in editors only by default; avoid heavy custom editors unless justified (see future note above).
- Inline editing:
  - Allow primitives and shallow normalized objects; enforce the max-fields limit.
  - “+ New”: primarily via table toolbar; optional dynamic “/new” leaf for form-first flows.
- Prefer components over raw HTML; avoid inline styles except minimal container sizing.

## Architecture & code health
- No domain event buses for UI/cache refresh. Use RTK Query tags and targeted invalidation.
- Avoid circular imports (especially between API facades and schema resolvers).
- Centralize schema resolution and caching in `src/shared/api/**` (not in UI/core files).
- Keep diffs small and local; avoid broad refactors as part of unrelated tasks.
- Type-safety: avoid `any`; prefer explicit types and `unknown`. Use DTOs from `src/types/openapi.d.ts` where applicable.
- Logging and error messages must be in English.

## Coding conventions
- Structure: one module — one responsibility. Shared domain‑agnostic helpers in `src/core/**`. API‑only concerns in `src/shared/api/**`.
- Naming:
  - Functions: `verbNoun` with explicit domain (`resolveSchemaIdByKey`, `loadSchemaByKey`, `patchDraftsCacheAfterUpdate`).
  - Types: `*Dto` (server), `*Parsed` (client).
  - Avoid generic `utils.ts` — prefer domain‑specific filenames (`schemaTools.ts`, `pathTools.ts`).
- React:
  - Use `useMemo`/`useCallback` where referential stability or expensive computation matters.
  - Effects must be idempotent under StrictMode.

## PR quality
- CI must pass: `yarn lint`, `yarn tsc --noEmit`, `yarn build`.
- Provide a brief plan and affected files in the PR description.
- Commit granularity:
  - Local agent mode: very small steps with visible outcomes.
  - PR mode: group a complete task into multiple small, logical commits (atomic, reviewable), keeping the branch buildable.

## Language policy
- To avoid duplication, follow the canonical policy in `.github/copilot-instructions.md`.
- Summary: chat can be Ukrainian or English; in-code comments/TODOs/JSDoc and log/error messages must be English; prefer English for `docs/**` that are public-facing.

## References
- Instructions: `.github/copilot-instructions.md`
- Architecture: `docs/architecture/README.md` (keep details there; avoid duplicating them here)
