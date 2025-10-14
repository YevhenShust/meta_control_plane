# RTK Query enhancements and migration notes

Date: 2025-10-14

## RTK Query enhancements (notes)

- Optimistic updates via onQueryStarted:
  - For updateDraft/createDraft: replace local timers/maps in TableRenderer with cache patching using `api.util.updateQueryData`, plus precise rollback on error. Keeps behavior the same and removes debounce-saving complexity from the component.
  - Keep targeted tags; avoid broad invalidation.

- selectFromResult and memoized selects:
  - Where components consume a small slice of RTKQ data, use `selectFromResult` to minimize re-renders.

- Prefetch:
  - Light prefetch of related data (e.g., menu items or related schemas) on navigation using `api.util.prefetch`.

- Code-splitting endpoints:
  - If endpoints grow, split by feature using `injectEndpoints` to avoid pulling the full API bundle upfront.

- Retry/centralized error handling:
  - With our custom `queryFn` over Axios, add a lightweight retry/backoff for safe GETs (or implement in the Axios facade).
  - Normalize error shapes centrally so UI code doesn’t branch on transport-specific errors.

## Implementation prompt — Setups fetching via RTK Query

Title: Migrate SetupsContext fetching to RTK Query (or remove the context entirely)

Objective:
Unify setup data fetching under RTK Query and eliminate direct shared/api calls from React context/components. Either:
- Move list/create/get of setups into RTK Query endpoints in `src/store/api.ts` and migrate SetupsContext to use RTKQ hooks for data, keeping only minimal UI state (current setupId), or
- Remove SetupsContext and read/update setupId via the existing URL-based hook, while components use RTKQ hooks directly for setup data.

Constraints and guardrails:
- Use the existing Axios facade under `src/shared/api/**` via custom `queryFn` in `api.ts`. No ad-hoc fetch layers.
- Avoid circular imports; API layer must not import from components.
- Use stable RTKQ tags (introduce `Setups` and optionally `Setups[id]`). Prefer targeted invalidation.
- Keep Blueprint and AG Grid as-is; do not change UI libraries.
- Type-safety: no `any`; use explicit types and prefer DTO types from `src/types/openapi.d.ts` or `shared/api` exports where applicable.
- Quality gates must pass: `yarn lint`, `yarn tsc --noEmit`, `yarn build`.

Tasks:
1) Add endpoints in `src/store/api.ts`:
   - `listSetups()`: `queryFn` using the Axios facade; `providesTags`: `['Setups']`.
   - `getSetupById(setupId)`: `queryFn`; `providesTags`: `[{ type: 'Setups', id: setupId }]`.
   - `createSetup(payload)`: mutation; `invalidatesTags`: `['Setups']` plus the specific id if available.
2) Replace SetupsContext fetching:
   - Remove direct imports of `listSetups`/`createSetup`/`getSetupById` from `shared/api` in `src/setup/SetupsContext.tsx` (and related hooks/components).
   - Either:
     a) Keep a minimal context only for UI state (current setupId and a setter) with the URL hook as source of truth; components call RTKQ hooks for data, or
     b) Remove the context and rely on a small `useCurrentSetupId` URL-based hook (existing or new) and RTKQ hooks in components.
3) Update consumers:
   - `src/setup/SetupSelect.tsx` and any other usage: switch to `useListSetupsQuery`/`useGetSetupByIdQuery`/`useCreateSetupMutation` from `store/api`.
4) Tagging and invalidation:
   - Ensure `createSetup` invalidates `['Setups']` and/or `['Setups', id]` as needed so lists reflect changes without broad cache busting.
5) Clean up:
   - Delete unused `shared/api` imports from React files.
   - Verify no circular imports are introduced.
6) Quality gates:
   - Confirm `yarn lint`, `yarn tsc --noEmit`, and `yarn build` all pass.

Acceptance criteria:
- No direct imports of `shared/api` in setup-related React code; all fetching/mutations go through RTK Query in `src/store/api.ts`.
- Setups list and details load as before; creating a setup updates the list via targeted invalidation.
- Minimal or no SetupsContext remains; if present, it only manages UI-level state (current setupId), not data fetching.
- No circular imports introduced.
- `yarn lint`, `yarn tsc --noEmit`, `yarn build` pass.

Optional nice-to-haves (non-blocking):
- Use `selectFromResult` in components that consume a subset of setups data to reduce re-renders.
- Add `api.util.prefetch` for setups when navigating into setup-dependent routes.
