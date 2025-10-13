# Incremental Fixes — Backlog (2025-10-13)

Purpose: track concrete, small, verifiable improvements we agreed to implement later. No code changes in this commit.

## 1) RTK Query invalidation tuning
- Summary: make invalidation targeted and conditional; optionally support cache patching.
- Rationale: avoid redundant refetches and reduce re-renders while staying simple.
- Actions:
  - createDraft: invalidate `Drafts[setupId:result.schemaId]` and `MenuItems[setupId:schemaKey]`.
  - updateDraft: invalidate `Drafts[setupId:schemaId]`; invalidate `MenuItems[setupId:schemaKey]` only if `content.Id` changed.
  - (Optional) Replace list invalidations with `api.util.updateQueryData` cache patching for large lists.
- Acceptance:
  - No broad `:all` invalidation in create/update.
  - Menu updates only when Id changed or a draft was created.

## 2) Pass invalidateMenu signal from callers
- Summary: Let callers decide whether to invalidate `MenuItems`.
- Actions:
  - In `EntityEditor` and `NewDraftDrawer`, compute `prevId`/`nextId` (or a boolean `invalidateMenu`) and pass it to `updateDraft`.
  - Extend endpoint arg types to accept `schemaKey` and the flag/Ids.
- Acceptance: Menu invalidation happens only when the Id label actually changes.

## 3) Replace DraftEvents with MenuItems endpoint
- Summary: Move dynamic menu refresh to RTK Query.
- Actions:
  - Add `listMenuItems` query returning draft-based menu labels per `setupId` + `schemaKey`.
  - Provide tags `MenuItems[setupId:schemaKey]`.
  - Remove `DraftEvents` usage in Sidebar; use the query/hook instead.
- Acceptance: No event bus; menu refresh is fully tag-driven.

## 4) Break schema resolver import cycle and unify
- Summary: Avoid circular imports and duplicate resolvers.
- Actions:
  - Move `schemaKey → schemaId` resolver into `shared/api/schema.ts`.
  - Update imports to avoid `core ↔ facade` cycles; remove duplicate versions.
  - Add in-memory cache; plan for `(schemaKey, version?) → schemaId`.
- Acceptance: No circular imports; single source of truth; basic cache in place.

## 5) Cache schemaKey → schemaId per setup
- Summary: Reduce repeated schema listings.
- Actions:
  - Implement a simple `Map<string, string>` cache keyed by `${setupId}:${schemaKey}` inside API layer; optional TTL if needed later.
- Acceptance: Repeated resolutions hit the cache in the same session.

## 6) Limit table normalization depth
- Summary: Support shallow normalized object fields inline; enforce a limit.
- Actions:
  - Introduce `MAX_INLINE_OBJECT_FIELDS` (e.g., 3) in a shared constants module.
  - Apply in table column generation / cell editors.
- Acceptance: Large objects/arrays are edited via drawer/form, not inline.

## 7) Debounce constant
- Summary: Replace literal `700` with `SAVE_DEBOUNCE_MS` where applicable (TableRenderer).
- Acceptance: Single source of truth for debounce values.

## 8) SetupsContext effect deps
- Summary: Fix stale reads by updating effect dependencies or colocating checks with fetch results.
- Acceptance: No extra cold-boot checks; effect is idempotent under StrictMode.

## 9) Optional cache patching (advanced)
- Summary: Demonstrate `api.util.updateQueryData` to patch one draft item in list caches post-mutation.
- Acceptance: Example in code + guarded behind a feature flag or comment; not required for MVP.

## 10) Minimal tests / fast checks
- Summary: Add a tiny test suite to avoid regressions.
- Actions:
  - Menu invalidation on Id change.
  - schemaKey → schemaId cache hit (no repeat list).
  - Content parse smoke (`tryParseContent`).
- Acceptance: Tests pass locally and in CI; minimal maintenance burden.

## 11) Router migration plan (docs only)
- Summary: Document the future transition from `?path=...` to React Router.
- Acceptance: A short plan in docs; no code changes yet.

## 12) Styling consistency audit
- Summary: Prefer components over raw HTML; avoid inline styles except minimal container sizing.
- Actions:
  - Quick pass to spot heavy inline styles; convert to component props/CSS classes where feasible.
- Acceptance: No functional change; style consistency improved gradually.

## 13) Custom AG Grid editors (future)
- Summary: For dependent selects and backend lookups (e.g., searching descriptor ContentId by text across multiple fields), introduce custom AG Grid editors where built-ins are insufficient.
- Data source: Prefer RTK Query-cached endpoints for options; allow on-demand server queries when necessary.
- Constraints: Add custom editors only when justified by UX/data needs; keep default editors elsewhere.
- Acceptance: Example editor wired for one concrete field; no regressions in default table flows.

## Notes
- These tasks should be delivered as small, isolated PRs, each keeping `yarn lint`, `yarn tsc --noEmit`, and `yarn build` green.
- All code comments and logs must be in English.